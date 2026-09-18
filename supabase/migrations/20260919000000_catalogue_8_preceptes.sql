-- ============================================================================
-- PHASE A — Refonte du catalogue en 8 préceptes + table portal_kits
--
-- Constat (vérifié dans le code avant écriture) :
--  - Le catalogue admin comptait 12 modules, dont 7 sans AUCUN rendu côté
--    portail (pas de flag dans usePortalConfig.ts, pas d'étape, pas de
--    composant). Les activer dans l'admin ne changeait rien au portail.
--  - À l'inverse, `payment` était un flag côté portail mais n'existait pas
--    dans le catalogue admin.
--  - La table portal_modules n'était même pas seedée (catalogue vide en
--    production) — c'est donc un seed propre, pas une migration de données.
--
-- Nouveau catalogue : 8 préceptes, miroir EXACT de ce que le portail exécute.
-- Chaque module_name = un flag lu dans usePortalConfig.ts (l. 388) ET une
-- étape du flow WifiPortalContent.tsx. Zéro coquille vide.
--
-- Réglages (hors catalogue, gérés par les onglets de la Forge) :
--  - social_integration  -> méthode d'auth (sites.auth_method / AuthBox)
--  - targeted_marketing  -> segmentation admin (audiences)
--
-- Retiré : ai_chat_multilingual (demande explicite).
-- Retiré : family — les tables family_* sont reportées par le backend ;
--          garder le module rendrait le bouton mensonger (mock).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Nettoyage de l'ancien catalogue (vide en production, mais idempotent)
-- ---------------------------------------------------------------------------
delete from public.portal_enabled_modules;
delete from public.portal_modules;

-- ---------------------------------------------------------------------------
-- 2. Les 8 préceptes
--    module_name  = clé technique lue par usePortalConfig.ts (NE PAS RENOMMER)
--    flow_step    = valeur de l'énum Step côté portail (doc/cohérence)
-- ---------------------------------------------------------------------------
insert into public.portal_modules
  (module_name, display_name, description, module_type, category, flow_step, sort_order)
values
  ('payment',
   'Accès Payant',
   'Facture l''accès Internet (carte, mobile money). Remplacé le WiFi gratuit '
   'par un service payant — première source de revenu directe.',
   'premium', 'Monétisation', 'payment', 1),

  ('quiz',
   'Quiz Marketing',
   'Le visiteur répond à quelques questions contre du temps de connexion. '
   'Transforme l''attente en données qualifiées pour vos annonceurs.',
   'optional', 'Engagement', 'engagement', 2),

  ('video',
   'Vidéo Publicitaire',
   'Le visiteur regarde une vidéo sponsorisée pour débloquer sa connexion. '
   'Revenu publicitaire + mémoire de marque.',
   'optional', 'Engagement', 'engagement', 3),

  ('extend_time',
   'Temps Offert',
   'Offre du temps de connexion gratuit (bienvenue, fidélité). Le geste '
   'd''ouverture qui désamorce les plaintes et fait revenir.',
   'optional', 'Rétention', 'extend-time', 4),

  ('mini_games',
   'Mini-Jeux',
   'Des jeux courts et addictifs qui gardent le visiteur connecté plus '
   'longtemps et collectent des leads qualifiés en jouant.',
   'optional', 'Engagement', 'mini-games', 5),

  ('rewards',
   'Récompenses',
   'Des points convertibles en temps, bonbons ou bons d''achat. Le visiteur '
   'revient ET ramène ses amis.',
   'optional', 'Rétention', 'rewards', 6),

  ('referral',
   'Parrainage',
   'Le visiteur invite ses contacts pour gagner du temps. Acquisition '
   'organique — chaque client devient un canal.',
   'optional', 'Acquisition', 'referral', 7),

  ('learning_center',
   'Learning Center',
   'Diffusez formations, tutoriels et ressources éducatives directement sur '
   'le portail. La valeur qui justifie un WiFi en établissement scolaire, '
   'hôtel ou institution.',
   'optional', 'Valeur', 'learning-center', 8);

