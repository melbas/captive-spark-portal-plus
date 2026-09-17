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

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Eye, MousePointerClick, CheckCircle2, TrendingUp } from 'lucide-react';
import { useCurrentSite } from '@/context/SiteContext';
import { siteQueryKey } from '@/lib/admin/queries';
import HelpTip from '@/components/admin/HelpTip';
interface AdRow {
  id: string;
  title: string;
  type: string | null;
  priority: number;
  active: boolean;
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
        <h1 className="text-2xl font-extrabold">Publicités — suivi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vues, taux de complétion et clics des médias du portail (site : {currentSite.name}).
        </p>
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
              Aucune publicité sur ce site. Ajoutez-en via la table <code>ad_videos</code> (CRUD à venir).
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
                    <th className="py-2">Statut</th>
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
                      <td className="py-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${r.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {r.active ? 'Active' : 'Inactive'}
                        </span>
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
    </div>
  );
}
