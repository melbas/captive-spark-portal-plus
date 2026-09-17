/**
 * Logique « Forfaits » (table wifi_plans, colonnes *_fcfa/_min/_mb, cf. schéma live).
 */
export interface PlanLike {
  name: string;
  sort_order: number;
  is_popular: boolean;
}

export function formatFcfa(priceFcfa: number): string {
  if (!priceFcfa || priceFcfa <= 0) return 'Gratuit';
  return `${priceFcfa.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`;
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m}`;
}

export function sortPlans<T extends PlanLike>(plans: T[] | null | undefined): T[] {
  return [...(plans ?? [])].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      Number(b.is_popular ?? false) - Number(a.is_popular ?? false),
  );
}

export interface PlanInput {
  name: string;
  duration_minutes: number;
  price_fcfa: number;
}

export function validatePlan(
  p: PlanInput,
): { ok: boolean; error?: string } {
  if (!p.name || !p.name.trim()) return { ok: false, error: 'Le nom du forfait est requis.' };
  if (!p.duration_minutes || p.duration_minutes <= 0)
    return { ok: false, error: 'La durée doit être supérieure à 0.' };
  if (p.price_fcfa == null || p.price_fcfa < 0)
    return { ok: false, error: 'Le prix ne peut pas être négatif.' };
  return { ok: true };
}
