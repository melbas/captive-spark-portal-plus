/**
 * track-event — tracking d'événements du portail (visiteurs, pubs, clics).
 *
 * Source unique d'alimentation de la table `events`. Historiquement jamais
 * alimentée — le portail n'avait AUCUNE mesure de fonctionnement.
 *
 * ÉVÉNEMENTS SUIVIS (non exhaustif) :
 *   session_start / session_end          — arrivée/départ d'un visiteur
 *   ad_view / ad_click / ad_skip          — pub (video/audio/image)
 *   ad_progress                           — % de visionnage
 *   engagement_start / engagement_complete — quiz/vidéo
 *   lead_created                          — lead collecté
 *   payment_started / payment_succeeded / payment_failed
 *
 * AUTORISATION (fail-closed) :
 *   - Visiteur authentifié (`kind: "visitor"`) : preuve de session visiteur
 *     liée au site (verify-otp a créé l'utilisateur côté serveur).
 *     Accepté car les events concernent SA propre session.
 *   - Admin : accès complet par site.
 *   - Aucune écriture anonyme possible (RLS events exige uid propriétaire
 *     ET service_role pour bypass).
 *
 * VOLUMÉTRIE : écrit via service_role (bypass RLS) en assignant
 * `user_id` = uid vérifié — jamais de user_id client-trusté.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";

// Événements autorisés (whitelist). Tout le reste est rejeté.
const ALLOWED_EVENTS = new Set([
  // Session
  "session_start",
  "session_end",
  // Publicité
  "ad_view",
  "ad_click",
  "ad_skip",
  "ad_progress",
  // Engagement
  "engagement_start",
  "engagement_complete",
  // Leads
  "lead_created",
  // Paiement
  "payment_started",
  "payment_succeeded",
  "payment_failed",
]);

// Champs attendus selon le type d'événement (validation stricte).
const EVENT_SHAPE: Record<string, (d: Record<string, unknown>) => boolean> = {
  ad_view: (d) => typeof d.ad_id === "string",
  ad_click: (d) => typeof d.ad_id === "string",
  ad_skip: (d) => typeof d.ad_id === "string",
  ad_progress: (d) =>
    typeof d.ad_id === "string" &&
    typeof d.percentage === "number" &&
    d.percentage >= 0 &&
    d.percentage <= 100,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin":
          Deno.env.get("ALLOWED_ORIGIN") || "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Méthode non autorisée" }, 405);
  }

  const body = await req.json().catch(() => ({}));
  const { event_type, event_name, site_id, ad_id, percentage, extra } = body;

  // 1. Validation de base
  if (typeof event_type !== "string" || !event_type) {
    return json({ error: "event_type manquant" }, 400);
  }
  if (!ALLOWED_EVENTS.has(event_type)) {
    return json({ error: `Événement non supporté: ${event_type}` }, 400);
  }
  if (typeof site_id !== "string" || !site_id) {
    return json({ error: "site_id manquant" }, 400);
  }

  // 2. Autorisation : visiteur OU admin pour ce site
  const auth = await requireAuth(req, {
    siteId: site_id,
    allowVisitor: true,
  });
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  // 3. Construction de event_data (payload strict)
  const eventData: Record<string, unknown> = { ...extra };
  if (ad_id) eventData.ad_id = ad_id;
  if (typeof percentage === "number") {
    eventData.percentage = Math.min(100, Math.max(0, percentage));
  }

  // 4. Validation du shape si défini
  const shape = EVENT_SHAPE[event_type];
  if (shape && !shape(eventData)) {
    return json({ error: `Payload invalide pour ${event_type}` }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 5. Écriture (service_role : bypass RLS, user_id = uid vérifié)
  const { error } = await supabase.from("events").insert({
    user_id: ctx.userId,
    event_type,
    event_name: event_name || event_type,
    event_data: eventData,
    device_info: extractDevice(req),
  });

  if (error) {
    return json({ error: "Erreur d'écriture" }, 500);
  }

  return json({ ok: true }, 200);
});

/** Extraie les infos appareil depuis les headers (pas de cookies/JS). */
function extractDevice(req: Request): Record<string, unknown> {
  const ua = req.headers.get("user-agent") || "";
  const device: Record<string, unknown> = {};

  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  device.type = isMobile ? "mobile" : "desktop";

  // OS principal (synthétique — pas d'analyse fine)
  if (/Android/i.test(ua)) device.os = "android";
  else if (/iPhone|iPad/i.test(ua)) device.os = "ios";
  else if (/Windows/i.test(ua)) device.os = "windows";
  else if (/Mac/i.test(ua)) device.os = "macos";
  else if (/Linux/i.test(ua)) device.os = "linux";

  device.lang = req.headers.get("accept-language")?.split(",")[0] || null;

  return device;
}
