/**
 * AdsCarousel — CRUD des contenus pubs (slides, vidéos, audios) d'un site
 * via la table `ad_videos` (type image/video/audio).
 *
 * Réutilise le schéma existant (même table que AdminAds.tsx) : la colonne
 * `priority` sert de poids pour l'ordre d'affichage (desc), `active` est le
 * toggle de visibilité. Les médias sont référencés par URL — l'upload
 * Storage (bucket `ads`) est volontairement hors périmètre pour l'instant
 * (décision facturation documentée dans AdminAds.tsx).
 *
 * Props `siteId` (+ `canEdit`) : réutilisable depuis la page détail d'un site
 * (/admin/sites/:siteId) ou toute autre surface admin.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export interface AdRow {
  id: string;
  site_id: string | null;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  type: string | null;
  priority: number | null;
  active: boolean | null;
}

interface AdsCarouselProps {
  siteId: string;
  canEdit?: boolean;
}

interface AdDraft {
  title: string;
  video_url: string;
  type: 'image' | 'video' | 'audio';
  priority: number;
}

async function fetchAds(siteId: string): Promise<AdRow[]> {
  // Non typé : les types générés Supabase provoquent un TS2589 sur ad_videos
  // (même workaround que AdminAds.tsx tant que la migration 20260918010000
  // n'est pas intégrée dans types.ts).
  const res = await (supabase.from('ad_videos') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => PromiseLike<{
          data: unknown[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  })
    .select('*')
    .eq('site_id', siteId)
    .order('priority', { ascending: false });
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as unknown as AdRow[];
}

export default function AdsCarousel({ siteId, canEdit = true }: AdsCarouselProps) {
  const qc = useQueryClient();

  const adsQuery = useQuery({
    queryKey: ['ad_videos', siteId],
    queryFn: () => fetchAds(siteId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ad_videos', siteId] });

  const updateAd = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdRow> }) => {
      const res = await (supabase.from('ad_videos') as unknown as {
        update: (row: Record<string, unknown>) => {
          eq: (col: string, val: string) => PromiseLike<{ error: { message: string } | null }>;
        };
      })
        .update(patch as Record<string, unknown>)
        .eq('id', id);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Publicité mise à jour.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAd = useMutation({
    mutationFn: async (draft: AdDraft) => {
      const res = await (supabase.from('ad_videos') as unknown as {
        insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
      }).insert({
        site_id: siteId,
        title: draft.title,
        video_url: draft.video_url,
        thumbnail_url: null,
        type: draft.type,
        priority: draft.priority,
        active: true,
      });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Publicité créée.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const res = await (supabase.from('ad_videos') as unknown as {
        delete: () => {
          eq: (col: string, val: string) => PromiseLike<{ error: { message: string } | null }>;
        };
      })
        .delete()
        .eq('id', id);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Publicité supprimée.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ads = [...(adsQuery.data ?? [])].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  if (adsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des publicités…
      </div>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Publicités du site (slides, vidéos, audios)</CardTitle>
        {canEdit && (
          <Button
            size="sm"
            onClick={() =>
              createAd.mutate({
                title: 'Nouvelle publicité',
                video_url: 'https://example.com/media',
                type: 'image',
                priority: 0,
              })
            }
            disabled={createAd.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {ads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucune publicité sur ce site.
          </p>
        ) : (
          <ul className="space-y-3">
            {ads.map((ad) => (
              <li
                key={ad.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p data-testid="ad-title" className="truncate font-medium">{ad.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="capitalize">{ad.type ?? '—'}</span> — {ad.video_url}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`ad-priority-${ad.id}`} className="text-xs text-muted-foreground">
                    Poids
                  </Label>
                  <Input
                    id={`ad-priority-${ad.id}`}
                    type="number"
                    className="w-20 h-8"
                    defaultValue={ad.priority ?? 0}
                    disabled={!canEdit}
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      if (next !== (ad.priority ?? 0)) {
                        updateAd.mutate({ id: ad.id, patch: { priority: next } });
                      }
                    }}
                  />
                </div>
                <Switch
                  checked={!!ad.active}
                  disabled={!canEdit}
                  onCheckedChange={(next) => updateAd.mutate({ id: ad.id, patch: { active: next } })}
                  aria-label={`Activer ${ad.title}`}
                />
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    disabled={deleteAd.isPending}
                    onClick={() => {
                      if (window.confirm(`Supprimer « ${ad.title} » ? Cette action est définitive.`)) {
                        deleteAd.mutate(ad.id);
                      }
                    }}
                    aria-label={`Supprimer ${ad.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