-- ---------------------------------------------------------------------------
-- 3. Colonne flow_step + index
--    (le catalogue décrit désormais le flow ; l'ordre est lisible en une requête)
-- ---------------------------------------------------------------------------
alter table public.portal_modules
  add column if not exists flow_step text;

create index if not exists portal_modules_flow_step_idx
  on public.portal_modules (flow_step);

-- ---------------------------------------------------------------------------
-- 4. Ordre du parcours, propre au site
--    portal_config.flow_order : jsonb des module_name actifs, dans l'ordre
--    choisi dans la Forge. Lecture par useWifiPortal (remplace le switch codé
--    en dur — l'onglet "Parcours" réordonne pour de vrai).
--    RFI : la valeur n'est écrite QUE sur "Publier" (brouillon ≠ publié).
-- ---------------------------------------------------------------------------
alter table public.portal_config
  add column if not exists flow_order jsonb default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 5. Kits : catalogue d'onboarding (sélection -> pré-remplit la Forge)
-- ---------------------------------------------------------------------------
create table if not exists public.portal_kits (
  id uuid default gen_random_uuid() primary key,

  name text not null,
  slug text not null unique,

  description text,

  -- icône lucide (clé string, cf modules.ts :: moduleIcon)
  icon text not null default 'puzzle',

  -- type de site cible (FK logique vers sites.type check constraint)
  site_type text check (
    site_type in ('hotel','restaurant','campus','public','commerce','institution','other')
  ),

  -- thème par défaut appliqué (nullable : kit sans thème imposé)
  theme_id uuid references public.portal_themes(id) on delete set null,

  -- config de pré-remplissage : welcome_message, default_language,
  -- theme_color, bandwidth_limit_kbps, success_message...
  default_config jsonb not null default '{}'::jsonb,

  -- module_name des préceptes recommandés (parmi les 8 ci-dessus)
  recommended_modules jsonb not null default '[]'::jsonb,

  -- préceptes interdits pour ce kit (conformité / pertinence ; vide en V1)
  restricted_modules jsonb not null default '[]'::jsonb,

  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_kits_site_type_idx
  on public.portal_kits (site_type);

-- ---------------------------------------------------------------------------
-- 6. Lien Kit <-> config (l'attribution ne crée PAS de table intermédiaire :
--    portal_config est déjà rattachée au site)
-- ---------------------------------------------------------------------------
alter table public.portal_config
  add column if not exists kit_id uuid references public.portal_kits(id)
    on delete set null;

-- ---------------------------------------------------------------------------
-- 7. RLS — même politique que portal_modules / portal_themes
-- ---------------------------------------------------------------------------
alter table public.portal_kits enable row level security;

drop policy if exists "public_read_portal_kits" on public.portal_kits;
create policy "public_read_portal_kits"
  on public.portal_kits for select to anon, authenticated
  using (is_active = true);

-- Le portail a besoin de lire l'ordre du flow (preview live + parcours)
alter table public.portal_config enable row level security;
drop policy if exists "public_read_portal_config_flow" on public.portal_config;
create policy "public_read_portal_config_flow"
  on public.portal_config for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 8. Seed initial des kits (V1 — thématiques validées)
-- ---------------------------------------------------------------------------
insert into public.portal_kits
  (name, slug, description, icon, site_type, default_config, recommended_modules, sort_order)
values
  ('Kit Hôtel',
   'hotel',
   'Portail premium pour hôtels et résidences. Chambre, restauration et '
   'événements : le WiFi devient un service à part entière.',
   'hotel',
   'hotel',
   jsonb_build_object(
     'welcome_message', 'Bienvenue. Connectez-vous au WiFi de l''établissement.',
     'success_message', 'Bon surf ! Profitez de votre séjour.',
     'theme_color', '#5B4DFF'
   ),
   jsonb_build_array('video','extend_time','rewards','referral'),
   1),

  ('Kit École',
   'ecole',
   'Pour établissements scolaires et universités. Le WiFi porte la pédagogie '
   'et finance les activités.',
   'graduation-cap',
   'campus',
   jsonb_build_object(
     'welcome_message', 'Connectez-vous au WiFi du campus.',
     'success_message', 'Connexion accordée. Bonne étude !',
     'theme_color', '#5B4DFF'
   ),
   jsonb_build_array('learning_center','quiz','mini_games','referral'),
   2),

  ('Kit Restaurant',
   'restaurant',
   'WiFi en salle : fidélisation et données clients pour les restaurateurs.',
   'utensils-crossed',
   'restaurant',
   jsonb_build_object(
     'welcome_message', 'Bienvenue chez nous. Le WiFi est offert.',
     'success_message', 'Bon appétit et bonne connexion !',
     'theme_color', '#FF4D6A'
   ),
   jsonb_build_array('extend_time','rewards','referral'),
   3),

  ('Kit Commerce',
   'commerce',
   'Boutiques et centres commerciaux : trafic, leads et promotions ciblées.',
   'shopping-cart',
   'commerce',
   jsonb_build_object(
     'welcome_message', 'Connectez-vous et profitez des offres du jour.',
     'success_color', '#5B4DFF'
   ),
   jsonb_build_array('quiz','video','rewards','referral'),
   4),

  ('Kit Institution',
   'institution',
   'Administrations, hôpitaux, espaces publics : accès sûr et sobre.',
   'landmark',
   'institution',
   jsonb_build_object(
     'welcome_message', 'WiFi public de l''établissement. Connexion sécurisée.',
     'theme_color', '#5B4DFF'
   ),
   jsonb_build_array('extend_time','learning_center'),
   5),

  ('Kit Événementiel',
   'evenementiel',
   'Salons, conférences, concerts. Captation massive de leads sponsors en '
   'quelques minutes.',
   'mic',
   'public',
   jsonb_build_object(
     'welcome_message', 'Bienvenue à l''événement. Connectez-vous au WiFi.',
     'success_message', 'Connexion accordée. Bon événement !',
     'theme_color', '#5B4DFF'
   ),
   jsonb_build_array('quiz','video','mini_games','rewards','referral'),
   6);

-- ---------------------------------------------------------------------------
-- 9. Garde-fou : recommended_modules ne peut contenir que les 8 préceptes
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from jsonb_array_elements_text(
      (select recommended_modules from public.portal_kits where recommended_modules is not null)
    ) as m
    where m not in (
      select module_name from public.portal_modules
    )
  ) then
    raise exception 'Kit avec un module recommandé inexistant dans le catalogue des 8';
  end if;
end $$;

commit;
