// Authentification des Edge Functions sensibles.
// verify_jwt (config.toml) garantit seulement un JWT SIGNÉ — il accepte aussi
// le JWT anon. Ce module fait l'AUTORISATION réelle côté serveur :
//   1. Appels machine-à-machine : header `x-internal-secret` =
//      INTERNAL_FUNCTION_SECRET (utilisé par wave-webhook → authorize-guest).
//   2. Appels back office : JWT Supabase + user_roles via
//      is_super_admin()/can_access_site(site_id) (SECURITY DEFINER).
// Ce n'est PAS une protection CORS — l'authentification est côté serveur.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthContext =
  | { kind: "internal" }
  | { kind: "admin"; userId: string }
  | { kind: "visitor"; userId: string; siteId: string };

export async function requireAuth(
  req: Request,
  opts: { siteId?: string; allowVisitor?: boolean } = {}
): Promise<{ ctx: AuthContext } | { error: Response }> {
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");

  // 1. Service-to-service
  const xSecret = req.headers.get("x-internal-secret");
  if (internalSecret && xSecret) {
    const a = new TextEncoder().encode(internalSecret);
    const b = new TextEncoder().encode(xSecret);
    if (a.length === b.length) {
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
      if (diff === 0) return { ctx: { kind: "internal" } };
    }
  }

  // 2. JWT utilisateur (signé — vérifié ici, pas seulement par le gateway)
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return {
      error: json({ error: "Authentification requise" }, 401),
    };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { error: json({ error: "JWT invalide ou expiré" }, 401) };
  }
  const userId = userData.user.id;

  // 3. Périmètre admin : is_super_admin() ou can_access_site(site)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: isSuper } = await admin.rpc("is_super_admin", { });
  if (isSuper === true) return { ctx: { kind: "admin", userId } };

  if (opts.siteId) {
    const { data: ok } = await admin.rpc("can_access_site", {
      p_site_id: opts.siteId,
    });
    if (ok === true) return { ctx: { kind: "admin", userId } };
  }

  // 4. Visiteur authentifié (preuve de session visiteur liée au site) —
  //    optionnel : userId doit exister dans wifi_users pour CE site,
  //    non bloqué. Créé par verify-otp (backend), jamais par le front.
  if (opts.allowVisitor && opts.siteId) {
    const siteId = opts.siteId;
    const { data: wu } = await admin
      .from("wifi_users")
      .select("id, site_id, is_blocked")
      .eq("id", userId)
      .eq("site_id", siteId)
      .eq("is_blocked", false)
      .maybeSingle();
    if (wu) return { ctx: { kind: "visitor", userId, siteId } };
  }

  return { error: json({ error: "Accès refusé pour ce périmètre" }, 403) };
}

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
    },
  });
}
