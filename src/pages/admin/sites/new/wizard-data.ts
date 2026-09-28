/**
 * wizard-data — types + preset de forfaits partagés par le wizard « Créer un site ».
 * Preset FCFA réaliste (cohérent avec les valeurs affichées côté portail).
 */
export interface WizardPlan {
  name: string;
  duration_minutes: number;
  price_fcfa: number;
  /** Coché = le forfait sera créé avec le site. */
  selected: boolean;
}

export interface WizardData {
  name: string;
  portal_slug: string;
  location: string;
  logo_url: string;
  primary_color: string;
  welcome_msg: string;
  whatsapp_support: string;
  plans: WizardPlan[];
}

/** Forfaits proposés par défaut à l'étape 4 (éditables par l'admin). */
export const DEFAULT_PLANS_PRESET: WizardPlan[] = [
  { name: 'Essai 30 min', duration_minutes: 30, price_fcfa: 100, selected: true },
  { name: 'Session 2 h', duration_minutes: 120, price_fcfa: 300, selected: true },
  { name: 'Journée', duration_minutes: 1440, price_fcfa: 500, selected: true },
];
