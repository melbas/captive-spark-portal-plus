/**
 * PAGE MARKETING / PUBLICITÉS — suivi des pubs (vues, complétions, clics).
 *
 * Lit la vue `events` agrégée par pub. Les métriques proviennent de l'Edge
 * `track-event` : historiquement JAMAIS alimenté, le portail n'avait aucune
 * mesure de fonctionnement.
 *
 * Périmètre : site courant uniquement (useCurrentSite). RLS events filtre
 * déjà par site via is_admin_user()/site_id.
 *
 * Évolution future : AdminAds (CRUD des pubs + upload médias bucket
 * site-assets) — pour l'instant la création se fait en base.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Eye, MousePointerClick, CheckCircle2, TrendingUp, Plus, Pencil, Trash2, AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCurrentSite } from '@/context/SiteContext';
import { siteQueryKey } from '@/lib/admin/queries';
import HelpTip from '@/components/admin/HelpTip';
interface AdRow {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  type: string | null;
  priority: number;
  active: boolean;
  skip_after_seconds: number | null;
  min_view_percentage: number | null;
}

// Payload de création/édition. Pas d'upload : l'URL est saisie (hébergement
// externe — Cloudflare Stream, Vimeo, etc.) pour éviter la facturation
// Storage tant que la consommation réelle n'est pas mesurée.
interface AdForm {
  title: string;
  video_url: string;
  thumbnail_url?: string;
  type: 'video' | 'audio' | 'image';
  priority: number;
  skip_after_seconds: number;
  min_view_percentage: number;
}

interface AdMetrics {
  views: number;
  completions: number;
  clicks: number;
  skips: number;
  unique_viewers: number;
}

// Encapsule l'appel Supabase pour casser l'inférence de type trop profonde
// (TS2589 sur les types générés Supabase — `events.event_data` est un type
// Json récursif). On typage explicite minimal à la place des types générés.
type EventRow = { event_type: string; event_data: Record<string, unknown> | null };

async function queryAds(siteId: string): Promise<AdRow[]> {
  // Non typé : les types générés Supabase provoquent un TS2589 (inférence
  // excessively deep) sur `ad_videos` tant que la migration 20260918010000
  // n'a pas été intégrée dans types.ts. Les colonnes sont castées à la main.
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

// Opérations d'écriture (CRUD). Même workaround de typage.
type AdMutationResult = { error: { message: string } | null };

async function insertAd(siteId: string, form: AdForm): Promise<string | null> {
  const res = await (supabase.from('ad_videos') as unknown as {
    insert: (row: Record<string, unknown>) => PromiseLike<AdMutationResult>;
  }).insert({
    site_id: siteId,
    title: form.title,
    video_url: form.video_url,
    thumbnail_url: form.thumbnail_url || null,
    type: form.type,
    priority: form.priority,
    skip_after_seconds: form.skip_after_seconds || 0,
    min_view_percentage: form.min_view_percentage || 80,
    active: true,
  });
  if (res.error) return res.error.message;
  return null;
}

async function updateAd(adId: string, form: Partial<AdForm>): Promise<string | null> {
  const res = await (supabase.from('ad_videos') as unknown as {
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => PromiseLike<AdMutationResult>;
    };
  })
    .update({
      title: form.title,
      video_url: form.video_url,
      thumbnail_url: form.thumbnail_url || null,
      type: form.type,
      priority: form.priority,
      skip_after_seconds: form.skip_after_seconds ?? 0,
      min_view_percentage: form.min_view_percentage ?? 80,
    })
    .eq('id', adId);
  if (res.error) return res.error.message;
  return null;
}

async function setAdActive(adId: string, active: boolean): Promise<string | null> {
  const res = await (supabase.from('ad_videos') as unknown as {
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => PromiseLike<AdMutationResult>;
    };
  })
    .update({ active })
    .eq('id', adId);
  if (res.error) return res.error.message;
  return null;
}

async function deleteAd(adId: string): Promise<string | null> {
  const res = await (supabase.from('ad_videos') as unknown as {
    delete: () => {
      eq: (col: string, val: string) => PromiseLike<AdMutationResult>;
    };
  })
    .delete()
    .eq('id', adId);
  if (res.error) return res.error.message;
  return null;
}

async function queryAdMetrics(siteId: string): Promise<Map<string, AdMetrics>> {
  const res = await (supabase.from('events') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        in: (col: string, vals: string[]) => PromiseLike<{
          data: EventRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  })
    .select('event_type, event_data')
    .eq('site_id', siteId)
    .in('event_type', ['ad_view', 'ad_click', 'ad_skip', 'ad_progress']);

  if (res.error) throw new Error(res.error.message);
  const rows = res.data ?? [];
  const byAd = new Map<string, AdMetrics>();
  const metricsOf = (id: string): AdMetrics => {
    let m = byAd.get(id);
    if (!m) {
      m = { views: 0, completions: 0, clicks: 0, skips: 0, unique_viewers: 0 };
      byAd.set(id, m);
    }
    return m;
  };

  rows.forEach((ev) => {
    const ed = (ev.event_data ?? {}) as Record<string, unknown>;
    const adId = ed.ad_id as string | undefined;
    if (!adId) return;
    const m = metricsOf(adId);
    switch (ev.event_type) {
      case 'ad_view': m.views++; break;
      case 'ad_click': m.clicks++; break;
      case 'ad_skip': m.skips++; break;
      case 'ad_progress':
        // Une completion = 100% de visionnage
        if (ed.percentage === 100) m.completions++;
        break;
    }
  });

  return byAd;
}

export default function AdminAds() {
  const { currentSite, loading } = useCurrentSite();
  const siteId = currentSite?.id ?? null;
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AdForm>({
    title: '',
    video_url: '',
    thumbnail_url: '',
    type: 'video',
    priority: 0,
    skip_after_seconds: 0,
    min_view_percentage: 80,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: siteQueryKey('admin-ads', siteId) });

  const openCreate = () => {
    setEditingAd(null);
    setForm({
      title: '', video_url: '', thumbnail_url: '', type: 'video',
      priority: 0, skip_after_seconds: 0, min_view_percentage: 80,
    });
    setDialogOpen(true);
  };

  const openEdit = (ad: AdRow) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      video_url: ad.video_url,
      thumbnail_url: ad.thumbnail_url ?? '',
      type: (ad.type as 'video' | 'audio' | 'image') ?? 'video',
      priority: ad.priority ?? 0,
      skip_after_seconds: ad.skip_after_seconds ?? 0,
      min_view_percentage: ad.min_view_percentage ?? 80,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.video_url.trim()) {
      toast.error('Titre et URL du média sont obligatoires');
      return;
    }
    if (!/^https?:\/\/.+/.test(form.video_url.trim())) {
      toast.error("L'URL doit commencer par http:// ou https://");
      return;
    }
    setSaving(true);
    try {
      const err = editingAd
        ? await updateAd(editingAd.id, form)
        : await insertAd(siteId as string, form);
      if (err) {
        toast.error(err);
        return;
      }
      toast.success(editingAd ? 'Publicité mise à jour' : 'Publicité créée');
      setDialogOpen(false);
      await invalidate();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ad: AdRow, next: boolean) => {
    const err = await setAdActive(ad.id, next);
    if (err) { toast.error(err); return; }
    toast.success(next ? 'Publicité activée' : 'Publicité désactivée');
    await invalidate();
  };

  const handleDelete = async (ad: AdRow) => {
    if (!confirm(`Supprimer « ${ad.title} » ? Cette action est définitive.`)) return;
    const err = await deleteAd(ad.id);
    if (err) { toast.error(err); return; }
    toast.success('Publicité supprimée');
    await invalidate();
  };

  // Catalogue des pubs du site
  const adsQuery = useQuery({
    queryKey: siteQueryKey('admin-ads', siteId),
    enabled: !!siteId,
    queryFn: () => queryAds(siteId as string),
  });

  // Métriques : aggregation directe des events (fiable, pas de table à sync)
  const metricsQuery = useQuery({
    queryKey: siteQueryKey('admin-ads-metrics', siteId),
    enabled: !!siteId,
    queryFn: () => queryAdMetrics(siteId as string),
  });

  if (loading) return <p className="text-muted-foreground">Chargement du site courant…</p>;

  if (!currentSite) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Publicités</h1>
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Sélectionnez un site dans le sélecteur pour voir ses publicités et leur suivi."
        />
      </div>
    );
  }

  const ads = adsQuery.data ?? [];
  const metrics = metricsQuery.data ?? new Map<string, AdMetrics>();

  const rows = ads.map((ad) => {
    const m = metrics.get(ad.id) ?? {
      views: 0, completions: 0, clicks: 0, skips: 0, unique_viewers: 0,
    };
    const completionRate = m.views > 0
      ? Math.round((m.completions / m.views) * 100)
      : 0;
    const ctr = m.views > 0 ? Math.round((m.clicks / m.views) * 100) : 0;
    return { ...ad, ...m, completionRate, ctr };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      completions: acc.completions + r.completions,
      clicks: acc.clicks + r.clicks,
    }),
    { views: 0, completions: 0, clicks: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Publicités — suivi</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vues, taux de complétion et clics des médias du portail (site : {currentSite.name}).
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle publicité
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vues</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totals.views}</p></CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Visionnages complets</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totals.completions}</p></CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clics</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totals.clicks}</p></CardContent>
        </Card>
      </div>

      {/* Tableau détaillé */}
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Détail par publicité</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucune publicité sur ce site. Cliquez sur « Nouvelle publicité ».
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Titre</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Vues</th>
                    <th className="py-2 pr-4">Complétion</th>
                    <th className="py-2 pr-4">Clics</th>
                    <th className="py-2 pr-4">CTR</th>
                    <th className="py-2 pr-4">Active</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{r.title}</td>
                      <td className="py-2 pr-4 capitalize">{r.type ?? '—'}</td>
                      <td className="py-2 pr-4">{r.views}</td>
                      <td className="py-2 pr-4">
                        <span className={r.completionRate >= 50 ? 'text-green-600 font-medium' : ''}>
                          {r.completionRate}%
                        </span>
                      </td>
                      <td className="py-2 pr-4">{r.clicks}</td>
                      <td className="py-2 pr-4">{r.ctr}%</td>
                      <td className="py-2 pr-4">
                        <Switch
                          checked={r.active}
                          onCheckedChange={(next) => handleToggle(r, next)}
                          aria-label={`Activer ${r.title}`}
                        />
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => openEdit(r)}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-red-600"
                            onClick={() => handleDelete(r)}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Graphique : vues par pub */}
      {rows.length > 0 && (
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Vues par publicité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="title"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="views" name="Vues" fill="#5B4DFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? 'Modifier la publicité' : 'Nouvelle publicité'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ad-title">Titre *</Label>
              <Input
                id="ad-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Promo rentrée scolaire"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-url">URL du média *</Label>
              <Input
                id="ad-url"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://.../promo.mp4"
                inputMode="url"
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Hébergez le média à l'extérieur (Cloudflare Stream, Vimeo, votre
                serveur) et collez l'URL. Aucun upload pour l'instant — la
                facturation Storage reste à évaluer selon la consommation réelle.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-thumb">URL de la miniature (optionnel)</Label>
              <Input
                id="ad-thumb"
                value={form.thumbnail_url}
                onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                placeholder="https://.../poster.jpg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ad-type">Type de média</Label>
                <select
                  id="ad-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as 'video' | 'audio' | 'image' })
                  }
                >
                  <option value="video">Vidéo</option>
                  <option value="audio">Audio (voix-off)</option>
                  <option value="image">Image</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-priority">Priorité (ordre d'affichage)</Label>
                <Input
                  id="ad-priority"
                  type="number"
                  min={0}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ad-min">Visionnage requis (%)</Label>
                <Input
                  id="ad-min"
                  type="number"
                  min={0}
                  max={100}
                  value={form.min_view_percentage}
                  onChange={(e) =>
                    setForm({ ...form, min_view_percentage: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Pourcentage minimum pour valider la pub.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-skip">Saut autorisé après (s)</Label>
                <Input
                  id="ad-skip"
                  type="number"
                  min={0}
                  value={form.skip_after_seconds}
                  onChange={(e) =>
                    setForm({ ...form, skip_after_seconds: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">0 = non skippable.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : editingAd ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
