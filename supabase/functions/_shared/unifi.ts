// ===========================================================================
// _shared/unifi.ts — client UniFi Network API (Cloud Connector + local)
// ===========================================================================
// SÉCURITÉ :
//  - La clé API et le mot de passe legacy sont DÉCHIFFRÉS au moment de
//    l'appel (AES-256-GCM, ENCRYPTION_KEY) — jamais stockés en clair.
//  - Aucun secret n'est loggé, aucun header d'auth n'est recopié.
//  - Résolution du clientId : la console redirige le guest avec son MAC ;
//    on ne fait JAMAIS confiance à un identifiant envoyé par le navigateur.
//
// Deux modes, comme pour les paiements (Wave/Bictorys) — l'ancien mode local
// est conservé pour ne casser aucun site en production.
// ===========================================================================

import { decryptSecret } from "./crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const CLOUD_CONNECTOR_BASE = "https://api.ui.com/v1/connector/consoles";

export type UniFiResult = {
  success: boolean;
  message: string;
  data?: unknown;
};

export interface UniFiIntegration {
  id: string;
  connection_mode: "cloud_connector" | "local" | null;
  controller_url: string | null;
  unifi_site_id: string | null;
  api_username: string | null;
  api_password_enc: string | null;
  console_id: string | null;
  api_key_enc: string | null;
}

// ---------------------------------------------------------------------------
// Base d'URL selon le mode.
// Cloud : https://api.ui.com/v1/connector/consoles/{consoleId}/proxy/network/integration
// Local : https://{consoleIP}/proxy/network/integration
// ---------------------------------------------------------------------------
export function buildBase(integ: UniFiIntegration): string {
  if (integ.connection_mode === "cloud_connector") {
    if (!integ.console_id) {
      throw new Error("Mode cloud_connector : console_id manquant");
    }
    return CLOUD_CONNECTOR_BASE + "/" + integ.console_id + "/proxy/network/integration";
  }
  if (!integ.controller_url) {
    throw new Error("Mode local : controller_url manquant");
  }
  return integ.controller_url.replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Headers Cloud Connector : un seul header X-API-Key, pas de session.
// ---------------------------------------------------------------------------
export function cloudHeaders(apiKey: string): HeadersInit {
  return {
    "X-API-Key": apiKey,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Déchiffre les credentials selon le mode.
// Cloud : la clé API. Local : le mot de passe admin.
// ---------------------------------------------------------------------------
async function resolveCredentials(integ: UniFiIntegration): Promise<{
  apiKey: string | null;
  password: string | null;
}> {
  if (integ.connection_mode === "cloud_connector") {
    if (!integ.api_key_enc) {
      throw new Error("Clé API UI absente (non configurée)");
    }
    return { apiKey: await decryptSecret(integ.api_key_enc), password: null };
  }
  if (!integ.api_password_enc || !integ.api_username) {
    throw new Error("Identifiants local manquants");
  }
  return { apiKey: null, password: await decryptSecret(integ.api_password_enc) };
}

// ---------------------------------------------------------------------------
// Nouveaux : déchiffrement du secret UniFi stocké en base via pgcrypto
// ---------------------------------------------------------------------------
/**
 * Déchiffre le secret UniFi stocké en base de données (colonne secret_encrypted)
 * en utilisant la fonction SQL `decrypt_unifi_secret`.
 * @param encrypted - Le secret chiffré sous forme de Uint8Array (bytea)
 * @returns Le secret déchiffré
 */
export async function decryptUnifiSecret(encrypted: Uint8Array): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const hex = Buffer.from(encrypted).toString("hex");
  const { data, error } = await supabase.rpc(
    "decrypt_unifi_secret",
    { encrypted: `\\\\x${hex}` }
  );
  if (error) throw error;
  return data as string;
}

// ---------------------------------------------------------------------------
// Session locale (legacy) : login username/password -> cookie + CSRF.
// ---------------------------------------------------------------------------
async function localSession(
  base: string,
  username: string,
  password: string,
  signal?: AbortSignal
): Promise<{ cookies: string; csrf: string } | null> {
  const loginRes = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    signal,
  });
  if (!loginRes.ok) return null;
  return {
    cookies: loginRes.headers.get("set-cookie") || "",
    csrf: loginRes.headers.get("x-csrf-token") || "",
  };
}

