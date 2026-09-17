import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCurrentSite } from '@/context/SiteContext';
import { siteQueryKey } from '@/lib/admin/queries';
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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Transactions</h1>
        <span className="text-sm text-muted-foreground">Site : {currentSite.name}</span>
      </div>
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
              ) : (transactions || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune transaction</TableCell></TableRow>
              ) : (transactions || []).map((t) => (
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
