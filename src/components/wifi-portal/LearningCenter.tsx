import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, GraduationCap, BookOpen, ExternalLink, Clock } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import type { UserData } from "./types";

/**
 * Learning Center — précepte `learning_center`.
 *
 * Rendu réel du 8e précepte du catalogue (miroir 1:1 avec
 * portal_modules.flow_step = 'learning-center').
 *
 * Le contenu est lu depuis la config publiée du site
 * (`portal_config.learning_resources`), posée par l'onglet "Contenu" de la
 * Forge. Aucune donnée n'est simulée : sans ressource publiée, le visiteur
 * voit un état vide explicite (fail-closed, même règle que `moduleOn`).
 */
export interface LearningResource {
  id: string;
  title: string;
  description?: string;
  url: string;
  durationMinutes?: number;
}

interface LearningCenterProps {
  userData: UserData;
  onBack: () => void;
  resources?: LearningResource[];
}

const LearningCenter: React.FC<LearningCenterProps> = ({ onBack, resources = [] }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground"
          aria-label="Retour"
        >
          <ChevronLeft className="h-4 w-4" /> {t("back")}
        </Button>
      </div>

      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              <GraduationCap className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{t("learningCenter")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("learningCenterEmpty")}
            </p>
          ) : (
            resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent"
              >
                <BookOpen className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">{r.title}</p>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {r.description}
                    </p>
                  )}
                  {typeof r.durationMinutes === "number" && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" /> {r.durationMinutes} min
                    </p>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LearningCenter;
