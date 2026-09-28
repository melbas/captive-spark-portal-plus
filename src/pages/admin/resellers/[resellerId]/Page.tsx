/**
 * Page détail d'un revendeur (route dynamique /admin/resellers/:resellerId) :
 * cartes de totaux (RevenueStats), sites rattachés avec revenus par site
 * (SitesList), breakdown des transactions par méthode de paiement, export CSV.
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { useCurrentSite } from '@/context/SiteContext';
import { exportCSV } from '@/lib/report/exportCSV';
import RevenueStats from '@/components/admin/resellers/RevenueStats';
import SitesList, { type SiteWithRevenue } from '@/components/admin/resellers/SitesList';

const METHOD_LABELS: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  cash: 'Espèces',
  card: 'Carte bancaire',
};

export default function ResellerDetailPage() {
  const { resellerId = '' } = useParams<{ resellerId: string }>();
  const { canEdit } = useCurrentSite();

  const resellerQuery = useQuery({
    queryKey: ['admin-reseller', resellerId],
    enabled: !!resellerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resellers')
        .select('id, name, email, phone, commission_rate, is_active')
        .eq('id', resellerId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Sites rattachés au revendeur (FK sites.reseller_id)
  const sitesQuery = useQuery({
    queryKey: ['admin-reseller-sites', resellerId],
    enabled: !!resellerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, portal_slug, location, is_active')
        .eq('reseller_id', resellerId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Transactions des sites de ce revendeur (join via la liste des site ids)
  const siteIds = useMemo(() => (sitesQuery.data || []).map((s) => s.id), [sitesQuery.data]);

  const transactionsQuery = useQuery({
    queryKey: ['admin-reseller-transactions', resellerId, siteIds.join(',')],
    enabled: siteIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, site_id, amount_fcfa, commission_fcfa, method, status, created_at')
        .in('site_id', siteIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const transactions = transactionsQuery.data || [];
  const sites = sitesQuery.data || [];

  const { sitesWithRevenue, byMethod } = useMemo(() => {
    const amountBySite = new Map<string, number>();
    for (const t of transactions) {
      if (!t.site_id) continue;
      amountBySite.set(t.site_id, (amountBySite.get(t.site_id) || 0) + (t.amount_fcfa || 0));
    }
    const sitesWithRevenue: SiteWithRevenue[] = sites.map((s) => ({
      id: s.id,
      name: s.name,
      portal_slug: s.portal_slug,
      location: s.location,
      is_active: s.is_active,
      revenue: amountBySite.get(s.id) || 0,
    }));
    const byMethod = new Map<string, { amount: number; count: number }>();
    for (const t of transactions) {
      const key = t.method || 'unknown';
      const entry = byMethod.get(key) || { amount: 0, count: 0 };
      entry.amount += t.amount_fcfa || 0;
      entry.count += 1;
      byMethod.set(key, entry);
    }
    return { sitesWithRevenue, byMethod: Array.from(byMethod.entries()) };
  }, [sites, transactions]);

  const rowsForExport = useMemo(
    () =>
      transactions.map((t) => ({
        site: sites.find((s) => s.id === t.site_id)?.name || t.site_id || '',
        montant_fcfa: t.amount_fcfa || 0,
        commission_fcfa: t.commission_fcfa || 0,
        methode: METHOD_LABELS[t.method || ''] || t.method || '',
        statut: t.status || '',
        date: t.created_at || '',
      })),
    [transactions, sites],
  );

  if (resellerQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement du revendeur…</p>;
  }
  if (resellerQuery.isError || !resellerQuery.data) {
    return <p className="text-destructive">Revendeur introuvable.</p>;
  }

  const r = resellerQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">{r.name}</h1>
          <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Actif' : 'Inactif'}</Badge>
          <span className="text-sm text-muted-foreground">Commission {r.commission_rate ?? 0}%</span>
          {!canEdit && <span className="text-sm text-muted-foreground">Lecture seule pour votre rôle.</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/resellers">← Retour</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportCSV(rowsForExport, `revendeur-${r.name}`)}
            disabled={rowsForExport.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>
      </div>

      <RevenueStats transactions={transactions} />

      <div>
        <h2 className="text-lg font-bold mb-3">Sites rattachés</h2>
        <SitesList sites={sitesWithRevenue} />
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Transactions par méthode de paiement</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byMethod.length === 0 ? (
            <p className="text-muted-foreground">Aucune transaction.</p>
          ) : (
            byMethod.map(([method, { amount, count }]) => (
              <Card key={method} className="rounded-2xl shadow-[var(--shadow-card)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {METHOD_LABELS[method] || method}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-extrabold">{amount.toLocaleString('fr-FR')} FCFA</p>
                  <p className="text-sm text-muted-foreground">{count} transaction(s)</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
