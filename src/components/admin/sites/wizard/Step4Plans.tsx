/**
 * Step4Plans — étape 4 du wizard : forfaits par défaut (preset), éditables.
 * Chaque forfait peut être décoché (non créé) ou ajusté (nom, durée, prix).
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { WizardPlan } from '@/pages/admin/sites/new/wizard-data';

interface Step4PlansProps {
  plans: WizardPlan[];
  onChangePlan: (index: number, patch: Partial<WizardPlan>) => void;
}

export default function Step4Plans({ plans, onChangePlan }: Step4PlansProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Forfaits</h2>
      <p className="text-sm text-muted-foreground">
        Forfaits par défaut proposés (prix en FCFA). Décoche ceux que tu ne veux
        pas créer, ajuste les durées et les prix.
      </p>

      <ul className="space-y-3">
        {plans.map((plan, i) => (
          <li
            key={i}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id={`wizard-plan-selected-${i}`}
                checked={plan.selected}
                onCheckedChange={(v) => onChangePlan(i, { selected: v === true })}
                aria-label={`Inclure ${plan.name}`}
              />
              <Label
                htmlFor={`wizard-plan-selected-${i}`}
                className="text-xs text-muted-foreground"
              >
                Inclure
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`wizard-plan-name-${i}`}>Nom</Label>
              <Input
                id={`wizard-plan-name-${i}`}
                value={plan.name}
                onChange={(e) => onChangePlan(i, { name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`wizard-plan-duration-${i}`}>Durée (min)</Label>
              <Input
                id={`wizard-plan-duration-${i}`}
                type="number"
                min={1}
                value={plan.duration_minutes}
                onChange={(e) =>
                  onChangePlan(i, { duration_minutes: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`wizard-plan-price-${i}`}>Prix (FCFA)</Label>
              <Input
                id={`wizard-plan-price-${i}`}
                type="number"
                min={0}
                value={plan.price_fcfa}
                onChange={(e) =>
                  onChangePlan(i, { price_fcfa: Number(e.target.value) })
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
