/**
 * Step1Location — étape 1 du wizard : nom, slug du portail, localisation.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WizardData } from '@/pages/admin/sites/new/wizard-data';

interface Step1LocationProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

export default function Step1Location({ data, onChange }: Step1LocationProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Localisation</h2>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-name">Nom du site</Label>
        <Input
          id="wizard-name"
          value={data.name}
          placeholder="Hôtel Terrou"
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-slug">Slug du portail</Label>
        <Input
          id="wizard-slug"
          value={data.portal_slug}
          placeholder="hotel-terrou"
          onChange={(e) => onChange({ portal_slug: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Le portail sera servi sur /portal/{data.portal_slug || 'votre-slug'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-location">Localisation</Label>
        <Input
          id="wizard-location"
          value={data.location}
          placeholder="Dakar, Sénégal"
          onChange={(e) => onChange({ location: e.target.value })}
        />
      </div>
    </section>
  );
}
