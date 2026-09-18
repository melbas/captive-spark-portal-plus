/**
 * Valeurs par défaut du portail — UNIQUEMENT pour le site démo isolé (/portal/demo).
 *
 * Règle (contrat PLAN-FINAL §4 + correction produit) :
 *  - En démo isolée, ces valeurs permettent au portail de fonctionner sans config publiée.
 *  - Sur tout VRAI site, l'absence de config publiée est une ERREUR (fail-closed) :
 *    on n'affiche PAS de fallback visuel, on affiche l'état d'erreur.
 *  - Aucun accès réseau / paiement réussi n'est simulé en réel : les éléments
 *    non raccordés sont masqués, jamais présentés comme fonctionnels.
 */

export interface LocalizedText {
  en: string;
  fr: string;
}

export interface DemoAdSlide {
  id: string;
  imageUrl: string;
  fallbackUrl?: string;
  title: LocalizedText;
  description: LocalizedText;
  link?: string;
}

/** Slides pub de la démo (source actuelle : WifiPortalContainer, hardcodés). */
export const DEMO_AD_SLIDES: DemoAdSlide[] = [
  {
    id: "ad1",
    imageUrl: "/lovable-uploads/188625b4-1006-40a3-9d8f-4406793e432a.png",
    fallbackUrl:
      "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?auto=format&fit=crop&w=800&h=400",
    title: { en: "High-Speed WiFi Access", fr: "Accès WiFi Haut Débit" },
    description: {
      en: "Connect instantly to our nationwide network",
      fr: "Connectez-vous instantanément à notre réseau national",
    },
    link: "#wifi-plans",
  },
  {
    id: "ad2",
    imageUrl: "/lovable-uploads/6d63d396-05e7-4d74-9fa2-4e65d7539370.png",
    fallbackUrl:
      "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&h=400",
    title: { en: "WiFi for Business", fr: "WiFi pour Entreprises" },
    description: {
      en: "Reliable connectivity for your company",
      fr: "Connectivité fiable pour votre entreprise",
    },
    link: "#business-wifi",
  },
  {
    id: "ad3",
    imageUrl: "/lovable-uploads/a07006bb-2820-445b-ac39-fb06d95be8fe.png",
    fallbackUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=400",
    title: { en: "Home WiFi Solutions", fr: "Solutions WiFi Domicile" },
    description: {
      en: "Stay connected at home with our premium plans",
      fr: "Restez connecté chez vous avec nos forfaits premium",
    },
    link: "#home-wifi",
  },
  {
    id: "ad4",
    imageUrl: "/lovable-uploads/34c1a509-4608-4a3e-bcff-29e71eff2849.png",
    fallbackUrl:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&h=400",
    title: { en: "Mobile WiFi Access", fr: "Accès WiFi Mobile" },
    description: {
      en: "Take your connection anywhere in Senegal",
      fr: "Emportez votre connexion partout au Sénégal",
    },
    link: "#mobile-wifi",
  },
];

/** Vidéo pub de démo (actuellement hardcodée dans WifiPortalContainer, sample-videos.com). */
export const DEMO_VIDEO_AD = {
  videoUrl:
    "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
  poster:
    "https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=800&h=450",
  title: {
    en: "Upgrade Your WiFi Experience",
    fr: "Améliorez votre expérience WiFi",
  },
  description: {
    en: "Faster speeds, better coverage",
    fr: "Vitesses plus rapides, meilleure couverture",
  },
};

/** Audio promo de démo (actuellement hardcodé, SoundHelix). */
export const DEMO_AUDIO_AD = {
  audioUrl:
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  coverImage:
    "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?auto=format&fit=crop&w=200&h=200",
  title: { en: "Special WiFi Offer", fr: "Offre WiFi Spéciale" },
  subtitle: {
    en: "Listen to learn about our latest deals",
    fr: "Écoutez pour découvrir nos dernières offres",
  },
};

/** Durée de session accordée à l'authentification (minutes) — aujourd'hui `30` hardcodé. */
export const DEMO_SESSION_MINUTES = 30;

/** Points de départ d'un nouvel utilisateur — aujourd'hui `10` hardcodé. */
export const DEMO_STARTING_POINTS = 10;

/** Type d'engagement de la démo — déterministe (fini Math.random()) pour des tests reproductibles. */
export type EngagementKind = "video" | "quiz" | "random";
export const DEMO_ENGAGEMENT_TYPE: EngagementKind = "quiz";

/** Contact support générique (WhatsApp supprimé — décision produit 62e816f). */
export const DEMO_SUPPORT_CONTACT = "support@sparkwifi.example";

/**
 * Clés de modules du parcours utilisées pour le gating côté portail.
 * Doivent correspondre à `portal_modules.module_name` (catalogue seedé, 12 modules).
 */
export type PortalModuleKey =
  | "quiz"
  | "video"
  | "extend_time"
  | "mini_games"
  | "rewards"
  | "referral"
  | "learning_center"
  | "payment";

/** État de gating : `null` = aucune config publiée (fail-closed sur un vrai site). */
export type PortalModuleGating = Record<PortalModuleKey, boolean> | null;

/** Gating complet (démo sans config). */
export const ALL_MODULES_ENABLED: PortalModuleGating = {
  quiz: true,
  video: true,
  extend_time: true,
  mini_games: true,
  rewards: true,
  referral: true,
  learning_center: true,
  payment: true,
};

/**
 * Fail-closed : sur un vrai site sans config publiée, seuls les modules
 * obligatoires du parcours restent visibles. Rien n'est simulé.
 */
export const MANDATORY_ONLY_GATING: PortalModuleGating = {
  quiz: true,
  video: true,
  extend_time: true,
  mini_games: false,
  rewards: false,
  referral: false,
  learning_center: false,
  payment: false,
};
