import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.224.0/encoding/hex.ts";

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

    // Verify HMAC signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("wave-signature") || "";
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      const expectedSig = new TextDecoder().decode(hexEncode(new Uint8Array(sig)));

      if (signature !== expectedSig) {
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

    if (eventType === "checkout.session.completed") {
      // Get transaction
      const { data: tx } = await supabase
        .from("transactions")
        .select("*, wifi_plans(duration_min)")
        .eq("id", clientReference)
        .single();

      if (tx && tx.status === "pending") {
        // Call authorize-guest internally
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

        // Get MAC from the session context — stored in audit logs
        const { data: auditLog } = await supabase
          .from("pc_audit_logs")
          .select("details")
          .eq("entity_id", clientReference)
          .eq("action", "payment_initiated")
          .single();

        const mac = (auditLog?.details as any)?.mac || "unknown";

        const authRes = await fetch(`${supabaseUrl}/functions/v1/authorize-guest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
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

    // Log webhook
    await supabase.from("pc_audit_logs").insert({
      action: "wave_webhook",
      entity_type: "transaction",
      entity_id: clientReference,
      details: { eventType, data: event.data },
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
