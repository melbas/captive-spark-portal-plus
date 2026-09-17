/**
 * PAGE PARAMÈTRES — configuration de la plateforme (niveau opérateur).
 * Pas de filtre site_id : cette page est réservée super_admin (cf. roles.ts,
 * PLATFORM_ONLY). Un reseller/site_manager n'y a même pas accès via la nav.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import HelpTip from '@/components/admin/HelpTip';
import { useCurrentSite } from '@/context/SiteContext';

export default function AdminSettings() {
  const { role, currentSite } = useCurrentSite();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Paramètres</h1>
        {role && <span className="text-sm text-muted-foreground">Rôle : {role}</span>}
        {currentSite && <span className="text-sm text-muted-foreground">Site : {currentSite.name}</span>}
      </div>

      <HelpTip
        variant="banner"
        title="Paramètres de la plateforme"
        text="Ces réglages s’appliquent à toute la plateforme, pas à un seul site. La configuration d’un site précis (logo, couleur, modules, forfaits) se fait sur les pages Sites, Modules du parcours et Forfaits."
      />

      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">Configuration globale</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Paramètres en cours de développement…</p></CardContent>
      </Card>
    </div>
  );
}
