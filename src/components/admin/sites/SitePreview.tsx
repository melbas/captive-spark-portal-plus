/**
 * SitePreview — aperçu live du portail dans un cadre téléphone,
 * charge la version brouillon (?preview=1) du slug du site.
 * `refreshKey` force le rechargement de l'iframe après enregistrement.
 */
import { portalUrl } from '@/lib/admin/modules';

interface SitePreviewProps {
  slug: string;
  /** Incrémenté pour forcer le rechargement de l'aperçu. */
  refreshKey?: number;
  origin?: string;
}

export default function SitePreview({ slug, refreshKey = 0, origin }: SitePreviewProps) {
  const base = origin ?? window.location.origin;
  const src = portalUrl(base, slug, true);

  return (
    <div className="mx-auto w-[300px] rounded-[2.2rem] border-4 border-surface-dark bg-surface-dark p-2 shadow-xl">
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/30" />
      <iframe
        key={refreshKey}
        src={src}
        title="Aperçu du portail Wi-Fi"
        className="h-[560px] w-full rounded-[1.7rem] border-0 bg-white"
      />
    </div>
  );
}
