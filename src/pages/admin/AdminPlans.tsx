/**
 * PAGE FORFAITS — CRUD complet des forfaits Wi-Fi du site courant (wifi_plans).
 * Colonnes live : name, description, duration_minutes, price_fcfa, speed_down_mb,
 * speed_up_mb, data_limit_mb, max_devices, is_popular, sort_order, is_active/active.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Pencil, Plus, Star, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import HelpTip from '@/components/admin/HelpTip';
import { useCurrentSite } from '@/context/SiteContext';
import { formatFcfa, formatDuration, sortPlans, validatePlan } from '@/lib/admin/plans';

interface Plan {
  id: string;
  site_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_fcfa: number | null;
  speed_down_mb: number | null;
  speed_up_mb: number | null;
  data_limit_mb: number | null;
  max_devices: number | null;
  is_popular: boolean | null;
  sort_order: number | null;
  is_active: boolean | null;
  active: boolean | null;
}

interface FormState {
  id: string | null;
  name: string;
  description: string;
  duration_minutes: string;
  price_fcfa: string;
  speed_down_mb: string;
  speed_up_mb: string;
  data_limit_mb: string;
  max_devices: string;
  is_popular: boolean;
  sort_order: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  id: null, name: '', description: '', duration_minutes: '60', price_fcfa: '',
  speed_down_mb: '10', speed_up_mb: '5', data_limit_mb: '', max_devices: '1',
  is_popular: false, sort_order: '0', is_active: true,
};

function fromPlan(p: Plan): FormState {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    duration_minutes: String(p.duration_minutes ?? 60),
    price_fcfa: p.price_fcfa != null ? String(p.price_fcfa) : '',
    speed_down_mb: String(p.speed_down_mb ?? 10),
    speed_up_mb: String(p.speed_up_mb ?? 5),
    data_limit_mb: p.data_limit_mb != null ? String(p.data_limit_mb) : '',
    max_devices: String(p.max_devices ?? 1),
    is_popular: !!p.is_popular,
    sort_order: String(p.sort_order ?? 0),
    is_active: p.is_active ?? p.active ?? true,
  };
}

const num = (s: string): number | null => {
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : null;
};

export default function AdminPlans() {
  const qc = useQueryClient();
  const { currentSite, canEdit } = useCurrentSite();
  const site = currentSite;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleting, setDeleting] = useState<Plan | null>(null);

  const plans = useQuery({
    queryKey: ['wifi-plans', site?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wifi_plans')
        .select('*')
        .eq('site_id', site!.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
    enabled: !!site,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['wifi-plans', site?.id] });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (p: Plan) => { setForm(fromPlan(p)); setDialogOpen(true); };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        duration_minutes: num(form.duration_minutes) ?? 60,
        price_fcfa: num(form.price_fcfa) ?? 0,
        price: num(form.price_fcfa) ?? 0,
        speed_down_mb: num(form.speed_down_mb) ?? 10,
        speed_up_mb: num(form.speed_up_mb) ?? 5,
        data_limit_mb: num(form.data_limit_mb),
        max_devices: num(form.max_devices) ?? 1,
        is_popular: form.is_popular,
        sort_order: num(form.sort_order) ?? 0,
        is_active: form.is_active,
        active: form.is_active,
        site_id: site!.id,
      };
      if (form.id) {
        const { error } = await supabase.from('wifi_plans').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('wifi_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success(form.id ? 'Forfait modifié.' : 'Forfait créé.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (p: Plan) => {
      const { error } = await supabase.from('wifi_plans').delete().eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Forfait supprimé.'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Plan) => {
      const next = !(p.is_active ?? p.active ?? true);
      const { error } = await supabase
        .from('wifi_plans')
        .update({ is_active: next, active: next })
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    const check = validatePlan({
      name: form.name.trim(),
      duration_minutes: num(form.duration_minutes) ?? 0,
      price_fcfa: num(form.price_fcfa) ?? -1,
    });
    if (!check.ok) return toast.error(check.error);
    upsert.mutate();
  };

  const plansList = sortPlans(plans.data ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Forfaits</h1>
        <Button
          onClick={openCreate}
          disabled={!site || !canEdit}
          className="text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Plus className="h-4 w-4" /> <span className="ml-1">Nouveau forfait</span>
        </Button>
      </div>

      <HelpTip
        variant="banner"
        title="Les forfaits sont les tickets Wi-Fi que vos clients achètent"
        text={`Chaque ligne ci-dessous apparaît sur le portail de « ${site?.name ?? 'votre site'} ». Le forfait marqué « populaire » est mis en avant. N’oubliez pas d’activer chaque forfait pour qu’il soit visible.`}
      />

      {!site ? (
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Choisissez un site en haut de l’écran pour voir ses forfaits." />
      ) : (
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Débit / Data</TableHead>
                  <TableHead>Appareils</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : plansList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Aucun forfait pour ce site — créez le premier.
                    </TableCell>
                  </TableRow>
                ) : (
                  plansList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          {p.name}
                          {p.is_popular && (
                            <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                              <Star className="h-3 w-3" /> Populaire
                            </Badge>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        )}
                      </TableCell>
                      <TableCell>{formatDuration(p.duration_minutes)}</TableCell>
                      <TableCell className="font-semibold">{formatFcfa(p.price_fcfa ?? 0)}</TableCell>
                      <TableCell className="text-xs">
                        ↓{p.speed_down_mb ?? '—'} / ↑{p.speed_up_mb ?? '—'} Mo
                        <br />
                        {p.data_limit_mb != null ? `${p.data_limit_mb} Mo de data` : 'Data illimitée'}
                      </TableCell>
                      <TableCell>{p.max_devices ?? 1}</TableCell>
                      <TableCell>{p.sort_order ?? 0}</TableCell>
                      <TableCell>
                        <Switch
                          checked={p.is_active ?? p.active ?? true}
                          disabled={!canEdit || toggleActive.isPending}
                          onCheckedChange={() => toggleActive.mutate(p)}
                          aria-label={`Activer ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Modifier ${p.name}`}
                            disabled={!canEdit} onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Supprimer ${p.name}`}
                            disabled={!canEdit}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(p)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Formulaire créer / modifier */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier le forfait' : 'Nouveau forfait'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="plan-name">Nom</Label>
                <HelpTip title="Nom du forfait" text="Court et clair, visible par le client (ex. « Heure de surf »)." />
              </div>
              <Input id="plan-name" value={form.name} placeholder="1 heure de connexion"
                onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-desc">Description</Label>
              <Textarea id="plan-desc" rows={2} value={form.description}
                placeholder="Idéal pour lire ses e-mails et les réseaux sociaux."
                onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="plan-duration">Durée (minutes)</Label>
                  <HelpTip title="Durée" text="Combien de temps le client reste connecté (60 = 1 heure)." />
                </div>
                <Input id="plan-duration" type="number" min={1} value={form.duration_minutes}
                  onChange={(e) => set('duration_minutes', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="plan-price">Prix (FCFA)</Label>
                  <HelpTip title="Prix" text="Prix en francs CFA. Laissez 0 pour un forfait gratuit." />
                </div>
                <Input id="plan-price" type="number" min={0} value={form.price_fcfa} placeholder="500"
                  onChange={(e) => set('price_fcfa', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-down">Débit descendant (Mo)</Label>
                <Input id="plan-down" type="number" min={0} value={form.speed_down_mb}
                  onChange={(e) => set('speed_down_mb', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-up">Débit montant (Mo)</Label>
                <Input id="plan-up" type="number" min={0} value={form.speed_up_mb}
                  onChange={(e) => set('speed_up_mb', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="plan-data">Data (Mo)</Label>
                  <HelpTip title="Limite de data" text="Videz le champ pour laisser la data illimitée." />
                </div>
                <Input id="plan-data" type="number" min={0} value={form.data_limit_mb}
                  placeholder="Illimité"
                  onChange={(e) => set('data_limit_mb', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="plan-devices">Appareils maximum</Label>
                  <HelpTip title="Appareils maximum" text="Nombre de téléphones ou d’ordinateurs connectés en même temps avec ce forfait." />
                </div>
                <Input id="plan-devices" type="number" min={1} value={form.max_devices}
                  onChange={(e) => set('max_devices', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="plan-order">Ordre d’affichage</Label>
                  <HelpTip title="Ordre" text="Plus le nombre est petit, plus le forfait apparaît en haut de la liste." />
                </div>
                <Input id="plan-order" type="number" value={form.sort_order}
                  onChange={(e) => set('sort_order', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="plan-popular">Forfait populaire</Label>
                <HelpTip title="Populaire" text="Le forfait est mis en avant (badge) sur le portail. Un seul suffit." />
              </div>
              <Switch id="plan-popular" checked={form.is_popular}
                onCheckedChange={(v) => set('is_popular', v)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="plan-active">Forfait activé</Label>
                <HelpTip title="Activation" text="Un forfait désactivé reste enregistré mais n’est plus vendu." />
              </div>
              <Switch id="plan-active" checked={form.is_active}
                onCheckedChange={(v) => set('is_active', v)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              className="text-white"
              style={{ background: 'var(--brand-gradient)' }}
              disabled={upsert.isPending || !form.name.trim()}
              onClick={submit}
            >
              {upsert.isPending ? 'Enregistrement…' : form.id ? 'Enregistrer' : 'Créer le forfait'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer « {deleting?.name} » ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est définitive. Si vous souhaitez seulement arrêter de vendre ce forfait,
            désactivez-le plutôt avec l’interrupteur de la liste.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Annuler</Button>
            <Button variant="destructive" disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting)}>
              {remove.isPending ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
