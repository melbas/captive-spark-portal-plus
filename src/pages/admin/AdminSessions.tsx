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

export default function AdminSessions() {
  const { currentSite, loading } = useCurrentSite();
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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Sessions WiFi</h1>
        <span className="text-sm text-muted-foreground">Site : {currentSite.name}</span>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : (sessions || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune session</TableCell></TableRow>
              ) : (sessions || []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.mac_address || '—'}</TableCell>
                  <TableCell>{s.ssid || '—'}</TableCell>
                  <TableCell className="text-sm">{s.started_at ? formatDistanceToNow(new Date(s.started_at), { addSuffix: true, locale: fr }) : '—'}</TableCell>
                  <TableCell className="text-sm">{s.expires_at ? formatDistanceToNow(new Date(s.expires_at), { addSuffix: true, locale: fr }) : '—'}</TableCell>
                  <TableCell><Badge variant={statusColor(s.status || 'active')}>{s.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
