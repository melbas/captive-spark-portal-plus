/**
 * PlansTab — CRUD des forfaits Wi-Fi (wifi_plans) d'un site :
 * ajout, suppression, badge « populaire », réordonnancement (monter/descendre).
 * Réutilise les helpers de src/lib/admin/plans.ts (formatFcfa, formatDuration, sortPlans, validatePlan).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatFcfa,
  formatDuration,
  sortPlans,
  validatePlan,
} from '@/lib/admin/plans';

export interface AdminPlan {
  id: string;
  site_id: string | null;
  name: string;
  duration_minutes: number;
  price_fcfa: number | null;
  sort_order: number | null;
  is_popular: boolean | null;
  is_active: boolean | null;
}

interface PlansTabProps {
  siteId: string;
  canEdit?: boolean;
}

export default function PlansTab({ siteId, canEdit = true }: PlansTabProps) {
  const qc = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ['wifi_plans', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wifi_plans')
        .select('id, site_id, name, duration_minutes, price_fcfa, sort_order, is_popular, is_active')
        .eq('site_id', siteId);
      if (error) throw error;
      return (data ?? []) as AdminPlan[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['wifi_plans', siteId] });

  const createPlan = useMutation({
    mutationFn: async (input: { name: string; duration_minutes: number; price_fcfa: number; sort_order: number }) => {
      const { error } = await supabase.from('wifi_plans').insert({ site_id: siteId, ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Forfait ajouté.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminPlan> }) => {
      const { error } = await supabase.from('wifi_plans').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Forfait mis à jour.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wifi_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Forfait supprimé.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const plans = sortPlans(plansQuery.data ?? []);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= plans.length) return;
    const reordered = [...plans];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reordered.forEach((p, i) => {
      if ((p.sort_order ?? i) !== i) {
        updatePlan.mutate({ id: p.id, patch: { sort_order: i } });
      }
    });
  };

  const togglePopular = (plan: AdminPlan) => {
    updatePlan.mutate({ id: plan.id, patch: { is_popular: !plan.is_popular } });
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') ?? '');
    const duration = Number(fd.get('duration_minutes') ?? 0);
    const price = Number(fd.get('price_fcfa') ?? 0);
    const check = validatePlan({ name, duration_minutes: duration, price_fcfa: price });
    if (!check.ok) return toast.error(check.error ?? 'Forfait invalide.');
    createPlan.mutate({ name, duration_minutes: duration, price_fcfa: price, sort_order: plans.length });
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-6">
      <ul aria-label="Forfaits" className="space-y-2">
        {plansQuery.isLoading && <li className="text-sm text-muted-foreground">Chargement…</li>}
        {plans.map((plan, i) => (
          <li
            key={plan.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{plan.name}</span>
                {plan.is_popular && (
                  <Badge data-testid="popular-badge">
                    <Star className="mr-1 h-3 w-3" /> Populaire
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDuration(plan.duration_minutes)} · {formatFcfa(plan.price_fcfa ?? 0)}
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Monter ${plan.name}`}
                  disabled={i === 0 || updatePlan.isPending}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Descendre ${plan.name}`}
                  disabled={i === plans.length - 1 || updatePlan.isPending}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Populaire ${plan.name}`}
                  disabled={updatePlan.isPending}
                  onClick={() => togglePopular(plan)}
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer ${plan.name}`}
                  disabled={deletePlan.isPending}
                  onClick={() => deletePlan.mutate(plan.id)}
                >
                  {deletePlan.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Nom du forfait</Label>
              <Input id="plan-name" name="name" required disabled={createPlan.isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-duration">Durée (minutes)</Label>
              <Input
                id="plan-duration"
                name="duration_minutes"
                type="number"
                min={1}
                defaultValue={60}
                disabled={createPlan.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Prix (FCFA)</Label>
              <Input
                id="plan-price"
                name="price_fcfa"
                type="number"
                min={0}
                defaultValue={0}
                disabled={createPlan.isPending}
              />
            </div>
          </div>
          <Button type="submit" disabled={createPlan.isPending}>
            {createPlan.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Ajouter
          </Button>
        </form>
      )}
    </div>
  );
}
