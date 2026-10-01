/**
 * GameForm — création d'un mini-jeu pour un site : titre, type, description,
 * récompenses (points + minutes), catégorie.
 *
 * Table : `games` (schéma `archive` depuis 2026-09-28-004 ; accès via une vue
 * `public.*` de compatibilité recréée par
 * 2026-09-28-005_restore_quiz_games_rewards.sql). La colonne `site_id`
 * (uuid → sites.id) est ajoutée par la même migration : elle scrope chaque
 * jeu à son site, comme `ad_videos.site_id`.
 *
 * Styles de requêtes react-query : même pattern que PlansTab / AdsCarousel.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const GAME_TYPES = ['memory', 'quiz', 'puzzle', 'tap'] as const;
export type GameType = (typeof GAME_TYPES)[number];

const GAME_TYPE_LABELS: Record<GameType, string> = {
  memory: 'Memory',
  quiz: 'Quiz rapide',
  puzzle: 'Puzzle',
  tap: 'Jeu de tap',
};

interface GameFormProps {
  /** sites.id (uuid textuel en base). */
  siteId: string;
  /** Désactive le formulaire (viewer ou mutation en cours). */
  canEdit?: boolean;
  /** Appelé après création réussie (pour recharger la liste parente). */
  onCreated?: () => void;
}

export default function GameForm({ siteId, canEdit = true, onCreated }: GameFormProps) {
  const qc = useQueryClient();

  const createGame = useMutation({
    mutationFn: async (input: {
      title: string;
      game_type: GameType;
      description: string;
      points_reward: number;
      minutes_reward: number;
      category: string;
    }) => {
      const { error } = await (supabase.from('games') as unknown as {
        insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
      }).insert({
        site_id: siteId,
        title: input.title,
        game_type: input.game_type,
        description: input.description || null,
        points_reward: input.points_reward,
        minutes_reward: input.minutes_reward,
        category: input.category || null,
        config: {},
        active: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['games', siteId] });
      toast.success('Jeu créé.');
      onCreated?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit || createGame.isPending) return;
    const fd = new FormData(e.currentTarget);
    createGame.mutate({
      title: String(fd.get('title') ?? '').trim(),
      game_type: String(fd.get('game_type') ?? 'memory') as GameType,
      description: String(fd.get('description') ?? '').trim(),
      points_reward: Number(fd.get('points_reward') ?? 0),
      minutes_reward: Number(fd.get('minutes_reward') ?? 0),
      category: String(fd.get('category') ?? '').trim(),
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
          <Label htmlFor="game-title">Titre du jeu</Label>
          <Input id="game-title" name="title" required disabled={createGame.isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-type">Type de jeu</Label>
          <select
            id="game-type"
            name="game_type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue="memory"
            disabled={createGame.isPending}
          >
            {GAME_TYPES.map((t) => (
              <option key={t} value={t}>
                {GAME_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="game-description">Description</Label>
        <Input id="game-description" name="description" disabled={createGame.isPending} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="game-points">Points gagnés</Label>
          <Input
            id="game-points"
            name="points_reward"
            type="number"
            min={0}
            defaultValue={0}
            disabled={createGame.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-minutes">Minutes gagnées</Label>
          <Input
            id="game-minutes"
            name="minutes_reward"
            type="number"
            min={0}
            defaultValue={0}
            disabled={createGame.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-category">Catégorie</Label>
          <Input id="game-category" name="category" disabled={createGame.isPending} />
        </div>
      </div>

      <Button type="submit" disabled={createGame.isPending}>
        {createGame.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Créer le jeu
      </Button>
    </form>
  );
}
