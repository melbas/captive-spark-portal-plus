/**
 * NewSiteWizardPage — wizard « Créer un site » en 4 étapes avec aperçu live.
 *
 * Étape 1 : localisation (nom, slug, localisation)
 * Étape 2 : identité (logo, couleur primaire, message d'accueil)
 * Étape 3 : support (WhatsApp)
 * Étape 4 : forfaits (preset par défaut, éditable) → insert site + plans, redirect.
 *
 * Schéma réel (migrations) : sites(name, portal_slug, location, logo_url,
 * primary_color, welcome_msg, whatsapp_support, is_active) et wifi_plans(
 * site_id, name, duration_minutes, price_fcfa, sort_order, is_popular, is_active).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Step1Location from '@/components/admin/sites/wizard/Step1Location';
import Step2Identity from '@/components/admin/sites/wizard/Step2Identity';
import Step3Support from '@/components/admin/sites/wizard/Step3Support';
import Step4Plans from '@/components/admin/sites/wizard/Step4Plans';
import WizardPreview from '@/components/admin/sites/WizardPreview';
import { DEFAULT_PLANS_PRESET, type WizardPlan, type WizardData } from './wizard-data';

const STEP_TITLES = ['Localisation', 'Identité', 'Support', 'Forfaits'] as const;

export default function NewSiteWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<WizardData>({
    name: '',
    portal_slug: '',
    location: '',
    logo_url: '',
    primary_color: '#5B4DFF',
    welcome_msg: 'Bienvenue ! Connectez-vous pour accéder à Internet.',
    whatsapp_support: '',
    plans: DEFAULT_PLANS_PRESET.map((p) => ({ ...p })),
  });

  const set = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));
  const setPlan = (i: number, patch: Partial<WizardPlan>) =>
    setData((d) => ({
      ...d,
      plans: d.plans.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));

  const stepValid =
    step === 1
      ? Boolean(data.name.trim() && data.portal_slug.trim())
      : step === 4
        ? data.plans.every((p) => p.name.trim() && p.duration_minutes > 0 && p.price_fcfa >= 0)
        : true;

  const canContinue = stepValid && !submitting;
  const isLast = step === 4;

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: site, error } = await supabase
        .from('sites')
        .insert({
          name: data.name,
          portal_slug: data.portal_slug,
          location: data.location || null,
          logo_url: data.logo_url || null,
          primary_color: data.primary_color,
          welcome_msg: data.welcome_msg,
          whatsapp_support: data.whatsapp_support || null,
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;

      const plansToInsert = data.plans.map((p, i) => ({
        site_id: site.id,
        name: p.name,
        duration_minutes: p.duration_minutes,
        price_fcfa: p.price_fcfa,
        sort_order: i,
        is_active: true,
      }));
      const { error: plansError } = await supabase
        .from('wifi_plans')
        .insert(plansToInsert);
      if (plansError) throw plansError;

      toast.success('Site créé avec ses forfaits par défaut.');
      navigate(`/admin/sites/${site.id}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Impossible de créer le site.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Créer un site</h1>
        <p className="text-sm text-muted-foreground">
          Étape {step} sur 4 — {STEP_TITLES[step - 1]}
        </p>
      </div>

      <ol className="flex gap-2" aria-label="Progression du wizard">
        {STEP_TITLES.map((title, i) => (
          <li
            key={title}
            aria-current={step === i + 1 ? 'step' : undefined}
            className={
              'flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium ' +
              (step === i + 1
                ? 'border-primary bg-primary/10 text-primary'
                : step > i + 1
                  ? 'border-primary/40 bg-primary/5 text-muted-foreground'
                  : 'border-border text-muted-foreground')
            }
          >
            {i + 1}. {title}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {step === 1 && <Step1Location data={data} onChange={set} />}
          {step === 2 && <Step2Identity data={data} onChange={set} />}
          {step === 3 && <Step3Support data={data} onChange={set} />}
          {step === 4 && (
            <Step4Plans plans={data.plans} onChangePlan={setPlan} />
          )}

          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1 || submitting}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Retour
            </Button>
            {isLast ? (
              <Button type="button" disabled={!canContinue} onClick={submit}>
                {submitting ? 'Création…' : 'Créer le site'}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep((s) => Math.min(4, s + 1))}
              >
                Suivant
              </Button>
            )}
          </div>
        </div>

        <WizardPreview data={data} />
      </div>
    </div>
  );
}
