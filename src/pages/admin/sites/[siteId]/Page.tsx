/**
 * Page détail d'un site (route dynamique /admin/sites/:siteId) :
 * édition complète (SiteForm), aperçu live (SitePreview), lien copiable,
 * onglet Forfaits (PlansTab).
 */
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { portalUrl } from '@/lib/admin/modules';
import type { SiteFormData } from '@/components/admin/sites/SiteForm';
import SiteForm from '@/components/admin/sites/SiteForm';
import SitePreview from '@/components/admin/sites/SitePreview';
import PlansTab from '@/components/admin/sites/PlansTab';
import AdsTab from '@/pages/admin/sites/[siteId]/ads/Page';

export default function SiteDetailPage() {
  const { siteId = '' } = useParams<{ siteId: string }>();
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const siteQuery = useQuery({
    queryKey: ['site', siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, portal_slug, logo_url, primary_color, welcome_msg, is_active')
        .eq('id', siteId)
        .single();
      if (error) throw error;
      return data as SiteFormData;
    },
  });

  const site = siteQuery.data;
  const publicUrl = useMemo(
    () => (site ? portalUrl(window.location.origin, site.portal_slug, false) : ''),
    [site?.portal_slug],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Lien copié');
    } catch {
      toast.error('Copie impossible — sélectionnez le lien manuellement.');
    }
  };

  if (siteQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement du site…</p>;
  }
  if (siteQuery.isError || !site) {
    return <p className="text-destructive">Site introuvable.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{site.name}</h1>
        <Badge variant={site.is_active ? 'default' : 'secondary'}>
          {site.is_active ? 'Actif' : 'Inactif'}
        </Badge>
      </div>

      <Tabs defaultValue="identite">
        <TabsList>
          <TabsTrigger value="identite">Identité</TabsTrigger>
          <TabsTrigger value="plans">Forfaits</TabsTrigger>
          <TabsTrigger value="ads">Publicités</TabsTrigger>
        </TabsList>

        <TabsContent value="identite" className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Fiche du site</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <SiteForm site={site} onSaved={() => setPreviewKey((k) => k + 1)} />

              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="portal-link">Lien du portail</Label>
                  <Input
                    id="portal-link"
                    readOnly
                    value={publicUrl}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-2">{copied ? 'Copié' : 'Copier'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Ouvrir dans un nouvel onglet"
                    onClick={() => window.open(publicUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Aperçu du portail</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Rafraîchir l’aperçu"
                  onClick={() => setPreviewKey((k) => k + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SitePreview slug={site.portal_slug} refreshKey={previewKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Forfaits Wi-Fi</CardTitle>
            </CardHeader>
            <CardContent>
              <PlansTab siteId={site.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads">
          <AdsTab siteId={site.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
