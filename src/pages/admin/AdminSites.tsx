/**
 * PAGE SITES — édition complète d'un site + aperçu live du portail.
 * Le site édité = site courant (sélecteur global du layout).
 */
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, ExternalLink, Eye, RefreshCw, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import HelpTip from '@/components/admin/HelpTip';
import { useCurrentSite } from '@/context/SiteContext';
import { portalUrl } from '@/lib/admin/modules';

const SITE_TYPES = ['hotel', 'restaurant', 'campus', 'public', 'commerce', 'institution', 'other'] as const;
const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hôtel', restaurant: 'Restaurant', campus: 'Campus', public: 'Lieu public',
  commerce: 'Commerce', institution: 'Institution', other: 'Autre',
};

const LOGO_BUCKET = 'site-assets';
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 Mo

export default function AdminSites() {
  const qc = useQueryClient();
  const { currentSite, canEdit, loading } = useCurrentSite();
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [uploading, setUploading] = useState(false);

  const site = currentSite;
  const origin = window.location.origin;
  const publicUrl = site ? portalUrl(origin, site.portal_slug, false) : '';

  const defaults = useMemo(
    () => ({
      name: site?.name ?? '',
      type: site?.type ?? 'hotel',
      location: site?.location ?? '',
      logo_url: site?.logo_url ?? '',
      primary_color: site?.primary_color ?? '#5B4DFF',
      welcome_msg: site?.welcome_msg ?? 'Bienvenue ! Connectez-vous pour accéder à Internet.',
      is_active: site?.is_active ?? true,
    }),
    [site?.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [form, setForm] = useState(defaults);
  const [formSiteId, setFormSiteId] = useState<string | null>(site?.id ?? null);
  if (site && formSiteId !== site.id) {
    setFormSiteId(site.id);
    setForm(defaults);
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!site) throw new Error('Aucun site sélectionné.');
      const { error } = await supabase
        .from('sites')
        .update({
          name: form.name,
          type: form.type,
          location: form.location || null,
          logo_url: form.logo_url || null,
          primary_color: form.primary_color,
          welcome_msg: form.welcome_msg,
          is_active: form.is_active,
        })
        .eq('id', site.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sites'] });
      setPreviewKey((k) => k + 1);
      toast.success('Site enregistré. L’aperçu est à jour.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadLogo = async (file: File) => {
    if (!site) return;
    if (!file.type.startsWith('image/')) return toast.error('Choisissez un fichier image (PNG, JPG, SVG).');
    if (file.size > MAX_LOGO_BYTES) return toast.error('Image trop lourde (max 2 Mo).');
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `sites/${site.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      set('logo_url', data.publicUrl);
      toast.success('Logo prêt — cliquez sur Enregistrer pour l’appliquer.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Lien copié');
    } catch {
      toast.error('Copie impossible — sélectionnez le lien manuellement.');
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Chargement du site courant…</p>;
  }
  if (!site) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Sites</h1>
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Choisissez un site en haut de l’écran, ou créez-en un pour commencer." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Sites</h1>
        <Badge variant={site.is_active ? 'default' : 'secondary'}>
          {site.is_active ? 'Actif' : 'Inactif'}
        </Badge>
        {!canEdit && (
          <span className="text-sm text-muted-foreground">Lecture seule pour votre rôle.</span>
        )}
      </div>

      <HelpTip
        variant="banner"
        title="Cette page configure le portail Wi-Fi de votre site"
        text="Tout ce que vous modifiez ici (nom, logo, couleurs, message d’accueil) apparaît sur le portail que vos clients voient en se connectant au Wi-Fi. Enregistrez, puis regardez l’aperçu à droite."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Formulaire */}
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg">Fiche du site « {site.name} »</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="site-name">Nom du site</Label>
                <HelpTip title="Nom du site" text="C’est le nom affiché sur le portail Wi-Fi (ex. « Hôtel Terrou »)." />
              </div>
              <Input id="site-name" value={form.name} disabled={!canEdit}
                onChange={(e) => set('name', e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label>Type d’établissement</Label>
                  <HelpTip title="Type" text="Sert uniquement à classer vos sites dans le back office." />
                </div>
                <Select value={form.type} onValueChange={(v) => set('type', v)} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SITE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t] ?? t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-location">Localisation</Label>
                <Input id="site-location" value={form.location} disabled={!canEdit}
                  placeholder="Dakar, Sénégal" onChange={(e) => set('location', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>Logo</Label>
                <HelpTip title="Logo du site" text="Image carrée de préférence, 2 Mo maximum. Elle s’affiche en haut du portail Wi-Fi." />
              </div>
              <div className="flex items-center gap-3">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo du site"
                    className="h-14 w-14 rounded-xl border border-border object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                    Aucun
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden
                  onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                <Button type="button" variant="outline" disabled={!canEdit || uploading || uploading}
                  onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span className="ml-2">{uploading ? 'Envoi…' : 'Choisir un logo'}</span>
                </Button>
                {form.logo_url && canEdit && (
                  <Button type="button" variant="ghost" onClick={() => set('logo_url', '')}>Retirer</Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="site-color">Couleur principale</Label>
                <HelpTip title="Couleur principale" text="C’est la couleur des boutons et des accents du portail Wi-Fi." />
              </div>
              <div className="flex items-center gap-3">
                <input id="site-color" type="color" value={form.primary_color} disabled={!canEdit}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                  onChange={(e) => set('primary_color', e.target.value)} />
                <Input className="w-32 font-mono" value={form.primary_color} disabled={!canEdit}
                  onChange={(e) => set('primary_color', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="site-welcome">Message de bienvenue</Label>
                <HelpTip title="Message de bienvenue" text="La première phrase que lisent vos clients en ouvrant le portail. Restez court et chaleureux." />
              </div>
              <Textarea id="site-welcome" rows={3} value={form.welcome_msg} disabled={!canEdit}
                onChange={(e) => set('welcome_msg', e.target.value)} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="site-active">Portail activé</Label>
                <HelpTip title="Activation" text="Désactivé, le portail Wi-Fi ne s’affiche plus aux clients du site." />
              </div>
              <Switch id="site-active" checked={form.is_active} disabled={!canEdit}
                onCheckedChange={(v) => set('is_active', v)} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Label>Lien du portail</Label>
                  <HelpTip title="Lien du portail" text="L’adresse que vos clients visitent. Copiez-la pour l’afficher sur une affiche ou un QR code." />
                </div>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{publicUrl}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                <span className="ml-2">{copied ? 'Copié' : 'Copier'}</span>
              </Button>
            </div>

            <Button
              className="w-full text-white"
              style={{ background: 'var(--brand-gradient)' }}
              disabled={!canEdit || save.isPending || !form.name}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </Button>
          </CardContent>
        </Card>

        {/* Aperçu téléphone */}
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-4 w-4" /> Aperçu du portail
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" aria-label="Rafraîchir l’aperçu"
                onClick={() => setPreviewKey((k) => k + 1)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Ouvrir dans un nouvel onglet"
                onClick={() => window.open(portalUrl(origin, site.portal_slug, true), '_blank')}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <HelpTip
              variant="banner"
              title="Aperçu fidèle"
              text="Ce cadre montre le portail tel que vos clients le verront. Après un enregistrement, l’aperçu se met à jour tout seul."
              className="mb-4"
            />
            <div className="mx-auto w-[300px] rounded-[2.2rem] border-4 border-surface-dark bg-surface-dark p-2 shadow-xl">
              <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/30" />
              <iframe
                key={previewKey}
                src={portalUrl(origin, site.portal_slug, true)}
                title="Aperçu du portail Wi-Fi"
                className="h-[560px] w-full rounded-[1.7rem] border-0 bg-white"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
