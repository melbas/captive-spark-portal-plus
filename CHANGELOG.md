# Changelog

Tous les changements notables de ce projet sont documentés ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet suit le [SemVer](https://semver.org/lang/fr/).

## [1.0.0] - 2026-10-01

Première version candidate à la production du portail Wi-Fi captive multi-sites.

### Sécurité — Milestone 1
- Durcissement Supabase : RLS actif et policies strictes sur les tables
  applicatives ; `FORCE ROW LEVEL SECURITY` (correctif de la chaîne de
  migrations `enable row level force` → SQL valide).
- Corrections du flux d'authentification AuthBox (OTP email).

### Admin multi-sites
- Gestion multi-sites pour l'administration : contextes site, rôles
  (super_admin, reseller, site_manager), modules et forfaits par site.
- Page Paramètres plateforme réservée super_admin (`PLATFORM_ONLY`).

### Portail Wi-Fi Supabase exclusif
- Portail captive branché exclusivement sur Supabase : flux de connexion,
  séquences, adapters d'intégration UniFi (référence UDM Pro Max).

### Migrations & données
- Migrations SQL 001 à 007 appliquées en production + régénération des types
  Supabase.

### Tooling & CI
- CI de test : `npm run test:ci` (57 tests, 20 fichiers).
- Versioning applicatif : build info injectée par git (`scripts/version.mjs`),
  affichage dans l'admin, présentation détaillée dans ce changelog.

### Outils d'exploitation
- `provision-access` : outillage de provisionnement d'accès.

[1.0.0]: https://github.com/melbas/captive-spark-portal-plus/releases/tag/v1.0.0
