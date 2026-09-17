/**
 * usePortalConfig(siteSlug?) — charge en une passe la config publiée d'un site :
 * sites + portal_config + portal_customizations + portal_enabled_modules(+portal_modules) + ad_videos.
 *
 * Contrat (PLAN-FINAL §4/§6 + correction produit) :
 *  - Valeurs par défaut (visuels démo) UNIQUEMENT en démo isolée (slug `demo`, `?demo`,
 *    ou portail racine sans site). Sur un vrai site, l'absence de config publiée est
 *    une ERREUR affichée (fail-closed) : pas de fallback visuel silencieux.
 *  - Les erreurs de lecture (RLS en transition, table absente) sont remontées via
 *    `error` — le portail n'invente jamais de config.
 *  - `enabledModules === null` = aucune config publiée → gating fail-closed
 *    (seuls les modules obligatoires) sur un vrai site ; tout activé en démo.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ALL_MODULES_ENABLED,
  MANDATORY_ONLY_GATING,
  type EngagementKind,
  type PortalModuleGating,
} from "@/lib/portal-config-defaults";

export interface PortalAdSlide {
  id: string;
  imageUrl: string;
  fallbackUrl?: string;
  title: { en: string; fr: string };
  description: { en: string; fr: string };
  link?: string;
}

export interface PortalMediaAd {
  id: string;
  kind: "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  title: string;
}

export interface PortalRuntimeConfig {
  siteId: string | null;
  siteName: string | null;
  portalName: string | null;
  logoUrl: string | null;
  themeColor: string | null;
  welcomeMessage: { en: string; fr: string } | null;
  supportContact: string | null;
  sessionMinutes: number | null;
  startingPoints: number | null;
  engagementType: EngagementKind | null;
  slides: PortalAdSlide[];
  mediaAds: PortalMediaAd[];
  enabledModules: PortalModuleGating;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  /** D'où viennent les valeurs : 'db' (config publiée), 'demo-defaults', 'demo-partial'. */
  source: "db" | "demo-defaults" | "demo-partial";
}

const EMPTY_GATING_FALLBACK: PortalModuleGating = { ...ALL_MODULES_ENABLED };

function detectDemo(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  if (params.has("demo")) return true;
  const path = window.location.pathname;
  return path === "/" || path === "/portal" || /^\/portal\/demo\/?$/.test(path);
}

/**
 * Applique la marque lue depuis la config (`themeColor`, `logoUrl`) au CSS du
 * portail — dette §7 INVENTAIRE-PORTAIL §3 : ces valeurs étaient lues mais
 * jamais appliquées au rendu.
 *
 * - `themeColor` : injectée comme `--primary` (et `--ring`, dérivés) sur
 *   `:root` ET `.dark` (le portail est le seul consommateur) — les composants
 *   shadcn/tailwind `text-primary` / `bg-primary` suivent automatiquement.
 * - `logoUrl` : injectée comme variable CSS `--portal-logo` (utilisable en
 *   `bg-[var(--portal-logo)]` / `content: var(--portal-logo)` côté portail).
 *
 * Sécurité : aucune écriture si la valeur est absente ou mal formée ; la
 * couleur doit être un `#hex` ou un `hsl(...)` valide (on refuse tout autre
 * format pour éviter d'injecter du CSS arbitraire).
 */
const CSS_COLOR_RE = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8}|hsl\([^)]*\)|hsla\([^)]*\))$/i;
const CSS_URL_RE = /^https?:\/\/[^\s"']+$/i;

function hexToHslChannels(hex: string): string | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `${0} ${Math.round(l * 100)}%`;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const s = Math.round((d / (1 - Math.abs(2 * l - 1))) * 100);
  return `${h} ${s}% ${Math.round(l * 100)}%`;
}

/**
 * Applique la marque au CSS. Idempotent (écrase les variables précédentes).
 * À appeler une fois la config résolue (WifiPortalContainer).
 */
