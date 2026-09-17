import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { timingSafeEqual } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.text();
    const webhookSecret = Deno.env.get("WAVE_WEBHOOK_SECRET");

    // FAIL-CLOSED (P0) : pas de secret configuré → rejet 503, aucun traitement.
    if (!webhookSecret) {
      console.error("wave-webhook: WAVE_WEBHOOK_SECRET absent → rejet 503");
      return new Response(JSON.stringify({ error: "Webhook non configuré" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC signature — OBLIGATOIRE, comparaison à temps constant
    {
      const signature = req.headers.get("wave-signature") || "";
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      const expectedSig = new TextDecoder().decode(encodeHex(new Uint8Array(sig)));

      if (!timingSafeEqual(signature, expectedSig)) {
        console.error("Invalid Wave webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(body);
    const eventType = event.type || event.event;
    const clientReference = event.data?.client_reference;

    if (!clientReference) {
      return new Response(JSON.stringify({ error: "No client_reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Idempotence : événement déjà traité ? (table processed_webhook_events)
    const eventId: string = event.id ||
      (await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body))).toString();
    const { data: already } = await supabase
      .from("processed_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (already) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "checkout.session.completed") {
      // Get transaction (colonnes nécessaires uniquement)
      const { data: tx } = await supabase
        .from("transactions")
        .select("id, status, amount, site_id, plan_id, user_id")
        .eq("id", clientReference)
        .single();

      if (tx && tx.status === "pending") {
        // --- Vérification du montant payé vs transaction (P0) --------------
        // Wave exprime les montants en XOF entiers ; on exige >= tx.amount.
        const paidAmount = Number(event.data?.amount);
        if (!Number.isFinite(paidAmount) || paidAmount < Number(tx.amount)) {
          console.error(
            `wave-webhook: montant insuffisant — payé ${paidAmount}, attendu ${tx.amount}`
          );
          await supabase.from("processed_webhook_events").insert({
            event_id: eventId,
            provider: "wave",
            transaction_id: tx.id,
          });
          return new Response(
            JSON.stringify({ error: "Montant payé insuffisant" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Call authorize-guest internally
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

        // Get MAC from the session context — stored in audit logs
        const { data: auditLog } = await supabase
          .from("pc_audit_logs")
          .select("details")
          .eq("entity_id", clientReference)
          .eq("action", "payment_initiated")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const mac = (auditLog?.details as any)?.mac || "unknown";

        // Appel interne : authentifié par secret partagé (x-internal-secret).
        // authorize-guest n'accepte plus un simple JWT anon ni un appel nu.
        const authRes = await fetch(`${supabaseUrl}/functions/v1/authorize-guest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") || "",
          },
          body: JSON.stringify({
            mac,
            siteId: tx.site_id,
            planId: tx.plan_id,
            userId: tx.user_id,
            transactionId: tx.id,
          }),
        });

        const authData = await authRes.json();
        console.log("authorize-guest result:", authData);
      }
    } else if (eventType === "checkout.session.failed" || eventType === "checkout.session.expired") {
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", clientReference);
    }

    // Marquer l'événement comme traité (idempotence)
    await supabase.from("processed_webhook_events").upsert(
      { event_id: eventId, provider: "wave" },
      { onConflict: "event_id" }
    );

    // Log webhook
    await supabase.from("pc_audit_logs").insert({
      action: "wave_webhook",
      entity_type: "transaction",
      entity_id: clientReference,
      details: { eventType },
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("wave-webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
