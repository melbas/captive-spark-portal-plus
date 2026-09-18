/**
 * AdminKits — catalogue des Kits d'onboarding (sélection -> pré-remplit la Forge).
 *
 * Le Kit n'est PAS un éditeur : il pré-remplit ce que la Forge affine ensuite.
 * Une seule source de vérité : l'application écrit dans les mêmes tables que
 * la Forge lit (portal_config + portal_enabled_modules).
 *
 * Garde-fou : ne JAMAIS écraser un travail manuel sans confirmation.
 */
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as Icons from "lucide-react";
import { Package, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentSite } from "@/context/SiteContext";
import { moduleIcon } from "@/lib/admin/modules";

interface Kit {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  site_type: string | null;
  recommended_modules: string[];
  default_config: Record<string, unknown>;
}

export default function AdminKits() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { currentSite: site, canEdit } = useCurrentSite();
  const [pending, setPending] = useState<Kit | null>(null);

  const kits = useQuery({
    queryKey: ["portal-kits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_kits")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Kit[];
    },
  });

  // Combien de modules sont DÉJÀ activés manuellement ? (garde-fou)
  const existingCount = useQuery({
    queryKey: ["portal-enabled-count", site?.id],
    queryFn: async () => {
      if (!site) return 0;
      const { count, error } = await supabase
        .from("portal_enabled_modules")
        .select("*", { count: "exact", head: true })
        .eq("portal_config_id", site.id)
        .eq("is_enabled", true);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!site,
  });

  const apply = useMutation({
    mutationFn: async (kit: Kit) => {
      if (!site) throw new Error("Aucun site sélectionné");
      // 1. Config de pré-remplissage (uniquement les clés du kit).
      // kit_id/flow_order : colonnes nouvelles, types non régénérés → cast.
      const patch = { ...kit.default_config, kit_id: kit.id } as Record<string, unknown>;
      const { error: cfgErr } = await supabase
        .from("portal_config")
        .update(patch)
        .eq("site_id", site.id);
      if (cfgErr) throw cfgErr;

      // 2. Modules recommandés : il faut leurs ids (join par module_name)
      const { data: mods, error: modsErr } = await supabase
        .from("portal_modules")
        .select("id, module_name")
        .in("module_name", kit.recommended_modules);
      if (modsErr) throw modsErr;

      const rows = (mods ?? []).map((m) => ({
        portal_config_id: site.id,
        module_id: m.id,
        is_enabled: true,
      }));
      if (rows.length > 0) {
        const { error: enErr } = await supabase
          .from("portal_enabled_modules")
          .upsert(rows, { onConflict: "portal_config_id,module_id" });
        if (enErr) throw enErr;
      }
      return kit;
    },
    onSuccess: (kit) => {
      qc.invalidateQueries({ queryKey: ["portal-enabled-count"] });
      qc.invalidateQueries({ queryKey: ["portal-modules"] });
      toast.success(`Kit « ${kit.name} » appliqué. Personnalisez-le dans la Forge.`);
      setPending(null);
      navigate("/admin/forge");
    },
    onError: (err) => {
      toast.error("Échec de l'application du kit : " + String(err.message ?? err));
      setPending(null);
    },
  });

  if (!site) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sélectionnez un site pour choisir son Kit.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" /> Kits
        </h1>
        <p className="text-sm text-muted-foreground">
          Point de départ en 1 clic pour <strong>{site.name}</strong>. Le Kit
          pré-remplit la configuration — vous gardez la main dans la Forge.
        </p>
      </div>

      {kits.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kits.data?.map((kit) => (
            <KitCard
              key={kit.id}
              kit={kit}
              canEdit={canEdit}
              onApply={() => setPending(kit)}
            />
          ))}
        </div>
      )}

      {/* Confirmation : on n'écrase pas un travail manuel sans avertissement */}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Appliquer le Kit « {pending?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              {(existingCount.data ?? 0) > 0 ? (
                <>
                  <strong className="text-amber-700">
                    {existingCount.data} précepte(s) sont déjà activés
                  </strong>{" "}
                  manuellement sur ce site. Le Kit les <strong>remplacera</strong> par
                  sa propre sélection.
                </>
              ) : (
                <>Le Kit va pré-remplir la configuration et activer ses préceptes.</>
              )}{" "}
              Vous pourrez tout ajuster dans la Forge ensuite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && apply.mutate(pending)}
              disabled={apply.isPending}
            >
              {apply.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Appliquer et ouvrir la Forge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KitCard({
  kit,
  canEdit,
  onApply,
}: {
  kit: Kit;
  canEdit: boolean;
  onApply: () => void;
}) {
  const IconComp = (Icons as unknown as Record<string, React.ElementType>)[
    kit.icon
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("")
  ] ?? Icons.Package;

  return (
    <Card className="rounded-2xl shadow-[var(--shadow-card)] flex flex-col">
      <CardContent className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--brand-gradient)" }}
          >
            <IconComp className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight">{kit.name}</h3>
            {kit.site_type && (
              <Badge variant="outline" className="text-[10px] mt-1">
                {kit.site_type}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
          {kit.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {kit.recommended_modules.slice(0, 4).map((m) => (
            <Badge key={m} variant="secondary" className="text-[10px] font-normal">
              {m}
            </Badge>
          ))}
          {kit.recommended_modules.length > 4 && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              +{kit.recommended_modules.length - 4}
            </Badge>
          )}
        </div>
        <Button
          onClick={onApply}
          disabled={!canEdit}
          className="w-full gap-2"
          style={{ background: "var(--brand-gradient)" }}
        >
          <Check className="h-4 w-4" /> Appliquer ce Kit
        </Button>
      </CardContent>
    </Card>
  );
}
