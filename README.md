# PremiumConnect — Portail Captif WiFi IA-First

> Plateforme SaaS multi-revendeurs de portail captif WiFi pour l'Afrique de l'Ouest.
> Stack 100% open source, auto-hébergeable, conçu pour le marché sénégalais.

---

## Architecture

```
premiumconnect/
├── apps/
│   ├── api/            → API Core (Node.js 22 + Fastify + tRPC)
│   ├── portal/         → Portail captif (React 19 + Vite)
│   ├── backoffice/     → Back-Office admin (React 19 + Vite)
│   └── ai-service/     → Service IA (Python 3.11 + FastAPI)
├── packages/
│   └── shared/         → Types TypeScript partagés
└── infra/
    ├── docker-compose.yml       → Développement local
    ├── docker-compose.prod.yml  → Production
    └── postgres/init.sql        → Schéma initial
```

## Stack Technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| API | Node.js 22 + Fastify + tRPC | API typesafe end-to-end |
| Base de données | PostgreSQL 16 | Persistance principale |
| Cache / OTP | Redis 7 | Sessions, OTP, rate limiting |
| IA / ML | Python 3.11 + FastAPI | Churn, fraude, segmentation |
| Portail | React 19 + Vite + Tailwind 4 | Interface utilisateur mobile-first |
| Back-Office | React 19 + Vite + Recharts | Administration |
| Proxy | Nginx | Reverse proxy + SSL |
| Conteneurs | Docker + Docker Compose | Déploiement |

## Démarrage rapide (développement)

```bash
# 1. Cloner et installer
git clone https://github.com/melbas/premiumconnect
cd premiumconnect
pnpm install

# 2. Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 3. Démarrer les services Docker (PostgreSQL + Redis)
docker compose -f infra/docker-compose.yml up -d postgres redis

# 4. Initialiser la base de données
cd apps/api && pnpm db:push

# 5. Démarrer tous les services
pnpm dev
```

**URLs de développement :**
- Portail captif : http://localhost:5173/portal/demo
- Back-Office : http://localhost:5174
- API : http://localhost:4000
- Service IA : http://localhost:8000/docs

## Configuration UDM Pro (Ubiquiti)

Dans **UniFi Network → Settings → Hotspot Portal → External Portal** :

```
URL du portail externe :
https://portal.votredomaine.sn/portal/{SLUG_DU_SITE}
```

Le contrôleur UniFi ajoutera automatiquement les paramètres :
```
?id={MAC_CLIENT}&ap={MAC_AP}&ssid={SSID}&url={URL_REDIRECT}
```

**Paramètres importants :**
- `id` → Adresse MAC du client (utilisée pour l'autorisation)
- `ap` → Adresse MAC du point d'accès
- `ssid` → Nom du réseau WiFi
- `url` → URL de redirection après connexion

## Intégrations matérielles supportées

| Marque | Statut | Méthode d'autorisation |
|--------|--------|------------------------|
| Ubiquiti UniFi | ✅ Stable | API REST `/api/s/{site}/cmd/stamgr` |
| MikroTik | 🔶 Bêta | API REST `/rest/ip/hotspot/active` |
| Cisco Meraki | 🔜 Bientôt | API Meraki Dashboard |
| Huawei | 🔜 Bientôt | API iMaster NCE |

## Forfaits par défaut (FCFA)

| Forfait | Durée | Prix |
|---------|-------|------|
| Journalier | 24h | 300 FCFA |
| 3 Jours | 72h | 500 FCFA |
| Hebdomadaire | 7 jours | 1 000 FCFA |
| Mensuel | 30 jours | 3 000 FCFA |
| Famille | 30 jours | 10 000 FCFA |

## Méthodes de paiement

- **Wave** (API officielle + webhooks)
- **Orange Money** (API officielle + webhooks)
- **Free Money** (intégration en cours)
- **Vouchers prépayés** (génération par le back-office)

## Tests

```bash
# Tests API (Vitest)
cd apps/api && pnpm test

# Tests Service IA (pytest)
cd apps/ai-service && pytest test_main.py -v

# Tests E2E (Playwright — Phase 3)
pnpm test:e2e
```

## Déploiement production

```bash
# Configurer les variables de production
cp .env.example .env.prod
# Éditer .env.prod

# Déployer
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d

# Vérifier les logs
docker compose -f infra/docker-compose.prod.yml logs -f api
```

## Variables d'environnement requises

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `DATABASE_URL` | URL PostgreSQL | ✅ |
| `REDIS_URL` | URL Redis | ✅ |
| `JWT_SECRET` | Secret JWT (min 64 chars) | ✅ |
| `WAVE_API_KEY` | Clé API Wave Sénégal | ✅ |
| `WAVE_WEBHOOK_SECRET` | Secret HMAC Wave | ✅ |
| `ORANGE_MONEY_API_KEY` | Clé API Orange Money | ✅ |
| `ENCRYPTION_KEY` | Clé AES-256 pour credentials hardware | ✅ |
| `AI_SERVICE_API_KEY` | Clé API service IA interne | ✅ |

## Roadmap

- **Phase 1** (actuelle) — Fondations : monorepo, DB, API Core, portail MVP, back-office
- **Phase 2** — Production : paiements réels Wave/OM, tests UDM Pro, MikroTik bêta
- **Phase 3** — Engagement : gamification, mini-jeux, publicité, WhatsApp
- **Phase 4** — IA avancée : modèles ML entraînés, chatbot, prévisions

---

© 2024 PremiumConnect — WIFI-Sénégal tous droits réservés
