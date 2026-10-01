import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";
import {
  authorizeSta,
  ensureUserGroup,
  findClientByMac,
  mapQosRate,
  setClientUserGroup,
  type UniFiIntegration,
} from "../_shared/unifi.ts";

// ---------------------------------------------------------------------------
// provision-access — provisionne une session WiFi complète depuis un plan
// (wifi_plans), selon les règles normatives testées réellement :
// docs/hardware/unifi-integration-rules.md
//
// Séquence normative (un plan = 3 actions UniFi) :
//   a. authorize-sta minutes = duration_minutes (jamais reçu du navigateur)
//   b. retrouver l'id client (GET rest/user filtré par mac)
//   c. GET rest/usergroup → trouver OU créer le groupe QoS du plan
//      (nom "plan-<suffixe durée>" portant les débits)
//   d. PUT rest/user/{id} { usergroup_id }
//
// Mapping QoS (pièges API réels) :
//   - débit <= 1 Mbps → 2  (le pattern API rejette 1 : -1|[2-9]|[1-9][0-9]{1,4}|100000)
//   - null            → -1 (illimité)
//   - plage valide    : 2 → 100 000
//
// Quota data : data_limit_mb N'EST PAS appliqué ici — l'UDM n'a AUCUNE règle
// native déclenchée par volume (Network 10.6.101). La fonction répond
// needsQuotaWatch: true et l'orchestration périodique (stat/sta rx/tx_bytes)
// reste une tâche SÉPARÉE.
//
// Sécurité : requireAuth comme authorize-guest ; secrets déchiffrés à l'usage
// (AES-256-GCM) dans _shared/unifi.ts ; aucun secret journalisé.
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// Suffixe court de durée pour le nom de groupe : "3j" / "2h" / "45m".
export function durationSuffix(minutes: number): string {
  if (minutes % (60 * 24) === 0) return minutes / (60 * 24) + "j";
  if (minutes % 60 === 0) return minutes / 60 + "h";
  return minutes + "m";
}

// Nom du groupe QoS du plan, ex : "Escale-plan-1h_down10_up5".
export function planGroupName(
  plan: {
    name: string;
    duration_minutes: number;
    speed_down_mb: number | null;
    speed_up_mb: number | null;
  }
): string {
  const down = mapQosRate(plan.speed_down_mb);
  const up = mapQosRate(plan.speed_up_mb);
  return `${plan.name}-plan-${durationSuffix(plan.duration_minutes)}_down${down}_up${up}`.slice(0, 60);
}

type ProvisionStep =
  | "db_integration"
  | "authorize-sta"
  | "resolve-client"
  | "resolve-usergroup"
  | "set-usergroup";

// Pas de rollout partiel silencieux : chaque échec est explicite et typé par
// l'étape (voir tableau des pièges dans unifi-integration-rules.md).
function fail(step: ProvisionStep, message: string): Response {
  return json({ success: false, step, error: message }, 502);
}

// Handler exporté pour les tests (supabase/__tests__/provision-access_test.ts,
// exécutés avec `deno test --allow-env --allow-net`). Deno.serve reste appelé
// au déploiement Edge, sauté quand DENO_TEST=1 (voir bas de fichier).
export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mac, siteId, planId, transactionId } = await req.json();
    if (!mac || !siteId || !planId) {
      return json({ error: "mac, siteId, planId requis" }, 400);
    }

    // --- Authentification + autorisation serveur (comme authorize-guest) ---
    const auth = await requireAuth(req, { siteId, allowVisitor: true });
    if ("error" in auth) return auth.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") as string,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
    );

    // 1. Plan — source de vérité : durée, débits, quota (jamais le navigateur)
    const { data: plan, error: planErr } = await supabase
      .from("wifi_plans")
      .select("id, name, duration_minutes, speed_down_mb, speed_up_mb, data_limit_mb")
      .eq("id", planId)
      .maybeSingle();
    if (planErr || !plan) return json({ error: "Forfait introuvable" }, 404);
    if (!plan.duration_minutes || plan.duration_minutes <= 0) {
      return json({ error: "Forfait sans durée valide (duration_minutes)" }, 422);
    }

    // 2. Intégration UniFi active du site
    const { data: hw, error: hwErr } = await supabase
      .from("hardware_integrations")
      .select(
        "id, brand, connection_mode, controller_url, unifi_site_id, api_username, api_password_enc, console_id, api_key_enc"
      )
      .eq("site_id", siteId)
      .eq("brand", "unifi")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (hwErr) return fail("db_integration", "Lecture hardware_integrations : " + hwErr.message);
    if (!hw) return json({ error: "Aucune intégration UniFi active pour ce site" }, 404);
    const integ = hw as unknown as UniFiIntegration;

    // 3a. Autorisation temporelle (cmd/stamgr authorize-sta, POST obligatoire)
    const authorized = await authorizeSta(integ, mac, plan.duration_minutes);
    if (!authorized.success) return fail("authorize-sta", authorized.message);

    // 3b. Id client résolu depuis le MAC (jamais reçu du navigateur)
    const client = await findClientByMac(integ, mac);
    if (!client.success) return fail("resolve-client", client.message);
    const clientId = (client.data as { clientId: string }).clientId;

    // 3c. Groupe QoS du plan (trouvé ou créé, débits mappés 2..100000 / -1)
    const groupName = planGroupName(plan);
    const group = await ensureUserGroup(integ, groupName, {
      downMbps: mapQosRate(plan.speed_down_mb),
      upMbps: mapQosRate(plan.speed_up_mb),
    });
    if (!group.success) return fail("resolve-usergroup", group.message);
    const userGroupId = (group.data as { userGroupId: string }).userGroupId;

    // 3d. Application du groupe au client (PUT rest/user/{id})
    const applied = await setClientUserGroup(integ, clientId, userGroupId);
    if (!applied.success) return fail("set-usergroup", applied.message);

    // 3e. Quota data : signalé, orchestré ailleurs (tâche séparée)
    const needsQuotaWatch = typeof plan.data_limit_mb === "number" && plan.data_limit_mb > 0;

    // 4. Journalisation d'audit (aucun secret — jamais de réponse rest/setting)
    await supabase.from("pc_audit_logs").insert({
      action: "provision_access",
      entity_type: "wifi_client",
      entity_id: clientId,
      details: {
        mac,
        planId,
        transactionId: transactionId ?? null,
        userGroupId,
        groupName,
        durationMin: plan.duration_minutes,
        needsQuotaWatch,
      },
    });

    return json({
      success: true,
      mac,
      clientId,
      userGroupId,
      groupName,
      durationMin: plan.duration_minutes,
      needsQuotaWatch,
    }, 200);
  } catch (err) {
    console.error("provision-access error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
}

// Démarrage du serveur Edge UNIQUEMENT hors tests : un module de test qui
// importe ce fichier poserait sinon AddrInUse (Deno.serve écarterait le
// module). Les tests positionnent DENO_TEST=1 AVANT l'import (import
// dynamique dans supabase/__tests__/provision-access_test.ts).
if (Deno.env.get("DENO_TEST") !== "1") {
  Deno.serve(handler);
}
