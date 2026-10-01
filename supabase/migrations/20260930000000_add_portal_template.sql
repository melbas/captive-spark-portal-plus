-- ===========================================================================
-- 20260930000000_add_portal_template.sql
--
-- Mécanique de sélection de template de portail par site.
--
-- sites.portal_template :
--   - 'instant' (défaut) : portail actuel (WifiPortalContainer / parcours
--     existant) — valeur par défaut de TOUT site, y compris existants.
--   - 'scene'            : template événementiel (portage portal-lab #v-scene).
--   - 'echange'          : template échange (PremiumConnect, portage à venir).
--
-- RLS : aucune policy à ajouter — la policy anon SELECT
-- « public_read_anon_active_sites » (202609280006) couvre toute la ligne,
-- donc la nouvelle colonne est lisible automatiquement côté portail.
-- ===========================================================================

alter table public.sites
  add column if not exists portal_template text not null default 'instant';

-- Contrainte d'intégrité : seuls les 3 templates connus sont acceptables.
-- Idempotent (drop if exists avant create) pour permettre un re-run propre.
alter table public.sites
  drop constraint if exists sites_portal_template_check;

alter table public.sites
  add constraint sites_portal_template_check
  check (portal_template in ('instant', 'scene', 'echange'));