// ---------------------------------------------------------------------------
// Corps d'une action guest (authorize / unauthorize).
// ---------------------------------------------------------------------------
function guestActionBody(action: string, durationMin?: number): string {
  const payload: Record<string, unknown> = { action };
  if (durationMin !== undefined && durationMin > 0) {
    payload.timeLimitMinutes = durationMin;
  }
  return JSON.stringify(payload);
}

// ---------------------------------------------------------------------------
// Extrait les lignes d'une réponse UniFi (rows ou data, selon le mode).
// ---------------------------------------------------------------------------
function extractRows(body: unknown): unknown[] {
  const b = body as Record<string, unknown> | null;
  if (b && Array.isArray(b.rows)) return b.rows as unknown[];
  if (b && Array.isArray(b.data)) return b.data as unknown[];
  return [];
}

// ---------------------------------------------------------------------------
// Résout le clientId UniFi à partir du MAC du guest.
// Le clientId est un identifiant INTERNE : toujours dérivé du MAC, jamais
// reçu du navigateur.
// GET /v1/sites/{siteId}/clients?filter=macAddress.eq('AA:BB:...')
// ---------------------------------------------------------------------------
export async function resolveClientId(
  integ: UniFiIntegration,
  mac: string,
  signal?: AbortSignal
): Promise<UniFiResult> {
  const base = buildBase(integ);
  const site = integ.unifi_site_id || "default";
  const normalized = mac.toUpperCase();
  const filter = "macAddress.eq('" + normalized + "')";
  const url = base + "/v1/sites/" + site + "/clients?filter=" + encodeURIComponent(filter);

  let res: Response;
  if (integ.connection_mode === "cloud_connector") {
    const { apiKey } = await resolveCredentials(integ);
    res = await fetch(url, { headers: cloudHeaders(apiKey as string), signal });
  } else {
    const { password } = await resolveCredentials(integ);
    const session = await localSession(
      base,
      integ.api_username as string,
      password as string,
      signal
    );
    if (!session) {
      return { success: false, message: "Échec login local UniFi" };
    }
    res = await fetch(url, {
      headers: { Cookie: session.cookies, "X-Csrf-Token": session.csrf },
      signal,
    });
  }

  if (!res.ok) {
    return { success: false, message: "UniFi GET clients: HTTP " + res.status };
  }
  const rows = extractRows(await res.json());
  if (rows.length === 0) {
    return {
      success: false,
      message: "Aucun client UniFi pour le MAC " + mac + " — le guest doit être connecté au WiFi",
    };
  }
  const row = rows[0] as Record<string, unknown>;
  const clientId = (row.id ?? row.clientId ?? row.macAddress) as string | undefined;
  if (!clientId) {
    return { success: false, message: "Client UniFi trouvé sans clientId" };
  }
  return {
    success: true,
    message: "Client résolu",
    data: { clientId, macAddress: row.macAddress },
  };
}

