/**
 * Task 12 — Page « Modules du parcours » d'un site : /admin/sites/:siteId/modules
 * Délègue la grille de toggles à ModulesToggleGrid (partagée avec AdminModules).
 */
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import ModulesToggleGrid from '@/components/admin/sites/ModulesToggleGrid';
import { useCurrentSite } from '@/context/SiteContext';

export default function SiteModulesPage() {
  const { siteId = '' } = useParams<{ siteId: string }>();
  const { canEdit } = useCurrentSite();

  const site = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, portal_slug')
        .eq('id', siteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!siteId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/sites">
            <ArrowLeft className="h-4 w-4" />
            Sites
          </Link>
        </Button>
        <h1 className="text-2xl font-extrabold">
          Modules du parcours — {site.data?.name ?? '…'}
        </h1>
      </div>

      {siteId ? (
        <ModulesToggleGrid siteId={siteId} canEdit={canEdit} />
      ) : (
        <p className="text-sm text-muted-foreground">Aucun site spécifié.</p>
      )}

      {site.isLoading && <Skeleton className="h-8 w-64" />}
    </div>
  );
}
