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
