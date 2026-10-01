/**
 * SiteForm — formulaire d'édition complète d'un site
 * (logo, couleur, message d'accueil, WhatsApp, activation du portail).
 * Mutations directes via le client supabase (mis en cache par react-query).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

export interface SiteFormData {
  id: string;
  name: string;
  portal_slug: string;
  logo_url: string;
  primary_color: string;
  welcome_msg: string;
  is_active: boolean;
  /** Template de portail choisi : 'instant' | 'scene' | 'echange'. */
  portal_template?: string | null;
}

/** Templates de portail proposés (migration 20260930000000). */
export const PORTAL_TEMPLATES = [
  {
    value: 'instant',
    label: 'Instant',
    description: 'Portail actuel : forfaits, paiement, jeux. Défaut.',
  },
  {
    value: 'scene',
    label: 'Scène',
    description: 'Événementiel : splash sponsor, pass journalier, jauge de temps.',
  },
  {
    value: 'echange',
    label: 'Échange',
    description: 'PremiumConnect : échange contre données, jauge en héros (bientôt).',
  },
] as const;

interface SiteFormProps {
  site: SiteFormData;
  canEdit?: boolean;
  onSaved?: () => void;
}

export default function SiteForm({ site, canEdit = true, onSaved }: SiteFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: site.name ?? '',
    logo_url: site.logo_url ?? '',
    primary_color: site.primary_color ?? '#5B4DFF',
    welcome_msg: site.welcome_msg ?? '',
    is_active: site.is_active ?? true,
    portal_template: site.portal_template ?? 'instant',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase
        .from('sites')
        .update({
          name: values.name,
          logo_url: values.logo_url || null,
          primary_color: values.primary_color,
          welcome_msg: values.welcome_msg,
          is_active: values.is_active,
          portal_template: values.portal_template,
        })
        .eq('id', site.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sites'] });
      onSaved?.();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canEdit && form.name && !save.isPending) save.mutate(form);
      }}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="site-name">Nom du site</Label>
        <Input
          id="site-name"
          value={form.name}
          disabled={!canEdit}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site-logo">Logo</Label>
        <Input
          id="site-logo"
          type="url"
          placeholder="https://…"
          value={form.logo_url}
          disabled={!canEdit}
          onChange={(e) => set('logo_url', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site-color">Couleur principale</Label>
        <Input
          id="site-color"
          value={form.primary_color}
          disabled={!canEdit}
          onChange={(e) => set('primary_color', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site-welcome">Message de bienvenue</Label>
        <Textarea
          id="site-welcome"
          rows={3}
          value={form.welcome_msg}
          disabled={!canEdit}
          onChange={(e) => set('welcome_msg', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site-template">Template du portail</Label>
        <select
          id="site-template"
          value={form.portal_template}
          disabled={!canEdit}
          onChange={(e) => set('portal_template', e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {PORTAL_TEMPLATES.map((tpl) => (
            <option key={tpl.value} value={tpl.value}>
              {tpl.label} — {tpl.description}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Le template choisit l'expérience du portail public pour ce site.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <Label htmlFor="site-active">Portail activé</Label>
        <Switch
          id="site-active"
          checked={form.is_active}
          disabled={!canEdit}
          onCheckedChange={(v) => set('is_active', v)}
          aria-label="Portail activé"
        />
      </div>

      <Button type="submit" className="w-full" disabled={!canEdit || save.isPending || !form.name}>
        {save.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…
          </>
        ) : (
          'Enregistrer les modifications'
        )}
      </Button>
      {save.isSuccess && !save.isPending && (
        <p className="text-sm text-green-600">Site enregistré.</p>
      )}
    </form>
  );
}
