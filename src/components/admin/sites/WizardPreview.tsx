/**
 * WizardPreview — aperçu live des valeurs saisies dans le wizard.
 * Réutilise SitePreview (iframe ?preview=1) quand un slug existe ; avant ça,
 * affiche un aperçu statique des valeurs (nom, couleur, message, forfaits).
 */
import SitePreview from '@/components/admin/sites/SitePreview';
import { formatFcfa, formatDuration } from '@/lib/admin/plans';
import type { WizardData } from '@/pages/admin/sites/new/wizard-data';

interface WizardPreviewProps {
  data: WizardData;
}

export default function WizardPreview({ data }: WizardPreviewProps) {
  if (data.portal_slug.trim()) {
    return <SitePreview slug={data.portal_slug.trim()} />;
  }

  return (
    <aside
      aria-label="Aperçu du portail"
      className="mx-auto w-[300px] space-y-4 rounded-[2.2rem] border-4 border-surface-dark bg-surface-dark p-4 shadow-xl"
    >
      <div
        className="rounded-[1.7rem] bg-white p-4 text-center"
        style={{ borderTopColor: data.primary_color, borderTopWidth: 4 }}
      >
        {data.logo_url ? (
          <img
            src={data.logo_url}
            alt="Logo du site"
            className="mx-auto mb-2 h-12 w-12 rounded-full object-contain"
          />
        ) : null}
        <p className="text-base font-semibold" style={{ color: data.primary_color }}>
          {data.name || 'Nom du site'}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          {data.welcome_msg || 'Message de bienvenue…'}
        </p>

        <ul className="mt-3 space-y-1.5">
          {data.plans
            .filter((p) => p.selected)
            .map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
              >
                <span className="font-medium">
                  {p.name || 'Forfait'} · {formatDuration(p.duration_minutes)}
                </span>
                <span className="font-semibold" style={{ color: data.primary_color }}>
                  {formatFcfa(p.price_fcfa)}
                </span>
              </li>
            ))}
        </ul>

        {data.whatsapp_support ? (
          <p className="mt-3 text-[10px] text-gray-500">
            Support : {data.whatsapp_support}
          </p>
        ) : null}
      </div>
      <p className="text-center text-[10px] text-white/60">
        Renseigne le slug pour voir l'aperçu live du portail.
      </p>
    </aside>
  );
}
