/**
 * Onglet Publicités de la page détail d'un site (/admin/sites/:siteId).
 * Encapsule AdsCarousel (CRUD ad_videos par site) — Task 13.
 */
import AdsCarousel from '@/components/admin/sites/AdsCarousel';

interface AdsTabProps {
  siteId: string;
  canEdit?: boolean;
}

export default function AdsTab({ siteId, canEdit = true }: AdsTabProps) {
  return <AdsCarousel siteId={siteId} canEdit={canEdit} />;
}
