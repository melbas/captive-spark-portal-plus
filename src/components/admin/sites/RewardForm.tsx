/**
 * RewardForm — création d'une récompense pour un site : nom, type,
 * coût en points, valeur (minutes de Wi-Fi, code promo, etc.).
 *
 * Table : `rewards` (schéma `archive` depuis 2026-09-28-004 ; accès via une
 * vue `public.*` de compatibilité recréée par
 * 2026-09-28-005_restore_quiz_games_rewards.sql). La colonne `site_id`
 * (uuid → sites.id) est ajoutée par la même migration : elle scrope chaque
 * récompense à son site, comme `ad_videos.site_id`.
 *
 * Styles de requêtes react-query : même pattern que PlansTab / AdsCarousel.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const REWARD_TYPES = ['time', 'discount', 'gift', 'promo'] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  time: 'Temps Wi-Fi',
  discount: 'Réduction',
  gift: 'Cadeau',
  promo: 'Code promo',
};

interface RewardFormProps {
  /** sites.id (uuid textuel en base). */
  siteId: string;
  /** Désactive le formulaire (viewer ou mutation en cours). */
  canEdit?: boolean;
  /** Appelé après création réussie (pour recharger la liste parente). */
  onCreated?: () => void;
}

export default function RewardForm({ siteId, canEdit = true, onCreated }: RewardFormProps) {
  const qc = useQueryClient();

  const createReward = useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      reward_type: RewardType;
      points_cost: number;
      value: string;
    }) => {
      const { error } = await (supabase.from('rewards') as unknown as {
        insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
      }).insert({
        site_id: siteId,
        name: input.name,
        description: input.description || null,
        reward_type: input.reward_type,
        points_cost: input.points_cost,
        value: input.value,
        active: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', siteId] });
      toast.success('Récompense créée.');
      onCreated?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit || createReward.isPending) return;
    const fd = new FormData(e.currentTarget);
    const value = String(fd.get('value') ?? '').trim();
    if (!value) {
      toast.error('Indiquez la valeur de la récompense.');
      return;
    }
    createReward.mutate({
      name: String(fd.get('name') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
      reward_type: String(fd.get('reward_type') ?? 'time') as RewardType,
      points_cost: Number(fd.get('points_cost') ?? 0),
      value,
    });
    e.currentTarget.reset();
  };

  if (!canEdit) {
    return <p className="text-sm text-muted-foreground">Lecture seule — modification impossible.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reward-name">Nom de la récompense</Label>
          <Input id="reward-name" name="name" required disabled={createReward.isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reward-type">Type de récompense</Label>
          <select
            id="reward-type"
            name="reward_type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue="time"
            disabled={createReward.isPending}
          >
            {REWARD_TYPES.map((t) => (
              <option key={t} value={t}>
                {REWARD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reward-description">Description</Label>
        <Input id="reward-description" name="description" disabled={createReward.isPending} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reward-cost">Coût en points</Label>
          <Input
            id="reward-cost"
            name="points_cost"
            type="number"
            min={1}
            defaultValue={100}
            disabled={createReward.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reward-value">Valeur</Label>
          <Input
            id="reward-value"
            name="value"
            placeholder="ex. 30 min"
            required
            disabled={createReward.isPending}
          />
        </div>
      </div>

      <Button type="submit" disabled={createReward.isPending}>
        {createReward.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Créer la récompense
      </Button>
    </form>
  );
}
