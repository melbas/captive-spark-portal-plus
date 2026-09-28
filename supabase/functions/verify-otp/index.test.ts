import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import handler from "./index.ts";

Deno.test("verify-otp demo bypass uses fixedCode from environment", async () => {
  // Set environment variables for demo mode with a custom fixed code
  const customFixedCode = "654321";
  const originalDevOtpMode = Deno.env.get("DEV_OTP_MODE");
  const originalDevOtpFixedCode = Deno.env.get("DEV_OTP_FIXED_CODE");

  try {
    Deno.env.set("DEV_OTP_MODE", "true");
    Deno.env.set("DEV_OTP_FIXED_CODE", customFixedCode);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const testIdentifier = "test@example.com";
    const testSiteId = "test-site";

    // Clean up any existing OTP for this identifier
    await supabase
      .from("pc_audit_logs")
      .delete()
      .eq("action", "otp_pending")
      .eq("entity_type", "email")
      .eq("ip_address", testIdentifier.toLowerCase())
      .eq("entity_id", testSiteId);

    // Do NOT call send-otp, so no OTP is stored in the database

    // Attempt to verify with the custom fixed code
    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testIdentifier, code: customFixedCode, siteId: testSiteId })
    });

    const resp = await handler(req);
    const data = await resp.json();

    // Expect success because of demo bypass
    assertEquals(data.success, true);
    assertEquals(resp.status, 200);
  } finally {
    // Restore original env vars
    if (originalDevOtpMode !== null) {
      Deno.env.set("DEV_OTP_MODE", originalDevOtpMode);
    } else {
      Deno.env.delete("DEV_OTP_MODE");
    }
    if (originalDevOtpFixedCode !== null) {
      Deno.env.set("DEV_OTP_FIXED_CODE", originalDevOtpFixedCode);
    } else {
      Deno.env.delete("DEV_OTP_FIXED_CODE");
    }

    // Clean up
    await supabase
      .from("pc_audit_logs")
      .delete()
      .eq("action", "otp_pending")
      .eq("entity_type", "email")
      .eq("ip_address", testIdentifier.toLowerCase())
      .eq("entity_id", testSiteId);
  }
});

Deno.test("verify-otp rate limiting: blocks after 10 attempts/hour", async () => {
  // This test is a placeholder and would require mocking or a test database.
  // To run: set up a local Supabase, copy env vars, and run with `deno test`.
  // We'll mark it as skipped until we have a proper test setup.
  Deno.test.skip();
});