// ---------------------------------------------------------------------------
// Autorise un guest.
// Cloud : POST .../clients/{clientId}/actions
//   { "action": "AUTHORIZE_GUEST_ACCESS", "timeLimitMinutes": N }
// La durée vient du forfait (duration_min), jamais du navigateur.
// Local (legacy) : cmd/stamgr { cmd: "authorize-sta", mac, minutes }
// ---------------------------------------------------------------------------
export async function authorizeGuest(
  integ: UniFiIntegration,
  clientId: string,
  durationMin: number,
  signal?: AbortSignal
): Promise<UniFiResult> {
  const base = buildBase(integ);
  const site = integ.unifi_site_id || "default";

  if (integ.connection_mode === "cloud_connector") {
    const { apiKey } = await resolveCredentials(integ);
    const res = await fetch(
      base + "/v1/sites/" + site + "/clients/" + clientId + "/actions",
      {
        method: "POST",
        headers: cloudHeaders(apiKey as string),
        body: guestActionBody("AUTHORIZE_GUEST_ACCESS", durationMin),
        signal,
      }
    );
    return parseAction(res, "AUTHORIZE_GUEST_ACCESS");
  }

  const { password } = await resolveCredentials(integ);
  const session = await localSession(
    base,
    integ.api_username as string,
    password as string,
    signal
  );
  if (!session) {
    return { success: false, message: "Échec login local UniFi" };
  }
  const res = await fetch(base + "/proxy/network/api/s/" + site + "/cmd/stamgr", {
    method: "POST",
    headers: {
      Cookie: session.cookies,
      "X-Csrf-Token": session.csrf,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cmd: "authorize-sta",
      mac: clientId.toLowerCase(),
      minutes: durationMin,
    }),
    signal,
  });
  return parseAction(res, "authorize-sta");
}

// ---------------------------------------------------------------------------
// Révoque un guest (déconnexion immédiate).
// ---------------------------------------------------------------------------
export async function unauthorizeGuest(
  integ: UniFiIntegration,
  clientId: string,
  signal?: AbortSignal
): Promise<UniFiResult> {
  const base = buildBase(integ);
  const site = integ.unifi_site_id || "default";

  if (integ.connection_mode === "cloud_connector") {
    const { apiKey } = await resolveCredentials(integ);
    const res = await fetch(
      base + "/v1/sites/" + site + "/clients/" + clientId + "/actions",
      {
        method: "POST",
        headers: cloudHeaders(apiKey as string),
        body: guestActionBody("UNAUTHORIZE_GUEST_ACCESS"),
        signal,
      }
    );
    return parseAction(res, "UNAUTHORIZE_GUEST_ACCESS");
  }

  const { password } = await resolveCredentials(integ);
  const session = await localSession(
    base,
    integ.api_username as string,
    password as string,
    signal
  );
  if (!session) {
    return { success: false, message: "Échec login UniFi" };
  }
  const res = await fetch(base + "/proxy/network/api/s/" + site + "/cmd/stamgr", {
    method: "POST",
    headers: {
      Cookie: session.cookies,
      "X-Csrf-Token": session.csrf,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cmd: "unauthorize-sta",
      mac: clientId.toLowerCase(),
    }),
    signal,
  });
  return parseAction(res, "unauthorize-sta");
}

// ---------------------------------------------------------------------------
// QoS — mapping normatif (docs/hardware/unifi-integration-rules.md)
// qos_rate_max_up/down en Mbps, plage 2 → 100 000, -1 = illimité.
// ⚠️ 1 Mbps est REJETÉ par le pattern API (-1|[2-9]|[1-9][0-9]{1,4}|100000)
// → tout <= 1 est mappé vers 2 ; null → -1 (illimité).
// ---------------------------------------------------------------------------
export function mapQosRate(mbps: number | null | undefined): number {
  if (mbps === null || mbps === undefined) return -1;
  if (mbps <= 1) return 2;
  if (mbps > 100000) return 100000;
  return Math.round(mbps);
}

// ---------------------------------------------------------------------------
// Explication des erreurs UniFi selon le tableau des pièges réels.
// ---------------------------------------------------------------------------
export function explainUniFiError(op: string, status: number, detail = ""): string {
  let hint = "";
  if (status === 401) hint = " (401: token console sur /proxy/network — utiliser X-API-Key ou session+csrf)";
  else if (status === 400 && /qos/i.test(detail)) hint = " (400 InvalidPayload qos: 1 Mbps rejeté — min 2 ou -1)";
  else if (status === 400 && /NotNull\.schedule/i.test(detail)) hint = " (400: schedule obligatoire sur POST firewall)";
  else if (status === 404) hint = " (404: vérifier le pluriel des endpoints v2, ex. firewall-policies)";
  else if (status === 405) hint = " (405: route en POST uniquement — cmd jamais en GET)";
  return op + " HTTP " + status + hint + (detail ? " — " + detail : "");
}

