import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Download, Printer } from 'lucide-react';
import { useCurrentSite } from '@/context/SiteContext';
import { siteQueryKey } from '@/lib/admin/queries';
import { exportCSV } from '@/lib/report/exportCSV';
import { filterByPeriod } from '@/lib/report/periodTotals';
import { exportPrintable } from '@/lib/report/exportPrintable';
import HelpTip from '@/components/admin/HelpTip';

export default function AdminSessions() {
  const qc = useQueryClient();
  const { currentSite, canEdit, loading } = useCurrentSite();
  const siteId = currentSite?.id ?? null;

  const { data: sessions, isLoading } = useQuery({
    queryKey: siteQueryKey('admin-sessions', siteId),
    refetchInterval: 30000,
    enabled: !!siteId,
    queryFn: async () => {
      // Sessions du site courant uniquement (jamais de requête non scopée).
      const { data } = await supabase
        .from('wifi_sessions')
        .select('*')
        .eq('site_id', siteId as string)
        .order('started_at', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const endSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wifi_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: siteQueryKey('admin-sessions', siteId) });
      toast.success('Session terminée');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  // Filtrage par période côté client sur started_at (données déjà chargées).
  const filtered = useMemo(
    () => filterByPeriod(sessions || [], 'started_at', { from: periodFrom || undefined, to: periodTo || undefined }),
    [sessions, periodFrom, periodTo],
  );

  const handleExport = () => {
    exportCSV(
      filtered.map((s: any) => ({
        id: s.id,
        mac_address: s.mac_address || '',
        ssid: s.ssid || '',
        status: s.status || 'active',
        started_at: s.started_at || '',
        expires_at: s.expires_at || '',
        ended_at: s.ended_at || '',
      })),
      `sessions-${currentSite?.name ?? 'site'}.csv`,
    );
  };

  const handlePrint = () => {
    exportPrintable({
      title: `Sessions WiFi – ${currentSite?.name ?? 'site'}`,
      subtitle:
        periodFrom || periodTo
          ? `Période : ${periodFrom || 'début'} → ${periodTo || 'aujourd’hui'}`
          : undefined,
      columns: ['MAC', 'SSID', 'Statut', 'Début', 'Expiration'],
      rows: filtered.map((s: any) => [
        s.mac_address || '—',
        s.ssid || '—',
        s.status || '—',
        s.started_at ? new Date(s.started_at).toLocaleString('fr-FR') : '—',
        s.expires_at ? new Date(s.expires_at).toLocaleString('fr-FR') : '—',
      ]),
    });
  };

  if (loading) return <p className="text-muted-foreground">Chargement du site courant…</p>;

  if (!currentSite) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Sessions WiFi</h1>
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Choisissez un site en haut de l’écran pour voir ses sessions." />
      </div>
    );
  }

  const statusColor = (s: string) => s === 'active' ? 'default' : s === 'expired' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">Sessions WiFi</h1>
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
            <label htmlFor="sessions-period-from" className="text-sm text-muted-foreground">Du</label>
            <Input
              id="sessions-period-from"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sessions-period-to" className="text-sm text-muted-foreground">Au</label>
            <Input
              id="sessions-period-to"
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
          <div className="ml-auto">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-xl font-bold">{filtered.length}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MAC</TableHead>
                <TableHead>SSID</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune session</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.mac_address || '—'}</TableCell>
                  <TableCell>{s.ssid || '—'}</TableCell>
                  <TableCell className="text-sm">{s.started_at ? formatDistanceToNow(new Date(s.started_at), { addSuffix: true, locale: fr }) : '—'}</TableCell>
                  <TableCell className="text-sm">{s.expires_at ? formatDistanceToNow(new Date(s.expires_at), { addSuffix: true, locale: fr }) : '—'}</TableCell>
                  <TableCell><Badge variant={statusColor(s.status || 'active')}>{s.status}</Badge></TableCell>
                  <TableCell>
                    {s.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canEdit || endSession.isPending}
                        onClick={() => endSession.mutate(s.id)}
                      >
                        Terminer
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
