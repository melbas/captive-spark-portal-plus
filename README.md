# Captive Spark Portal Plus

Portail captif WiFi SaaS multi-clients — Sénégal / Afrique de l'Ouest.

Stack : React 18 + Vite + TypeScript + Supabase (PostgreSQL) + Tailwind + shadcn-ui.

## Structure

- `src/` — application (portail invité + back office admin)
  - `components/wifi-portal/` — parcours invité (auth → engagement → accès)
  - `components/admin/forge/` — Forge (studio de conception)
  - `pages/admin/` — back office
  - `hooks/usePortalConfig.ts` — config publiée → gating + branding
  - `components/wifi-portal/flow-sequence.ts` — séquenceur de parcours
- `supabase/migrations/` — schéma SQL versionné
- `e2e/` — tests Playwright (projet `local`)

## Démarrage

```sh
npm i
npm run dev      # http://localhost:8080
```

Variables d'environnement (`.env`, jamais committées) :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Scripts

```sh
npm run dev      # dev server
npm run build    # build de production
npm run e2e      # tests Playwright (local)
bash supabase/run-tests.sh   # tests backend
node --test src/lib/admin/modules.test.ts src/components/wifi-portal/flow-sequence.test.ts
```

## Docs

- `docs/forge.md` — studio de conception (Kit / Forge / Portail)
- `docs/catalogue-preceptes.md` — catalogue des 8 préceptes
- `docs/RAPPORT-PORTAIL.md` — inventaire et dette technique