// ---------------------------------------------------------------------------
// Requête locale : X-API-Key prioritaire (règle 1), sinon session legacy
// cookie + CSRF (règle 2). Ne JAMAIS utiliser le token console /api/access
// sur /proxy/network (401 vérifié).
// ---------------------------------------------------------------------------
async function localAuthHeaders(
  integ: UniFiIntegration,
  signal?: AbortSignal
): Promise<HeadersInit> {
  if (integ.api_key_enc) {
    const key = await decryptSecret(integ.api_key_enc);
    return {
      "X-API-Key": key,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };
  }
  const { password } = await resolveCredentials(integ);
  const base = (integ.controller_url || "").replace(/\/$/, "");
  const session = await localSession(base, integ.api_username as string, password as string, signal);
  if (!session) throw new Error("Échec login local UniFi");
  return {
    Cookie: session.cookies,
    "X-Csrf-Token": session.csrf,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Requête unifiée sur les endpoints rest/* et cmd/* de l'API Network :
//  - cloud_connector : api.ui.com/.../consoles/{consoleId}/proxy/network/...
//  - local : {controller_url}/proxy/network/...
// ---------------------------------------------------------------------------
async function unifiRequest(
  integ: UniFiIntegration,
  proxyPath: string, // commence par /proxy/network/
  init: RequestInit,
  signal?: AbortSignal
): Promise<Response> {
  if (integ.connection_mode === "cloud_connector") {
    if (!integ.console_id) throw new Error("Mode cloud_connector : console_id manquant");
    const { apiKey } = await resolveCredentials(integ);
    const url = CLOUD_CONNECTOR_BASE + "/" + integ.console_id + proxyPath;
    return fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), ...cloudHeaders(apiKey as string) },
      signal,
    });
  }
  const base = (integ.controller_url || "").replace(/\/$/, "");
  const headers = await localAuthHeaders(integ, signal);
  return fetch(base + proxyPath, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...headers },
    signal,
  });
}

function restPath(integ: UniFiIntegration, resource: string): string {
  return "/proxy/network/api/s/" + (integ.unifi_site_id || "default") + "/rest/" + resource;
}

// ---------------------------------------------------------------------------
// Retrouve l'id client UniFi à partir du MAC.
// Cloud : GET /v1/sites/{site}/clients?filter=macAddress.eq(...) (existant).
// Local : GET rest/user puis filtrage par mac côté serveur (l'API Network ne
// filtre pas rest/user par MAC de façon fiable — lecture complète, filtre ici).
// ---------------------------------------------------------------------------
export async function findClientByMac(
  integ: UniFiIntegration,
  mac: string,
  signal?: AbortSignal
): Promise<UniFiResult> {
  if (integ.connection_mode === "cloud_connector") {
    return resolveClientId(integ, mac, signal);
  }
  try {
    const res = await unifiRequest(integ, restPath(integ, "user"), { method: "GET" }, signal);
    if (!res.ok) {
      return { success: false, message: explainUniFiError("GET rest/user", res.status) };
    }
    const rows = extractRows(await res.json());
    const norm = mac.toLowerCase();
    const row = rows.find(
      (r) => typeof (r as Record<string, unknown>).mac === "string" &&
        ((r as Record<string, unknown>).mac as string).toLowerCase() === norm
    ) as Record<string, unknown> | undefined;
    if (!row) {
      return { success: false, message: "Aucun client rest/user pour le MAC " + mac };
    }
    const clientId = (row._id ?? row.id ?? row.clientId) as string | undefined;
    if (!clientId) {
      return { success: false, message: "Client UniFi trouvé sans id" };
    }
    return { success: true, message: "Client résolu", data: { clientId, macAddress: row.mac } };
  } catch (err) {
    return { success: false, message: "findClientByMac: " + (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// authorize-sta (règle normative : cmd en POST OBLIGATOIRE, GET = 404/405).
// Local : POST cmd/stamgr { cmd: "authorize-sta", mac, minutes }.
// Cloud : action v1 AUTHORIZE_GUEST_ACCESS (client résolu depuis le MAC).
// ---------------------------------------------------------------------------
export async function authorizeSta(
  integ: UniFiIntegration,
  mac: string,
  minutes: number,
  signal?: AbortSignal
): Promise<UniFiResult> {
  if (integ.connection_mode === "cloud_connector") {
    const resolved = await resolveClientId(integ, mac, signal);
    if (!resolved.success) return resolved;
    const clientId = (resolved.data as Record<string, unknown>).clientId as string;
    return authorizeGuest(integ, clientId, minutes, signal);
  }
  try {
    const res = await unifiRequest(
      integ,
      "/proxy/network/api/s/" + (integ.unifi_site_id || "default") + "/cmd/stamgr",
      {
        method: "POST",
        body: JSON.stringify({ cmd: "authorize-sta", mac: mac.toLowerCase(), minutes }),
      },
      signal
    );
    if (!res.ok) {
      let detail = "";
      try {
        detail = JSON.stringify(await res.json()).slice(0, 300);
      } catch { /* corps non JSON */ }
      return { success: false, message: explainUniFiError("authorize-sta", res.status, detail) };
    }
    return { success: true, message: "authorize-sta OK (" + minutes + " min)" };
  } catch (err) {
    return { success: false, message: "authorizeSta: " + (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Trouve OU crée le groupe QoS d'un plan (rest/usergroup, testé en lab ✅).
// qos_rate_max_down/up déjà mappés via mapQosRate (2..100000 ou -1).
// ---------------------------------------------------------------------------
export async function ensureUserGroup(
  integ: UniFiIntegration,
  name: string,
  qos: { downMbps: number; upMbps: number },
  signal?: AbortSignal
): Promise<UniFiResult> {
  const path = restPath(integ, "usergroup");
  try {
    // 1. Lecture : un groupe existant est réutilisé (jamais recréé en double)
    const getRes = await unifiRequest(integ, path, { method: "GET" }, signal);
    if (!getRes.ok) {
      return { success: false, message: explainUniFiError("GET rest/usergroup", getRes.status) };
    }
    const rows = extractRows(await getRes.json());
    const existing = rows.find((r) => (r as Record<string, unknown>).name === name) as
      | Record<string, unknown>
      | undefined;
    if (existing) {
      const id = (existing._id ?? existing.id) as string | undefined;
      if (!id) return { success: false, message: "Groupe usergroup existant sans id" };
      return { success: true, message: "Groupe QoS existant", data: { userGroupId: id, created: false } };
    }

    // 2. Création avec les débits du plan (pattern API : 2..100000 ou -1)
    const postRes = await unifiRequest(
      integ,
      path,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          qos_rate_max_down: qos.downMbps,
          qos_rate_max_up: qos.upMbps,
        }),
      },
      signal
    );
    if (!postRes.ok) {
      let detail = "";
      try {
        detail = JSON.stringify(await postRes.json()).slice(0, 300);
      } catch { /* corps non JSON */ }
      return { success: false, message: explainUniFiError("POST rest/usergroup", postRes.status, detail) };
    }
    const created = extractRows(await postRes.json());
    const newId = ((created[0] as Record<string, unknown> | undefined)?._id ??
      (created[0] as Record<string, unknown> | undefined)?.id) as string | undefined;
    if (!newId) return { success: false, message: "POST rest/usergroup sans _id en retour" };
    return { success: true, message: "Groupe QoS créé", data: { userGroupId: newId, created: true } };
  } catch (err) {
    return { success: false, message: "ensureUserGroup: " + (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Applique le groupe QoS au client : PUT rest/user/{id} { usergroup_id }.
// (⚠️ statut de test : modèle connu, à confirmer sur site — voir doc.)
// ---------------------------------------------------------------------------
export async function setClientUserGroup(
  integ: UniFiIntegration,
  clientId: string,
  userGroupId: string,
  signal?: AbortSignal
): Promise<UniFiResult> {
  const path = restPath(integ, "user") + "/" + encodeURIComponent(clientId);
  try {
    const res = await unifiRequest(
      integ,
      path,
      { method: "PUT", body: JSON.stringify({ usergroup_id: userGroupId }) },
      signal
    );
    if (!res.ok) {
      let detail = "";
      try {
        detail = JSON.stringify(await res.json()).slice(0, 300);
      } catch { /* corps non JSON */ }
      return { success: false, message: explainUniFiError("PUT rest/user", res.status, detail) };
    }
    return { success: true, message: "Groupe QoS appliqué au client" };
  } catch (err) {
    return { success: false, message: "setClientUserGroup: " + (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Parse une réponse d'action guest.
// ---------------------------------------------------------------------------
async function parseAction(res: Response, action: string): Promise<UniFiResult> {
  if (res.status === 200 || res.status === 204) {
    return { success: true, message: "UniFi OK (" + action + ")" };
  }
  let detail = "";
  try {
    detail = JSON.stringify(await res.json()).slice(0, 300);
  } catch {
    detail = "";
  }
  return {
    success: false,
    message: "UniFi " + action + " HTTP " + res.status + (detail ? " — " + detail : ""),
  };
}

// ---------------------------------------------------------------------------
// Test de connexion (diagnostic admin).
// Cloud : GET /v1/hosts liste les consoles atteignables avec la clé, puis
// GET /v1/sites/{siteId}/clients compte les clients connectés.
// Local (legacy) : stat/sysinfo + stat/sta.
// ---------------------------------------------------------------------------
export async function testConnection(
  integ: UniFiIntegration,
  signal?: AbortSignal
): Promise<{
  success: boolean;
  version?: string;
  clientCount?: number;
  consoleCount?: number;
  message: string;
}> {
  if (integ.connection_mode === "cloud_connector") {
    const { apiKey } = await resolveCredentials(integ);
    const base = buildBase(integ);
    const site = integ.unifi_site_id || "default";

    // 1. Consoles atteignables avec cette clé (vérifie la portée de la clé)
    let consoleCount: number | undefined;
    const hostsRes = await fetch("https://api.ui.com/v1/hosts", {
      headers: cloudHeaders(apiKey as string),
      signal,
    });
    if (hostsRes.ok) {
      const hosts = extractRows(await hostsRes.json());
      consoleCount = hosts.length;
    }

    // 2. Clients connectés sur le site (vérifie console_id + site_id)
    let clientCount: number | undefined;
    const clientsRes = await fetch(
      base + "/v1/sites/" + site + "/clients?limit=200",
      { headers: cloudHeaders(apiKey as string), signal }
    );
    if (clientsRes.ok) {
      const clients = extractRows(await clientsRes.json());
      clientCount = clients.length;
    }

    return {
      success: true,
      consoleCount,
      clientCount,
      message:
        "Cloud Connector OK — " + (consoleCount ?? "?") +
        " console(s) atteignable(s), " + (clientCount ?? "?") + " client(s) sur le site",
    };
  }

  // Mode local (legacy)
  const { password } = await resolveCredentials(integ);
  const base = buildBase(integ);
  const site = integ.unifi_site_id || "default";
  const session = await localSession(
    base,
    integ.api_username as string,
    password as string,
    signal
  );
  if (!session) {
    return { success: false, message: "Échec login UniFi" };
  }
  const headers = { Cookie: session.cookies, "X-Csrf-Token": session.csrf };

  let version = "unknown";
  let clientCount = 0;
  const sysRes = await fetch(base + "/proxy/network/api/s/" + site + "/stat/sysinfo", {
    headers,
    signal,
  });
  if (sysRes.ok) {
    const sysData = await sysRes.json();
    const sysRows = extractRows(sysData);
    version = ((sysRows[0] as Record<string, unknown>)?.version as string) || "unknown";
  }
  const staRes = await fetch(base + "/proxy/network/api/s/" + site + "/stat/sta", {
    headers,
    signal,
  });
  if (staRes.ok) {
    const staData = await staRes.json();
    clientCount = extractRows(staData).length;
  }

  return {
    success: true,
    version,
    clientCount,
    message: "Connexion locale réussie — " + version,
  };
}
