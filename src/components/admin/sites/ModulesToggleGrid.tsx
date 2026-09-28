/**
 * ModulesToggleGrid — grille de toggles « Modules du parcours » pour un site
 * donné (siteId explicite, indépendant du SiteContext).
 * Lit le catalogue (portal_modules), upsert l'état activé par site
 * (portal_enabled_modules via le portal_config du site, créé à la volée).
 *
 * Réutilise mergeModuleStates / moduleIcon de @/lib/admin/modules.
 * Extrait d'AdminModules (Task 12) : AdminModules délègue ici avec son site courant.
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
import { toast } from 'sonner';
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

interface ModulesToggleGridProps {
  /** sites.id (uuid textuel en base). */
  siteId: string;
  /** Désactive les toggles (viewer ou mutation en cours). */
  canEdit?: boolean;
}

export default function ModulesToggleGrid({ siteId, canEdit = true }: ModulesToggleGridProps) {
  const qc = useQueryClient();

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
  });

  // portal_config du site (source des portal_enabled_modules). Créé à la volée.
  const ensureConfig = async (): Promise<string> => {
    const { data: existing } = await supabase
      .from('portal_config')
      .select('id')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created, error } = await supabase
      .from('portal_config')
      .insert({ site_id: siteId })
      .select('id')
      .single();
    if (error) throw error;
    return created.id;
  };

  const enabledRows = useQuery({
    queryKey: ['portal-enabled-modules', siteId],
    queryFn: async () => {
      const configId = await ensureConfig();
      const { data, error } = await supabase
        .from('portal_enabled_modules')
        .select('module_id, is_enabled')
        .eq('portal_config_id', configId);
      if (error) throw error;
      return (data ?? []) as EnabledRow[];
    },
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
      qc.invalidateQueries({ queryKey: ['portal-enabled-modules', siteId] });
      toast.success('Module mis à jour.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modules = mergeModuleStates(catalogue.data, enabledRows.data);
  const activeCount = modules.filter((m) => m.enabled).length;

  if (catalogue.isLoading || enabledRows.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  if (catalogue.isError || enabledRows.isError) {
    return (
      <p className="text-sm text-muted-foreground">Impossible de charger les modules.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{activeCount} activé(s) sur {modules.length}</Badge>
      </div>
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
    </div>
  );
}