export function applyPortalBranding(themeColor: string | null, logoUrl: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (themeColor && CSS_COLOR_RE.test(themeColor)) {
    const channels = themeColor.startsWith("#")
      ? hexToHslChannels(themeColor)
      : themeColor.replace(/^hsla?\(/, "").replace(/\)$/, "");
    if (channels) {
      // Format canonique tailwind/shadcn : "H S% L%" (sans le préfixe hsl()).
      root.style.setProperty("--primary", channels);
      root.style.setProperty("--ring", channels);
      // Variant sombre : même teinte, luminosité un peu relevée (lisibilité).
      if (!themeColor.startsWith("#")) {
        const parts = channels.split(/\s+/);
        const light = parseInt(parts[2] || "65", 10);
        parts[2] = `${Math.min(100, light + 10)}%`;
        root.style.setProperty("--dark-primary", parts.join(" "));
      } else {
        root.style.setProperty("--dark-primary", channels);
      }
    }
  }
  if (logoUrl && CSS_URL_RE.test(logoUrl)) {
    root.style.setProperty("--portal-logo", `url("${logoUrl}")`);
  }
}

function detectSlug(explicit?: string): string | null {
  if (explicit) return explicit;
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/^\/portal\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Déduit le type d'un média `ad_videos` de son URL.
 *
 * Dette §7 (INVENTAIRE-PORTAIL §1) : la colonne `ad_videos.type` n'existe pas
 * encore côté backend — le front déduit le type de l'extension de l'URL.
 * Dégradation gracieuse : extension inconnue/absente → `"video"` (rendu
 * `<VideoAd>` qui gère une source invalide en erreur, plutôt qu'un écran
 * vide). Dès que `ad_videos.type` existera, `explicitType` sera lu en base.
 */
function inferMediaKind(url: string, explicitType?: string | null): "video" | "audio" {
  // Contrat backend à venir : `ad_videos.type` (enum image/video/audio).
  if (explicitType === "audio" || explicitType === "video") return explicitType;
  return /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(url) ? "audio" : "video";
}

/** Média inconnu (URL absente ou non résolvable) → on ignore la ligne. */
function isUsableMediaUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.trim().length > 0;
}

/* ---------- Projections explicites (colonnes réellement lues) ----------
 * Le cast sur les résultats remplace les `any` : le schéma généré est trop profond
 * pour TS (TS2589), et la projection explicite est le contrat de colonnes attendu.
 */
interface SiteRow {
  id: string;
  name: string | null;
  logo_url: string | null;
  primary_color: string | null;
}
interface PortalConfigRow {
  id: string;
  portal_name: string | null;
  logo_url: string | null;
  theme_color: string | null;
  welcome_message: string | null;
}
interface CustomizationRow {
  customization_type: string | null;
  customization_data: Record<string, unknown> | null;
}
interface ModuleRow {
  id: string;
  module_name: string | null;
}
interface EnabledModuleRow {
  module_id: string;
  is_enabled: boolean | null;
}
interface AdVideoRow {
  id: string;
  title: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  /** Contrat backend à venir (enum image/video/audio) — absent aujourd'hui. */
  type?: string | null;
}
type QueryResult<T> = { data: T | null; error: { message: string } | null };

/**
 * Builder PostgREST minimal : couper l'inférence du schéma généré (trop profond pour
 * TS, TS2589) dès `supabase.from(...)`, puis projeter chaque résultat sur son type.
 */
interface LooseTable {
  select: (columns: string) => LooseTable;
  eq: (column: string, value: string | number | boolean) => LooseTable;
  order: (column: string, opts?: { ascending?: boolean }) => LooseTable;
  maybeSingle: () => PromiseLike<QueryResult<never>>;
}
function table(name: string): LooseTable {
  // `from` est restreint aux relations du schéma généré ; on l'élargit explicitement
  // au lieu d'un `any` : le cast reste documenté et ciblé.
  const from = supabase.from as (relation: string) => unknown;
  return from(name) as unknown as LooseTable;
}

/* ---------- Extraction typée des customizations (JSON) ---------- */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/* ---------- Cache mémoire simple (60 s) ---------- */
const CACHE_TTL_MS = 60_000;
const configCache = new Map<string, { expires: number; value: PortalRuntimeConfig }>();

/** Force un rechargement (utile après une publication admin sur le site courant). */
export function clearPortalConfigCache(): void {
  configCache.clear();
}

