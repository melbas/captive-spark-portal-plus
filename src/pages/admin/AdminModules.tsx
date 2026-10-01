/**
 * PAGE MODULES DU PARCOURS — grille de toggles pour le site courant (SiteContext).
 * Catalogue : portal_modules. Activations : portal_enabled_modules rattachées au
 * portal_config du site (créé à la volée si absent).
 *
 * Task 12 : la grille est extraite dans @/components/admin/sites/ModulesToggleGrid
 * (réutilisée par la page /admin/sites/:siteId/modules) — cette page garde le
 * bandeau d'aide et délègue la grille.
 */
import ModulesToggleGrid from '@/components/admin/sites/ModulesToggleGrid';
import HelpTip from '@/components/admin/HelpTip';
import { useCurrentSite } from '@/context/SiteContext';

export default function AdminModules() {
  const { currentSite, canEdit } = useCurrentSite();
  const site = currentSite;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Modules du parcours</h1>

      <HelpTip
        variant="banner"
        title="Choisissez ce que vos clients voient sur le portail Wi-Fi"
        text={`Chaque module est une brique du portail : connexion, jeux, vidéos, boutique… Activez seulement ce qui est utile à « ${site?.name ?? 'votre site'} ». Le portail se met à jour immédiatement après chaque bascule.`}
      />

      {!site ? (
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Choisissez un site en haut de l’écran pour voir ses modules." />
      ) : (
        <ModulesToggleGrid siteId={site.id} canEdit={canEdit} />
      )}
    </div>
  );
}
