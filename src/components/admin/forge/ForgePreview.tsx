/**
 * ForgePreview — aperçu live du portail (style UniFi Landing Page Designer :
 * preview intégré à droite, qui se rafraîchit à chaque changement).
 *
 * Réutilise portalUrl(draft=true) → ?preview=1 (version en cours d'édition).
 * Sélecteur d'étape : bascule l'étape courante du portail via postMessage.
 * C'est notre différence avec UniFi : on prévisualise un PARCOURS entier,
 * pas une seule splash page.
 */
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, RotateCw, Monitor, Smartphone,
} from "lucide-react";
import { portalUrl } from "@/lib/admin/modules";
import type { SiteLike } from "@/lib/admin/site-context";

interface ForgePreviewProps {
  site: SiteLike;
  flowOrder: string[];
  /** Intégré dans le panneau droit (pas de cadre/en-tête supplémentaire) */
  embedded?: boolean;
}

const DEVICE_LABELS: Record<string, string> = {
  auth: "Connexion",
  engagement: "Engagement",
  "extend-time": "Temps offert",
  payment: "Accès payant",
  "mini-games": "Mini-jeux",
  rewards: "Récompenses",
  referral: "Parrainage",
  "learning-center": "Learning Center",
  success: "Accès accordé",
};

const BASE_STEPS = ["auth", "engagement", "success"];

export function ForgePreview({ site, flowOrder, embedded }: ForgePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [key, setKey] = useState(0);

  // Le parcours complet : étapes fixes + préceptes actifs (ordre de la Forge)
  const steps = [
    "auth",
    ...flowOrder.filter((s) => s !== "auth" && s !== "success"),
    "success",
  ];
  const [idx, setIdx] = useState(0);

  const url = portalUrl(window.location.origin, site.portal_slug, true);

  const gotoStep = (i: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, i));
    setIdx(next);
    // Le portail écoute ce message pour basculer son étape courante en preview
    iframeRef.current?.contentWindow?.postMessage(
      { type: "forge:goto-step", step: steps[next] },
      window.location.origin,
    );
  };

  const reload = () => setKey((k) => k + 1);

  return (
    <div className={embedded ? "space-y-2" : "space-y-3"}>
      {/* Barre de contrôle : appareil + rafraîchir */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <Button
            variant={device === "mobile" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1"
            onClick={() => setDevice("mobile")}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </Button>
          <Button
            variant={device === "desktop" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1"
            onClick={() => setDevice("desktop")}
          >
            <Monitor className="h-3.5 w-3.5" /> Bureau
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={reload}>
          <RotateCw className="h-3.5 w-3.5" /> Rafraîchir
        </Button>
      </div>

      {/* Cadre de preview */}
      <div className="flex justify-center">
        <div
          className={
            device === "mobile"
              ? "w-[300px] rounded-[2rem] border-4 border-zinc-800 bg-zinc-900 p-2 shadow-xl"
              : "w-full max-w-2xl rounded-xl border border-border bg-zinc-900 p-2 shadow-lg"
          }
        >
          <iframe
            key={key}
            ref={iframeRef}
            src={url}
            title="Aperçu du portail"
            className="w-full rounded-lg bg-white"
            style={{
              height: device === "mobile" ? "420px" : "440px",
              border: 0,
            }}
          />
        </div>
      </div>

      {/* Sélecteur d'étape : la différence vs UniFi (parcours, pas page) */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          disabled={idx <= 0}
          onClick={() => gotoStep(idx - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Badge variant="secondary" className="text-xs">
          Étape {idx + 1}/{steps.length} — {DEVICE_LABELS[steps[idx]] ?? steps[idx]}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          disabled={idx >= steps.length - 1}
          onClick={() => gotoStep(idx + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center truncate">
        {url}
      </p>
    </div>
  );
}
