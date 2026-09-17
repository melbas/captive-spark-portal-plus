/**
 * Tracking des événements du portail.
 *
 * Source unique d'appel à l'Edge Function `track-event`, qui alimente la
 * table `events`. Historiquement JAMAIS alimentée — le portail n'avait
 * aucune mesure de fonctionnement (visiteurs, pubs regardées, conversions).
 *
 * Contrat : aucun tracking n'est fait si le site_id ou le user_id est absent
 * (fail-closed — on préfère perdre un event que d'écrire de la donnée
 * orpheline non rattachée à un site).
 */

import { supabase } from "@/integrations/supabase/client";

export type PortalEventType =
  // Session
  | "session_start"
  | "session_end"
  // Publicité
  | "ad_view"
  | "ad_click"
  | "ad_skip"
  | "ad_progress"
  // Engagement
  | "engagement_start"
  | "engagement_complete"
  // Leads
  | "lead_created"
  // Paiement
  | "payment_started"
  | "payment_succeeded"
  | "payment_failed";

export interface TrackParams {
  eventType: PortalEventType;
  siteId: string;
  userId?: string | null;
  /** Identifiant de la pub (ad_videos.id) pour les events ad_*. */
  adId?: string;
  /** % de visionnage pour ad_progress (0-100). */
  percentage?: number;
  /** Données complémentaires libres. */
  extra?: Record<string, unknown>;
  /** Nom lisible (défaut: eventType). */
  eventName?: string;
}

class TrackingService {
  /**
   * Enregistre un événement. Non bloquant : n'envoie jamais d'exception à
   * l'appelant — le tracking ne doit JAMAIS casser le parcours utilisateur.
   */
  async track(params: TrackParams): Promise<void> {
    try {
      if (!params?.siteId) return;

      const body: Record<string, unknown> = {
        event_type: params.eventType,
        event_name: params.eventName ?? params.eventType,
        site_id: params.siteId,
      };
      if (params.adId) body.ad_id = params.adId;
      if (typeof params.percentage === "number") {
        body.percentage = Math.min(100, Math.max(0, params.percentage));
      }
      if (params.extra) body.extra = params.extra;

      const { error } = await supabase.functions.invoke("track-event", { body });

      if (error) {
        // Silencieux : on log sans casser le parcours.
        console.warn("[tracking] erreur:", error.message);
      }
    } catch (e) {
      console.warn("[tracking] échec (non bloquant):", e);
    }
  }

  // Raccourcis typés (domaine pub) ----------------------------------------

  adView(siteId: string, adId: string, extra?: Record<string, unknown>) {
    return this.track({
      eventType: "ad_view",
      siteId,
      adId,
      extra,
    });
  }

  adClick(siteId: string, adId: string, extra?: Record<string, unknown>) {
    return this.track({
      eventType: "ad_click",
      siteId,
      adId,
      extra,
    });
  }

  adSkip(siteId: string, adId: string, extra?: Record<string, unknown>) {
    return this.track({
      eventType: "ad_skip",
      siteId,
      adId,
      extra,
    });
  }

  /**
   * Progression de visionnage. Typiquement appelé à 25/50/75/100% pour
   * mesurer le taux de completion réel (ce que vaut le contenu).
   */
  adProgress(
    siteId: string,
    adId: string,
    percentage: number,
    extra?: Record<string, unknown>
  ) {
    return this.track({
      eventType: "ad_progress",
      siteId,
      adId,
      percentage,
      extra,
    });
  }

  engagementComplete(
    siteId: string,
    kind: "quiz" | "video",
    extra?: Record<string, unknown>
  ) {
    return this.track({
      eventType: "engagement_complete",
      siteId,
      eventName: `engagement_${kind}`,
      extra: { kind, ...extra },
    });
  }
}

export const trackingService = new TrackingService();
