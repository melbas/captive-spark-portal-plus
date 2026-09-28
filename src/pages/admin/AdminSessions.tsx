import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { useCurrentSite } from '@/context/SiteContext';
import { siteQueryKey } from '@/lib/admin/queries';
import { exportCSV } from '@/lib/report/exportCSV';
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

  const handleExport = () => {
    exportCSV(
      (sessions || []).map((s: any) => ({
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
        <Button variant="outline" onClick={handleExport} disabled={!sessions || sessions.length === 0}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>
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
              ) : (sessions || []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune session</TableCell></TableRow>
              ) : (sessions || []).map((s) => (
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
