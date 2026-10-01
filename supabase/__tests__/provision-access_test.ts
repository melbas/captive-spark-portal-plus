// ===========================================================================
// provision-access_test.ts — tests de la séquence normative UniFi
// Exécution : DENO_TEST=1 deno test --allow-env --allow-net supabase/__tests__/
// (exclu de `npm run test:ci` vitest : le code des Edge Functions importe
// https://esm.sh/... et utilise Deno.env — runtime Deno uniquement.)
// Source normative : docs/hardware/unifi-integration-rules.md
// ===========================================================================

// Désactive Deno.serve() dans provision-access/index.ts AVANT l'import du
// module (les imports statiques sont évalués avant le corps du module, donc
// import dynamique obligatoire ici) — sinon : AddrInUse dans le test runner.
Deno.env.set("DENO_TEST", "1");
const { handler, planGroupName } = await import("../functions/provision-access/index.ts");
const { assertEquals } = await import("https://deno.land/std@0.224.0/assert/mod.ts");
const { mapQosRate } = await import("../functions/_shared/unifi.ts");

export {}; // module

// ---------------------------------------------------------------------------
// Mock du fetch global : enregistre chaque appel (url, method, body) et
// répond selon un scénario programmable.
// ---------------------------------------------------------------------------
type Call = { url: string; method: string; body: Record<string, unknown> | null };

const calls: Call[] = [];
let scenario: (call: Call, n: number) => Response | Promise<Response>;

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const originalFetch = globalThis.fetch;

function installMock() {
  calls.length = 0;
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = init?.method ?? "GET";
    let body: Record<string, unknown> | null = null;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = null;
      }
    }
    const call: Call = { url, method, body };
    const n = calls.push(call);
    return Promise.resolve(scenario(call, n - 1));
  }) as typeof fetch;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MAC = "AA:BB:CC:DD:EE:FF";
const SITE_ID = "site-uuid-1";
const PLAN_ID = "plan-uuid-1";
const CLIENT_ID = "66a1b2c3d4e5f6a7b8c9d0e1";
const GROUP_ID = "66ffffffffffffffffffffff";

const INTEG = {
  id: "hw-1",
  brand: "unifi",
  connection_mode: "local",
  controller_url: "https://192.168.11.1",
  unifi_site_id: "default",
  api_username: "api-bot",
  api_password_enc: "legacy-plaintext-password", // format legacy accepté par crypto.ts
  console_id: null,
  api_key_enc: null,
};

// Réponses en mode local (auth legacy = session cookie) — le login local
// renvoie des headers set-cookie / x-csrf-token.
function mockLogin(): Response {
  return new Response(null, {
    status: 200,
    headers: { "set-cookie": "TOKEN=abc", "x-csrf-token": "csrf-1" },
  });
}

// Table de routage du mock par motif d'URL (après le login local).
function localRouter(): (call: Call) => Response {
  return (call) => {
    if (call.url.endsWith("/api/auth/login")) return mockLogin();
    if (call.url.includes("/cmd/stamgr")) {
      assertEquals(call.method, "POST"); // cmd OBLIGATOIREMENT en POST
      return jsonRes({ meta: { rc: "ok" }, data: [] });
    }
    if (call.url.includes("/rest/usergroup") && call.method === "GET") {
      return jsonRes({ data: [] }); // aucun groupe existant → création
    }
    if (call.url.includes("/rest/usergroup") && call.method === "POST") {
      return jsonRes({ data: [{ _id: GROUP_ID, name: call.body?.name }] });
    }
    if (call.url.includes("/rest/user") && call.method === "GET") {
      return jsonRes({ data: [{ _id: CLIENT_ID, mac: MAC.toLowerCase() }] });
    }
    if (call.url.includes("/rest/user/") && call.method === "PUT") {
      return jsonRes({ data: [{ _id: CLIENT_ID }] });
    }
    return jsonRes({ error: "unexpected " + call.url }, 500);
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://edge/provision-access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": "internal-test-secret",
    },
    body: JSON.stringify(body),
  });
}

