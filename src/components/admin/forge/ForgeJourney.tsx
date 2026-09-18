/**
 * ForgeJourney — onglet "Parcours" de la Forge.
 * Liste verticale des préceptes actifs, réordonnable (↑↓), + les inactifs.
 * Langue visuelle : cards rounded-2xl + icône carrée en gradient (AdminModules).
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import * as Icons from "lucide-react";
import {
  ArrowUp, ArrowDown, GripVertical, Wand2, Plus,
} from "lucide-react";
import { moduleIcon, type ModuleState } from "@/lib/admin/modules";
import type { SiteLike } from "@/lib/admin/site-context";

interface ForgeJourneyProps {
  loading: boolean;
  ordered: { active: ModuleState[]; inactive: ModuleState[] };
  flowOrder: string[];
  onToggle: (id: string) => void;
  onMove: (module_name: string, dir: -1 | 1) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  Monétisation: "Monétisation",
  Engagement: "Engagement",
  Rétention: "Rétention",
  Acquisition: "Acquisition",
  Valeur: "Valeur",
};

export function ForgeJourney({
  loading,
  ordered,
  flowOrder,
  onToggle,
  onMove,
}: ForgeJourneyProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Étapes fixes du parcours (non désactivables) */}
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> Étapes du parcours
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Les étapes fixes (connexion, succès) sont toujours présentes. Activez
            et ordonnez les préceptes ci-dessous — l'aperçu suit en direct.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <FixedStep index={1} label="Connexion" hint="Authentification du visiteur" />
          <div className="flex items-center justify-center text-muted-foreground/40 py-0.5">
            <Icons.ChevronDown className="h-4 w-4" />
          </div>
          <div className="ml-3 pl-4 border-l-2 border-dashed border-border space-y-2">
            {ordered.active.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
                Aucun précepte actif — le visiteur se connecte puis accède
                directement à Internet.
              </p>
            )}
            {ordered.active.map((m, i) => (
              <PreceptRow
                key={m.id}
                step={i + 2}
                module={m}
                canUp={i > 0}
                canDown={i < ordered.active.length - 1}
                onToggle={() => onToggle(m.id)}
                onMove={(dir) => onMove(m.module_name, dir)}
              />
            ))}
          </div>
          <div className="flex items-center justify-center text-muted-foreground/40 py-0.5">
            <Icons.ChevronDown className="h-4 w-4" />
          </div>
          <FixedStep
            index={ordered.active.length + 3}
            label="Accès accordé"
            hint="Redirection vers Internet"
          />
        </CardContent>
      </Card>

      {/* Préceptes disponibles (inactifs) */}
      {ordered.inactive.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" /> Préceptes disponibles
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            {ordered.inactive.map((m) => (
              <PreceptRow
                key={m.id}
                module={m}
                compact
                onToggle={() => onToggle(m.id)}
                onMove={() => {}}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FixedStep({
  index,
  label,
  hint,
}: {
  index: number;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
      <span className="h-6 w-6 rounded-md bg-muted-foreground/15 text-muted-foreground text-xs font-semibold flex items-center justify-center">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Badge variant="outline" className="text-[10px]">Fixe</Badge>
    </div>
  );
}

function PreceptRow({
  step,
  module,
  compact,
  canUp,
  canDown,
  onToggle,
  onMove,
}: {
  step?: number;
  module: ModuleState;
  compact?: boolean;
  canUp?: boolean;
  canDown?: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const IconComp = (Icons as unknown as Record<string, React.ElementType>)[
    iconNameToComp(moduleIcon(module.module_name))
  ] ?? Icons.Puzzle;

  return (
    <div
      className={cnRow(compact)}
      aria-label={`Précepte ${module.display_name}`}
    >
      {!compact && (
        <span className="h-6 w-6 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
          {step}
        </span>
      )}
      <div
        className={cnIconBox(compact)}
        style={{ background: "var(--brand-gradient)" }}
      >
        <IconComp className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">
          {module.display_name}
        </p>
        {!compact && module.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {module.description}
          </p>
        )}
      </div>
      {!compact && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canUp}
            onClick={() => onMove(-1)}
            aria-label="Monter"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canDown}
            onClick={() => onMove(1)}
            aria-label="Descendre"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <Switch checked={module.enabled} onCheckedChange={onToggle} aria-label="Activer" />
    </div>
  );
}

/** modules.ts stocke des clés lucide 'kebab-case' ; le composant est 'PascalCase'. */
function iconNameToComp(icon: string): string {
  return icon
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function cnRow(compact?: boolean) {
  return [
    "flex items-center gap-3 rounded-xl border border-border p-3",
    "transition-colors hover:bg-accent/50",
    compact ? "h-auto" : "",
  ].join(" ");
}

function cnIconBox(compact?: boolean) {
  return [
    "rounded-lg flex items-center justify-center shrink-0",
    compact ? "h-8 w-8" : "h-9 w-9",
  ].join(" ");
}
