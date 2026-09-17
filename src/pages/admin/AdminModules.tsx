/**
 * PAGE MODULES DU PARCOURS — grille de toggles par site.
 * Catalogue : portal_modules (12 modules seedés). Activations : portal_enabled_modules
 * rattachées au portal_config du site (créé à la volée si absent).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Gamepad2, Gift, GraduationCap, Mail, Megaphone, MonitorPlay,
  MessageSquare, Share2, ShoppingBag, Sparkles, Wallet, Puzzle, type LucideIcon,
} from 'lucide-react';
import HelpTip from '@/components/admin/HelpTip';
import { toast } from 'sonner';
import { useCurrentSite } from '@/context/SiteContext';
import { mergeModuleStates, moduleIcon, type CatalogueModule, type EnabledRow } from '@/lib/admin/modules';

const ICON_COMPONENTS: Record<string, LucideIcon> = {
  'message-square': MessageSquare,
  mail: Mail,
  'share-2': Share2,
  'gamepad-2': Gamepad2,
  gift: Gift,
  'monitor-play': MonitorPlay,
  wallet: Wallet,
  'shopping-cart': ShoppingBag,
  'graduation-cap': GraduationCap,
  megaphone: Megaphone,
  sparkles: Sparkles,
  puzzle: Puzzle,
};

const CATEGORY_LABELS: Record<string, string> = {
  auth: 'Connexion',
  engagement: 'Divertissement',
  business: 'Business',
  other: 'Autres',
};

export default function AdminModules() {
  const qc = useQueryClient();
  const { currentSite, canEdit } = useCurrentSite();
  const site = currentSite;

  const catalogue = useQuery({
    queryKey: ['portal-modules-catalogue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_modules')
        .select('id, module_name, display_name, description, category')
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as CatalogueModule[];
    },
    enabled: !!site,
  });

  // portal_config du site (source des portal_enabled_modules). Créé à la volée.
  const ensureConfig = async (): Promise<string> => {
    if (!site) throw new Error('Aucun site sélectionné.');
    const { data: existing } = await supabase
      .from('portal_config')
      .select('id')
      .eq('site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created, error } = await supabase
      .from('portal_config')
      .insert({ site_id: site.id, portal_name: site.name })
      .select('id')
      .single();
    if (error) throw error;
    return created.id;
  };

  const enabledRows = useQuery({
    queryKey: ['portal-enabled-modules', site?.id],
    queryFn: async () => {
      const configId = await ensureConfig();
      const { data, error } = await supabase
        .from('portal_enabled_modules')
        .select('module_id, is_enabled')
        .eq('portal_config_id', configId);
      if (error) throw error;
      return (data ?? []) as EnabledRow[];
    },
    enabled: !!site,
  });

  const toggle = useMutation({
    mutationFn: async ({ moduleId, next }: { moduleId: string; next: boolean }) => {
      const configId = await ensureConfig();
      const { data: existing } = await supabase
        .from('portal_enabled_modules')
        .select('id')
        .eq('portal_config_id', configId)
        .eq('module_id', moduleId)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from('portal_enabled_modules')
          .update({ is_enabled: next })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('portal_enabled_modules').insert({
          portal_config_id: configId,
          module_id: moduleId,
          is_enabled: next,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-enabled-modules', site?.id] });
      toast.success('Module mis à jour.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modules = mergeModuleStates(catalogue.data, enabledRows.data);
  const activeCount = modules.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Modules du parcours</h1>
        <Badge variant="secondary">{activeCount} activé(s) sur {modules.length}</Badge>
      </div>

      <HelpTip
        variant="banner"
        title="Choisissez ce que vos clients voient sur le portail Wi-Fi"
        text={`Chaque module est une brique du portail : connexion, jeux, vidéos, boutique… Activez seulement ce qui est utile à « ${site?.name ?? 'votre site'} ». Le portail se met à jour immédiatement après chaque bascule.`}
      />

      {!site ? (
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Choisissez un site en haut de l’écran pour voir ses modules." />
      ) : catalogue.isLoading || enabledRows.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : catalogue.isError || enabledRows.isError ? (
        <HelpTip variant="banner" title="Impossible de charger les modules"
          text="Vérifiez votre connexion puis rechargez la page. Si le problème persiste, contactez le support technique." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const Icon = ICON_COMPONENTS[moduleIcon(m.module_name)] ?? Puzzle;
            const category = CATEGORY_LABELS[m.category ?? 'other'] ?? m.category ?? '';
            return (
              <Card
                key={m.id}
                className={
                  'rounded-2xl shadow-[var(--shadow-card)] transition-all ' +
                  (m.enabled ? 'border-brand-primary/40 ring-1 ring-brand-primary/20' : 'opacity-80')
                }
              >
                <CardContent className="flex h-full items-start gap-4 p-5">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: 'var(--brand-gradient)' }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold leading-tight">{m.display_name}</p>
                        {category && (
                          <span className="text-xs text-muted-foreground">{category}</span>
                        )}
                      </div>
                      <Switch
                        checked={m.enabled}
                        disabled={!canEdit || toggle.isPending}
                        onCheckedChange={(next) => toggle.mutate({ moduleId: m.id, next })}
                        aria-label={`Activer ${m.display_name}`}
                      />
                    </div>
                    {m.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
