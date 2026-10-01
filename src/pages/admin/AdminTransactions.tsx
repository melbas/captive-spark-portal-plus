import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Printer } from 'lucide-react';
import { useCurrentSite } from '@/context/SiteContext';
import { siteQueryKey } from '@/lib/admin/queries';
import { exportCSV } from '@/lib/report/exportCSV';
import { computePeriodTotals, filterByPeriod } from '@/lib/report/periodTotals';
import { exportPrintable } from '@/lib/report/exportPrintable';
import HelpTip from '@/components/admin/HelpTip';

export default function AdminTransactions() {
  const { currentSite, loading } = useCurrentSite();
  const siteId = currentSite?.id ?? null;

  const { data: transactions, isLoading } = useQuery({
    queryKey: siteQueryKey('admin-transactions', siteId),
    enabled: !!siteId,
    queryFn: async () => {
      // Transactions du site courant uniquement.
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('site_id', siteId as string)
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  // Totaux et tableau filtrés côté client sur la période choisie.
  const filtered = useMemo(
    () => filterByPeriod(transactions || [], 'created_at', { from: periodFrom || undefined, to: periodTo || undefined }),
    [transactions, periodFrom, periodTo],
  );
  const totals = useMemo(
    () =>
      computePeriodTotals(transactions || [], 'created_at', {
        from: periodFrom || undefined,
        to: periodTo || undefined,
        fields: ['amount_fcfa', 'commission_fcfa'],
      }),
    [transactions, periodFrom, periodTo],
  );

  const handleExport = () => {
    exportCSV(
      filtered.map((t: any) => ({
        id: t.id,
        amount_fcfa: t.amount_fcfa ?? 0,
        method: t.method || '',
        status: t.status || '',
        commission_fcfa: t.commission_fcfa ?? 0,
        created_at: t.created_at || '',
      })),
      `transactions-${currentSite?.name ?? 'site'}.csv`,
    );
  };

  const handlePrint = () => {
    exportPrintable({
      title: `Transactions – ${currentSite?.name ?? 'site'}`,
      subtitle:
        periodFrom || periodTo
          ? `Période : ${periodFrom || 'début'} → ${periodTo || 'aujourd’hui'}`
          : undefined,
      columns: ['Montant', 'Méthode', 'Statut', 'Commission', 'Date'],
      rows: filtered.map((t: any) => [
        `${(t.amount_fcfa || 0).toLocaleString('fr-FR')} FCFA`,
        t.method || '—',
        t.status || '—',
        `${(t.commission_fcfa || 0).toLocaleString('fr-FR')} FCFA`,
        t.created_at ? new Date(t.created_at).toLocaleString('fr-FR') : '—',
      ]),
    });
  };

  if (loading) return <p className="text-muted-foreground">Chargement du site courant…</p>;

  if (!currentSite) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Transactions</h1>
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Choisissez un site en haut de l’écran pour voir ses transactions." />
      </div>
    );
  }

  const statusColor = (s: string) => s === 'completed' ? 'default' : s === 'pending' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">Transactions</h1>
          <span className="text-sm text-muted-foreground">Site : {currentSite.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={filtered.length === 0}>
            <Printer className="h-4 w-4 mr-2" />Imprimer
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>
      </div>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <label htmlFor="period-from" className="text-sm text-muted-foreground">Du</label>
            <Input
              id="period-from"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="period-to" className="text-sm text-muted-foreground">Au</label>
            <Input
              id="period-to"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-40"
            />
          </div>
          {(periodFrom || periodTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setPeriodFrom(''); setPeriodTo(''); }}
            >
              Réinitialiser
            </Button>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-xl font-bold">{totals.count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total encaissé</p>
              <p className="text-xl font-bold">{totals.sums.amount_fcfa?.toLocaleString('fr-FR') ?? 0} FCFA</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commissions</p>
              <p className="text-xl font-bold">{totals.sums.commission_fcfa?.toLocaleString('fr-FR') ?? 0} FCFA</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune transaction</TableCell></TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-semibold">{(t.amount_fcfa || 0).toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell><Badge variant="outline">{t.method || '—'}</Badge></TableCell>
                  <TableCell><Badge variant={statusColor(t.status)}>{t.status}</Badge></TableCell>
                  <TableCell>{(t.commission_fcfa || 0).toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell className="text-sm">{t.created_at ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr }) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
