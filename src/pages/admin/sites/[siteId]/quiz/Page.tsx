/**
 * Task 14 — Page « Quiz » d'un site : /admin/sites/:siteId/quiz
 * Création de quiz (titre + première question + options) via QuizForm.
 * Suit le modèle de la page modules (Task 12).
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuizForm from '@/components/admin/sites/QuizForm';
import { useCurrentSite } from '@/context/SiteContext';

export default function SiteQuizPage() {
  const { siteId = '' } = useParams<{ siteId: string }>();
  const { canEdit } = useCurrentSite();
  const [refreshKey, setRefreshKey] = useState(0);

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
          <Link to={`/admin/sites/${siteId}`}>
            <ArrowLeft className="h-4 w-4" />
            Site
          </Link>
        </Button>
        <h1 className="text-2xl font-extrabold">Quiz — {site.data?.name ?? '…'}</h1>
      </div>

      {siteId ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Nouveau quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <QuizForm key={refreshKey} siteId={siteId} canEdit={canEdit} onCreated={() => setRefreshKey((k) => k + 1)} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun site spécifié.</p>
      )}
    </div>
  );
}
