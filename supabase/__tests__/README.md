# Tests supabase/__tests__

Les Edge Functions (`supabase/functions/**`) tournent sur le **runtime Deno**
(imports `https://esm.sh`, `Deno.env`, `Deno.serve`) : elles ne peuvent pas
être exécutées par vitest/Node. `npm run test:ci` exclut donc `supabase/**`.

## Tests provision-access (séquence UniFi normative)

```bash
deno test --allow-env --allow-net supabase/__tests__/provision-access_test.ts
```

- `DENO_TEST=1` est positionné PAR le fichier de test lui-même (via
  `Deno.env.set` avant l'import dynamique du handler) : aucune variable
  d'environnement à passer manuellement.
- Prérequis : [deno](https://deno.land) ≥ 2.x dans le PATH.
- Le fetch global est mocké : la séquence d'appels réelle est vérifiée
  (authorize-sta en POST → GET rest/user → GET/POST rest/usergroup →
  PUT rest/user/{id}) ainsi que le mapping QoS (1 Mbps → 2, null → -1,
  plage 2..100000) et les réponses d'erreur structurées `success:false, step`.

## Fichier de compatibilité vitest

`deno-only.test.ts` est un placeholder sans assertion réelle : il existe pour
que vitest trouve une suite valide dans ce dossier au lieu d'un dossier vide.