async function withEnv(fn: () => Promise<void>) {
  Deno.env.set("INTERNAL_FUNCTION_SECRET", "internal-test-secret");
  Deno.env.set("SUPABASE_URL", "https://supabase.test");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key");
  Deno.env.set("SUPABASE_ANON_KEY", "anon-test-key");
  Deno.env.set("ENCRYPTION_KEY", "a".repeat(64));
  installMock();
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Supabase JS : on mocke au niveau HTTP pour piloter select() du plan et de
// l'intégration. Les URLs postgrest sont reconnaissables par la table.
function supabaseRouter(opts: {
  plan: Record<string, unknown> | null;
  hw: Record<string, unknown> | null;
}): (call: Call) => Response {
  return (call) => {
    if (call.url.includes("/rest/v1/wifi_plans")) {
      return jsonRes(opts.plan ? [opts.plan] : []);
    }
    if (call.url.includes("/rest/v1/hardware_integrations")) {
      return jsonRes(opts.hw ? [opts.hw] : []);
    }
    if (call.url.includes("/rest/v1/pc_audit_logs")) {
      return jsonRes([], 201);
    }
    return jsonRes({ message: "unexpected " + call.url }, 404);
  };
}

function combinedRouter(a: (c: Call) => Response, b: (c: Call) => Response) {
  return (call: Call) => (call.url.includes("supabase.test") ? a(call) : b(call));
}

// ===========================================================================
// 1. Mapping QoS normatif
// ===========================================================================
Deno.test("mapQosRate : 1 Mbps → 2 (pattern API rejette 1)", () => {
  assertEquals(mapQosRate(1), 2);
  assertEquals(mapQosRate(0), 2);
  assertEquals(mapQosRate(-5), 2);
});

Deno.test("mapQosRate : null → -1 (illimité)", () => {
  assertEquals(mapQosRate(null), -1);
  assertEquals(mapQosRate(undefined), -1);
});

Deno.test("mapQosRate : plage 2..100000 conservée, > 100000 plafonné", () => {
  assertEquals(mapQosRate(2), 2);
  assertEquals(mapQosRate(100), 100);
  assertEquals(mapQosRate(100000), 100000);
  assertEquals(mapQosRate(200000), 100000);
});

Deno.test("planGroupName : nom portant les débits mappés", () => {
  assertEquals(
    planGroupName({ name: "Escale", duration_minutes: 60, speed_down_mb: 10, speed_up_mb: 5 }),
    "Escale-plan-1h_down10_up5"
  );
  assertEquals(
    planGroupName({ name: "Mini", duration_minutes: 30, speed_down_mb: 1, speed_up_mb: null }),
    "Mini-plan-30m_down2_up-1"
  );
});

// ===========================================================================
// 2. Séquence complète (mode local) — ordre et payloads vérifiés
// ===========================================================================
Deno.test("séquence provision : authorize-sta → rest/user → usergroup → PUT rest/user", async () => {
  await withEnv(async () => {
    const plan = {
      id: PLAN_ID,
      name: "Escale",
      duration_minutes: 60,
      speed_down_mb: 10,
      speed_up_mb: 5,
      data_limit_mb: null,
    };
    scenario = combinedRouter(supabaseRouter({ plan, hw: INTEG }), localRouter());

    const res = await handler(makeRequest({ mac: MAC, siteId: SITE_ID, planId: PLAN_ID }));
    const body = await res.json();

    // a. La séquence démarre par authorize-sta en POST (jamais GET = 404/405)
    const stamgr = calls.find((c) => c.url.includes("/cmd/stamgr"));
    assertEquals(stamgr?.method, "POST");
    assertEquals(stamgr?.body, {
      cmd: "authorize-sta",
      mac: MAC.toLowerCase(),
      minutes: 60, // durée du plan, pas du navigateur
    });

    // b. GET rest/user pour retrouver l'id client
    const userGet = calls.find((c) => c.url.includes("/rest/user") && c.method === "GET");
    assertEquals(userGet?.url.includes("/proxy/network/api/s/default/rest/user"), true);

    // c. GET rest/usergroup puis POST de création avec débits mappés
    const ugGet = calls.find((c) => c.url.includes("/rest/usergroup") && c.method === "GET");
    assertEquals(ugGet?.url.includes("/proxy/network/api/s/default/rest/usergroup"), true);
    const ugPost = calls.find((c) => c.url.includes("/rest/usergroup") && c.method === "POST");
    assertEquals(ugPost?.body, {
      name: "Escale-plan-1h_down10_up5",
      qos_rate_max_down: 10,
      qos_rate_max_up: 5,
    });

    // d. PUT rest/user/{id} avec le usergroup_id
    const userPut = calls.find((c) => c.url.includes("/rest/user/") && c.method === "PUT");
    assertEquals(userPut?.url.endsWith("/rest/user/" + CLIENT_ID), true);
    assertEquals(userPut?.body, { usergroup_id: GROUP_ID });

    // Réponse : needsQuotaWatch false (pas de data_limit_mb)
    assertEquals(body.success, true);
    assertEquals(body.clientId, CLIENT_ID);
    assertEquals(body.userGroupId, GROUP_ID);
    assertEquals(body.needsQuotaWatch, false);
  });
});

Deno.test("plan avec data_limit_mb → needsQuotaWatch: true (quota = tâche séparée)", async () => {
  await withEnv(async () => {
    const plan = {
      id: PLAN_ID,
      name: "Journée",
      duration_minutes: 1440,
      speed_down_mb: 1, // piège : 1 Mbps → doit ressortir 2 côté UniFi
      speed_up_mb: 1,
      data_limit_mb: 500,
    };
    scenario = combinedRouter(supabaseRouter({ plan, hw: INTEG }), localRouter());

    const res = await handler(makeRequest({ mac: MAC, siteId: SITE_ID, planId: PLAN_ID }));
    const body = await res.json();

    assertEquals(body.success, true);
    assertEquals(body.needsQuotaWatch, true);
    assertEquals(body.groupName, "Journée-plan-1j_down2_up2");

    const ugPost = calls.find((c) => c.url.includes("/rest/usergroup") && c.method === "POST");
    assertEquals(ugPost?.body, {
      name: "Journée-plan-1j_down2_up2",
      qos_rate_max_down: 2, // 1 Mbps rejeté par le pattern API → 2
      qos_rate_max_up: 2,
    });
  });
});

// ===========================================================================
// 3. Groupe QoS existant : réutilisé, pas de POST de création
// ===========================================================================
Deno.test("usergroup existant → réutilisé sans création", async () => {
  await withEnv(async () => {
    const plan = {
      id: PLAN_ID,
      name: "Escale",
      duration_minutes: 60,
      speed_down_mb: 10,
      speed_up_mb: 5,
      data_limit_mb: null,
    };
    const supa = supabaseRouter({ plan, hw: INTEG });
    const localWithExistingGroup = (call: Call): Response => {
      if (call.url.includes("/rest/usergroup") && call.method === "GET") {
        return jsonRes({ data: [{ _id: GROUP_ID, name: "Escale-plan-1h_down10_up5" }] });
      }
      return localRouter()(call);
    };
    scenario = combinedRouter(supa, localWithExistingGroup);

    const res = await handler(makeRequest({ mac: MAC, siteId: SITE_ID, planId: PLAN_ID }));
    const body = await res.json();

    assertEquals(body.success, true);
    assertEquals(body.userGroupId, GROUP_ID);
    assertEquals(
      calls.filter((c) => c.url.includes("/rest/usergroup") && c.method === "POST").length,
      0,
      "aucune création de groupe si existant"
    );
  });
});

// ===========================================================================
// 4. Erreurs : réponse structurée success:false + step — pas de rollout partiel
// ===========================================================================
Deno.test("authorize-sta échoue → success:false, step:'authorize-sta', aucune étape suivante", async () => {
  await withEnv(async () => {
    const plan = {
      id: PLAN_ID,
      name: "Escale",
      duration_minutes: 60,
      speed_down_mb: 10,
      speed_up_mb: 5,
      data_limit_mb: null,
    };
    const failing = (call: Call): Response => {
      if (call.url.includes("/cmd/stamgr")) {
        return jsonRes({ meta: { rc: "error", msg: "not authorized" } }, 401);
      }
      return localRouter()(call);
    };
    scenario = combinedRouter(supabaseRouter({ plan, hw: INTEG }), failing);

    const res = await handler(makeRequest({ mac: MAC, siteId: SITE_ID, planId: PLAN_ID }));
    const body = await res.json();

    assertEquals(body.success, false);
    assertEquals(body.step, "authorize-sta");
    assertEquals(body.error.includes("401"), true, "le piège 401 doit être expliqué");
    assertEquals(
      calls.some((c) => c.url.includes("/rest/user")),
      false,
      "pas d'étape suivante après un échec"
    );
  });
});

Deno.test("PUT rest/user échoue → success:false, step:'set-usergroup'", async () => {
  await withEnv(async () => {
    const plan = {
      id: PLAN_ID,
      name: "Escale",
      duration_minutes: 60,
      speed_down_mb: 10,
      speed_up_mb: 5,
      data_limit_mb: null,
    };
    const failing = (call: Call): Response => {
      if (call.url.includes("/rest/user/") && call.method === "PUT") {
        return jsonRes({ error: "InvalidPayload qos" }, 400);
      }
      return localRouter()(call);
    };
    scenario = combinedRouter(supabaseRouter({ plan, hw: INTEG }), failing);

    const res = await handler(makeRequest({ mac: MAC, siteId: SITE_ID, planId: PLAN_ID }));
    const body = await res.json();

    assertEquals(body.success, false);
    assertEquals(body.step, "set-usergroup");
  });
});

Deno.test("MAC inconnu → success:false, step:'resolve-client'", async () => {
  await withEnv(async () => {
    const plan = {
      id: PLAN_ID,
      name: "Escale",
      duration_minutes: 60,
      speed_down_mb: 10,
      speed_up_mb: 5,
      data_limit_mb: null,
    };
    const noClient = (call: Call): Response => {
      if (call.url.includes("/rest/user") && call.method === "GET") {
        return jsonRes({ data: [] });
      }
      return localRouter()(call);
    };
    scenario = combinedRouter(supabaseRouter({ plan, hw: INTEG }), noClient);

    const res = await handler(makeRequest({ mac: MAC, siteId: SITE_ID, planId: PLAN_ID }));
    const body = await res.json();

    assertEquals(body.success, false);
    assertEquals(body.step, "resolve-client");
  });
});

Deno.test("entrée invalide (mac manquant) → 400 sans toucher UniFi", async () => {
  await withEnv(async () => {
    scenario = () => {
      throw new Error("UniFi ne doit pas être appelé");
    };
    const res = await handler(makeRequest({ siteId: SITE_ID, planId: PLAN_ID }));
    assertEquals(res.status, 400);
  });
});