export function usePortalConfig(siteSlug?: string): PortalRuntimeConfig {
  const [state, setState] = useState<PortalRuntimeConfig>(() => ({
    siteId: null,
    siteName: null,
    portalName: null,
    logoUrl: null,
    themeColor: null,
    welcomeMessage: null,
    supportContact: null,
    sessionMinutes: null,
    startingPoints: null,
    engagementType: null,
    slides: [],
    mediaAds: [],
    enabledModules: detectDemo() ? EMPTY_GATING_FALLBACK : null,
    isDemo: detectDemo(),
    loading: true,
    error: null,
    source: detectDemo() ? "demo-defaults" : "db",
  }));

  useEffect(() => {
    let cancelled = false;
    const isDemo = detectDemo();
    const slug = detectSlug(siteSlug);
    const cacheKey = slug ?? "__root__";

    // Cache hit : valeurs déjà résolues, une seule passe réseau par page / TTL.
    const hit = configCache.get(cacheKey);
    if (hit && hit.expires > Date.now()) {
      setState({ ...hit.value, loading: false });
      return;
    }

    async function load() {
      try {
        // 1. Site par slug (sauf démo sans slug)
        let site: SiteRow | null = null;
        if (slug) {
          const { data, error } = (await table("sites")
            .select("id, name, logo_url, primary_color")
            .eq("portal_slug", slug)
            .eq("is_active", true)
            .maybeSingle()) as unknown as QueryResult<SiteRow>;
          if (error) throw new Error("Lecture du site impossible : " + error.message);
          site = data;
        }

        if (!site && !isDemo) {
          if (!cancelled)
            setState((s) => ({
              ...s,
              loading: false,
              error: "Site introuvable ou inactif : config publiée requise.",
              enabledModules: null,
            }));
          return;
        }

        // 2. Config publiée + customizations + modules + pubs (une passe, tolérant RLS)
        let portalConfig: PortalConfigRow | null = null;
        let customizations: CustomizationRow[] = [];
        let moduleRows: ModuleRow[] = [];
        let enabledRows: EnabledModuleRow[] = [];
        let adRows: AdVideoRow[] = [];
        let partial = false;

        if (site) {
          // Deux requêtes séparées (un Promise.all de builders PostgREST fait
          // exploser l'inférence TS2589) — même sémantique, exécution parallèle conservée.
          // Colonnes explicites + projection typée : pas de `any` (contrat de colonnes).
          const cfgResP = table("portal_config")
            .select("id, portal_name, logo_url, theme_color, welcome_message")
            .eq("site_id", site.id)
            .eq("portal_status", "active")
            .maybeSingle() as unknown as QueryResult<PortalConfigRow>;
          const adsResP = table("ad_videos")
            .select("id, title, video_url, thumbnail_url, type")
            .eq("site_id", site.id)
            .eq("active", true)
            .order("priority", { ascending: true }) as unknown as QueryResult<AdVideoRow[]>;
          const cfgRes = await cfgResP;
          const adsRes = await adsResP;
          if (cfgRes.error || adsRes.error) partial = true;
          portalConfig = cfgRes.data || null;
          adRows = adsRes.data || [];

          if (portalConfig) {
            const custResP = table("portal_customizations")
              .select("customization_type, customization_data")
              .eq("portal_config_id", portalConfig.id)
              .eq("is_active", true) as unknown as QueryResult<CustomizationRow[]>;
            const modResP = table("portal_modules")
              .select("id, module_name")
              .eq("is_active", true) as unknown as QueryResult<ModuleRow[]>;
            const enResP = table("portal_enabled_modules")
              .select("module_id, is_enabled")
              .eq("portal_config_id", portalConfig.id) as unknown as QueryResult<EnabledModuleRow[]>;
            const custRes = await custResP;
            const modRes = await modResP;
            const enRes = await enResP;
            if (custRes.error || modRes.error || enRes.error) partial = true;
            customizations = custRes.data || [];
            moduleRows = modRes.data || [];
            enabledRows = enRes.data || [];
          }
        }

        if (cancelled) return;

        // 3. Customizations → welcome/support/engagement/durée/points
        const byType = (t: string): Record<string, unknown> => {
          const row = customizations.find((c) => c.customization_type === t);
          return asRecord(row?.customization_data);
        };

        const welcomeData = byType("welcome");
        const contactData = byType("contact");
        const journeyData = byType("journey");

        const welcomeFr =
          str(welcomeData.message_fr) ?? str(welcomeData.message_en) ?? portalConfig?.welcome_message ?? null;
        const welcomeEn =
          str(welcomeData.message_en) ?? str(welcomeData.message_fr) ?? portalConfig?.welcome_message ?? null;
        const welcomeMessage = welcomeFr || welcomeEn
          ? { fr: welcomeFr ?? "Bienvenue !", en: welcomeEn ?? "Welcome!" }
          : null;

        const supportContact = str(contactData.support);

        const rawEngagement = String(journeyData.engagement_type || "");
        const engagementType: EngagementKind | null =
          rawEngagement === "video" || rawEngagement === "quiz" || rawEngagement === "random"
            ? (rawEngagement as EngagementKind)
            : null;
        const sessionMinutes =
          typeof journeyData.session_minutes === "number" ? journeyData.session_minutes : null;
        const startingPoints =
          typeof journeyData.starting_points === "number" ? journeyData.starting_points : null;

        // 4. Gating des modules (join enabled ↔ catalogue)
        let enabledModules: PortalModuleGating;
        if (enabledRows.length > 0) {
          const catalogue = new Map(moduleRows.map((m) => [m.id, m.module_name]));
          const byName = new Set<string>(
            enabledRows
              .filter((row) => row.is_enabled === true)
              .map((row) => catalogue.get(row.module_id))
              .filter((name): name is string => typeof name === "string"),
          );
          enabledModules = {
            quiz: byName.has("quiz"),
            video: byName.has("video"),
            extend_time: byName.has("extend_time"),
            mini_games: byName.has("mini_games"),
            rewards: byName.has("rewards"),
            referral: byName.has("referral"),
            family: byName.has("family"),
            payment: byName.has("payment"),
          };
        } else {
          enabledModules = isDemo ? EMPTY_GATING_FALLBACK : MANDATORY_ONLY_GATING;
        }

        // 5. Slides & médias
        // Robustesse `ad_videos.type` (dette §7) : type inconnu/absent → déduit
        // de l'extension ; extension inconnue → "video" (VideoAd gère l'erreur).
        // `image` est un contrat backend à venir ; aujourd'hui un media sans
        // extension connue et non audio est traité en slide (rétro-compatible).
        const MEDIA_RE = /\.(mp3|m4a|ogg|wav|mp4|webm)(\?|$)/i;
        const slides: PortalAdSlide[] = adRows
          .filter((a) => isUsableMediaUrl(a.video_url) && !MEDIA_RE.test(a.video_url))
          .map((a) => ({
            id: a.id,
            imageUrl: a.video_url as string,
            fallbackUrl: a.thumbnail_url ?? undefined,
            title: { en: a.title ?? "", fr: a.title ?? "" },
            description: { en: "", fr: "" },
          }));
        const mediaAds: PortalMediaAd[] = adRows
          .filter((a) => isUsableMediaUrl(a.video_url) && MEDIA_RE.test(a.video_url))
          .map((a) => ({
            id: a.id,
            kind: inferMediaKind(a.video_url as string, a.type),
            url: a.video_url as string,
            thumbnailUrl: a.thumbnail_url ?? undefined,
            title: a.title ?? "",
          }));

        const value: PortalRuntimeConfig = {
          siteId: site?.id ?? null,
          siteName: site?.name ?? null,
          portalName: portalConfig?.portal_name ?? site?.name ?? null,
          logoUrl: portalConfig?.logo_url ?? site?.logo_url ?? null,
          themeColor: portalConfig?.theme_color ?? site?.primary_color ?? null,
          welcomeMessage,
          supportContact,
          sessionMinutes,
          startingPoints,
          engagementType,
          slides,
          mediaAds,
          enabledModules,
          isDemo,
          loading: false,
          error: null,
          source: isDemo ? (partial ? "demo-partial" : "demo-defaults") : partial ? "demo-partial" : "db",
        };
        configCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value });
        if (!cancelled) setState(value);
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Erreur de chargement de la configuration du portail.";
        setState((s) => ({
          ...s,
          loading: false,
          error: message,
          // Fail-closed : jamais de gating inventé en dehors de la démo
          enabledModules: s.isDemo ? EMPTY_GATING_FALLBACK : MANDATORY_ONLY_GATING,
        }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [siteSlug]);

  return state;
}
