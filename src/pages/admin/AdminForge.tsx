/**
 * FORGE — le studio de conception du portail (Style UniFi Landing Page Designer,
 * mais édite un PARCOURS complet, pas une simple splash page).
 *
 * Architecture : panneau de configuration à gauche + aperçu live à droite.
 * Onglets :
 *  - Parcours : préceptes activables et réordonnables (les 8 du catalogue)
 *  - Marque   : logo, couleur, messages (extrait d'AdminSites — une seule source)
 *  - Aperçu   : iframe ?preview=1 + sélecteur d'étape (le détail de chaque pas)
 *
 * Single source of truth : portal_config + portal_enabled_modules.
 * Brouillon ≠ publié : rien n'est écrit avant "Publier".
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCurrentSite } from "@/context/SiteContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Wand2, Eye, Save, Loader2, GripVertical, ArrowUp, ArrowDown,
  ChevronLeft, Monitor, Smartphone, RotateCw, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  moduleIcon, mergeModuleStates, moveFlowStep, toggleFlowStep,
  type ModuleState, portalUrl,
} from "@/lib/admin/modules";
import { ForgeJourney } from "@/components/admin/forge/ForgeJourney";
import { ForgeBranding } from "@/components/admin/forge/ForgeBranding";
import { ForgePreview } from "@/components/admin/forge/ForgePreview";

type Tab = "journey" | "branding" | "preview";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "journey", label: "Parcours", icon: Wand2 },
  { value: "branding", label: "Marque", icon: Palette },
  { value: "preview", label: "Aperçu", icon: Eye },
];

import { Palette } from "lucide-react";

export default function AdminForge() {
  const navigate = useNavigate();
  const { currentSite: site } = useCurrentSite();
  const [tab, setTab] = useState<Tab>("journey");
  const [modules, setModules] = useState<ModuleState[]>([]);
  const [flowOrder, setFlowOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Brouillon : édition locale, non écrite en base avant publication
  const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({});

  // ── Chargement : catalogue × activations + ordre du flow ──────────────
  const load = useCallback(async () => {
    if (!site) return;
    setLoading(true);
    try {
      const [cat, enabled, cfg] = await Promise.all([
        supabase.from("portal_modules").select("*").order("sort_order"),
        supabase
          .from("portal_enabled_modules")
          .select("module_id, is_enabled")
          .eq("portal_config_id", site.id),
        supabase
          .from("portal_config")
          .select("*")
          .eq("site_id", site.id)
          .maybeSingle(),
      ]);

      const states = mergeModuleStates(cat.data, enabled.data);
      setModules(states);

      // flow_order est une colonne nouvelle (migration non régénérée dans les
      // types générés) : lecture lâche, filtrage des orphelins.
      const rawOrder = (cfg.data as Record<string, unknown> | null)?.flow_order;
      const order = Array.isArray(rawOrder)
        ? rawOrder.filter((m) => states.some((s) => s.module_name === m))
        : states.filter((m) => m.enabled).map((m) => m.module_name);
      setFlowOrder(order as string[]);
      setDraftConfig(cfg.data ?? {});
      setDirty(false);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger la configuration du portail.");
    } finally {
      setLoading(false);
    }
  }, [site, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Publication : écrit les deux tables en une transaction logique ────
  const publish = async () => {
    if (!site || !dirty) return;
    setSaving(true);
    try {
      // 1. Ordre du parcours (colonne nouvelle : update lâche)
      const { error: cfgErr } = await supabase
        .from("portal_config")
        .update({ flow_order: flowOrder } as Record<string, unknown>)
        .eq("site_id", site.id);
      if (cfgErr) throw cfgErr;

      // 2. Activations (upsert : les 8 lignes, l'état est la source)
      const rows = modules.map((m) => ({
        portal_config_id: site.id,
        module_id: m.id,
        is_enabled: m.enabled,
      }));
      const { error: modErr } = await supabase
        .from("portal_enabled_modules")
        .upsert(rows, { onConflict: "portal_config_id,module_id" });
      if (modErr) throw modErr;

      await load();
      toast.success(`Portail publié — ${flowOrder.length} étape(s) active(s) pour ${site.name}.`);
    } catch (err) {
      console.error(err);
      toast.error("Échec de la publication. Vérifiez vos droits et réessayez.");
    } finally {
      setSaving(false);
    }
  };

  // ── Handlers transmis aux onglets ─────────────────────────────────────
  const toggleModule = (id: string) => {
    const m = modules.find((x) => x.id === id);
    if (!m) return;
    const nextEnabled = !m.enabled;
    setModules((prev) =>
      prev.map((x) => (x.id === id ? { ...x, enabled: nextEnabled } : x)),
    );
    setFlowOrder((prev) => toggleFlowStep(prev, m.module_name, nextEnabled));
    setDirty(true);
  };

  const moveStep = (module_name: string, dir: -1 | 1) => {
    setFlowOrder((prev) => moveFlowStep(prev, module_name, dir));
    setDirty(true);
  };

  const ordered = useMemo(() => {
    const byName = new Map(modules.map((m) => [m.module_name, m]));
    const active = flowOrder
      .map((n) => byName.get(n))
      .filter((m): m is ModuleState => Boolean(m));
    const inactive = modules.filter((m) => !flowOrder.includes(m.module_name));
    return { active, inactive };
  }, [modules, flowOrder]);

  if (!site) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sélectionnez un site pour forger son portail.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête :titre + statut brouillon/publié + action principale */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" /> Forge
          </h1>
          <p className="text-sm text-muted-foreground">
            Studio de conception du portail de <strong>{site.name}</strong> —
            parcours, marque et aperçu en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <Badge variant="secondary" className="text-amber-700 bg-amber-50 border-amber-200">
              Brouillon non publié
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Publié
            </Badge>
          )}
          <Button
            onClick={publish}
            disabled={!dirty || saving}
            className="gap-2"
            style={{ background: "var(--brand-gradient)" }}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Publier
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <Icon className="h-4 w-4" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 mt-4">
          <TabsContent value="journey" className="mt-0">
            <ForgeJourney
              loading={loading}
              ordered={ordered}
              flowOrder={flowOrder}
              onToggle={toggleModule}
              onMove={moveStep}
            />
          </TabsContent>

          <TabsContent value="branding" className="mt-0">
            <ForgeBranding
              site={site}
              config={draftConfig}
              onChange={(k, v) => {
                setDraftConfig((p) => ({ ...p, [k]: v }));
                setDirty(true);
              }}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-0 col-span-full">
            <ForgePreview site={site} flowOrder={flowOrder} />
          </TabsContent>

          {/* Aperçu live persistant à droite (tous les onglets), style UniFi */}
          {tab !== "preview" && (
            <Card className="h-fit lg:sticky lg:top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Aperçu live
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ForgePreview site={site} flowOrder={flowOrder} embedded />
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>
    </div>
  );
}
