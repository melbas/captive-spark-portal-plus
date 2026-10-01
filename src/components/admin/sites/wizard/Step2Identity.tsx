/**
 * Step2Identity — étape 2 du wizard : logo, couleur primaire, message d'accueil.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WizardData } from '@/pages/admin/sites/new/wizard-data';

interface Step2IdentityProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

export default function Step2Identity({ data, onChange }: Step2IdentityProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Identité</h2>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-logo">Logo (URL)</Label>
        <Input
          id="wizard-logo"
          type="url"
          placeholder="https://…"
          value={data.logo_url}
          onChange={(e) => onChange({ logo_url: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-color">Couleur principale</Label>
        <Input
          id="wizard-color"
          value={data.primary_color}
          placeholder="#5B4DFF"
          onChange={(e) => onChange({ primary_color: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-welcome">Message de bienvenue</Label>
        <Textarea
          id="wizard-welcome"
          rows={3}
          value={data.welcome_msg}
          onChange={(e) => onChange({ welcome_msg: e.target.value })}
        />
      </div>
    </section>
  );
}
