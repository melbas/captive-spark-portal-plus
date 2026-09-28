/**
 * Step3Support — étape 3 du wizard : contact support (WhatsApp).
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WizardData } from '@/pages/admin/sites/new/wizard-data';

interface Step3SupportProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

export default function Step3Support({ data, onChange }: Step3SupportProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Support</h2>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-whatsapp">WhatsApp support</Label>
        <Input
          id="wizard-whatsapp"
          type="tel"
          placeholder="+221770000000"
          value={data.whatsapp_support}
          onChange={(e) => onChange({ whatsapp_support: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Numéro affiché sur le portail en cas de problème de connexion. Laisser
          vide si aucun support WhatsApp.
        </p>
      </div>
    </section>
  );
}
