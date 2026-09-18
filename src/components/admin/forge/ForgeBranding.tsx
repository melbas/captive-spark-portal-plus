/**
 * ForgeBranding — onglet "Marque" de la Forge.
 * Extrait de la section design d'AdminSites (une seule source, pas de
 * duplication) : logo, couleur, messages. Édition en brouillon (dirty),
 * publication centralisée par AdminForge.
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Palette } from "lucide-react";
import type { SiteLike } from "@/lib/admin/site-context";

interface ForgeBrandingProps {
  site: SiteLike;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function ForgeBranding({ site, config, onChange }: ForgeBrandingProps) {
  const welcome = String(config.welcome_message ?? site.welcome_msg ?? "");
  const success = String(config.success_message ?? "");
  const color = String(config.theme_color ?? site.primary_color ?? "#5B4DFF");
  const logoUrl = String(config.logo_url ?? site.logo_url ?? "");

  return (
    <Card className="rounded-2xl shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" /> Marque
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Apparence du portail — l'aperçu live suit vos changements.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo */}
        <div className="space-y-1.5">
          <Label htmlFor="forge-logo">URL du logo</Label>
          <Input
            id="forge-logo"
            value={logoUrl}
            placeholder="https://…/logo.png"
            onChange={(e) => onChange("logo_url", e.target.value)}
          />
          {logoUrl && (
            <div className="h-12 w-24 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden p-1">
              <img src={logoUrl} alt="Aperçu logo" className="max-h-full max-w-full object-contain" />
            </div>
          )}
        </div>

        {/* Couleur principale */}
        <div className="space-y-1.5">
          <Label htmlFor="forge-color">Couleur principale</Label>
          <div className="flex items-center gap-2">
            <input
              id="forge-color"
              type="color"
              value={color}
              onChange={(e) => onChange("theme_color", e.target.value)}
              className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
            />
            <Input
              value={color}
              onChange={(e) => onChange("theme_color", e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* Message de bienvenue */}
        <div className="space-y-1.5">
          <Label htmlFor="forge-welcome">Message de bienvenue</Label>
          <Textarea
            id="forge-welcome"
            rows={3}
            value={welcome}
            onChange={(e) => onChange("welcome_message", e.target.value)}
          />
        </div>

        {/* Message de succès */}
        <div className="space-y-1.5">
          <Label htmlFor="forge-success">Message d'accès accordé</Label>
          <Textarea
            id="forge-success"
            rows={2}
            value={success}
            placeholder="Connexion accordée. Bonne navigation !"
            onChange={(e) => onChange("success_message", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
