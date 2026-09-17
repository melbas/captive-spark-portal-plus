import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCurrentSite } from '@/context/SiteContext';
import { siteQueryKey } from '@/lib/admin/queries';
import HelpTip from '@/components/admin/HelpTip';

export default function AdminLogs() {
  const { currentSite, loading } = useCurrentSite();
  const siteId = currentSite?.id ?? null;

  // pc_audit_logs ne porte pas encore de colonne site_id au schéma actuel :
  // impossible de scopé proprement. La requête reste désactivée sans site
  // courant, et une bannière documente la limite. (Dette backend : colonne
  // site_id à ajouter, ou filtre via admin_id → user_roles.site_id.)
  const { data: logs, isLoading } = useQuery({
    queryKey: siteQueryKey('admin-logs', siteId),
    enabled: !!siteId,
    queryFn: async () => {
      const { data } = await supabase
        .from('pc_audit_logs')
        .select('id, action, entity_type, ip_address, created_at, admin_id')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  if (loading) return <p className="text-muted-foreground">Chargement du site courant…</p>;

  if (!currentSite) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Logs d'audit</h1>
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Choisissez un site en haut de l’écran pour filtrer le journal." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Logs d'audit</h1>
        <span className="text-sm text-muted-foreground">Site : {currentSite.name}</span>
      </div>
      <HelpTip variant="banner" title="Journal non scopé par site (pour l'instant)"
        text="La table de journal actuelle ne porte pas encore de site_id : les lignes affichées peuvent concerner d’autres sites. Le filtre par site sera appliqué dès que la colonne existera côté backend." />
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : (logs || []).length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun log</TableCell></TableRow>
              ) : (logs || []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.action}</TableCell>
                  <TableCell className="text-sm">{l.entity_type || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{l.ip_address || '—'}</TableCell>
                  <TableCell className="text-sm">{l.created_at ? formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: fr }) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
