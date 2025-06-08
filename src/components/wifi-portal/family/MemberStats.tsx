
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserPlus, BarChart3 } from "lucide-react";
import { useLanguage } from "../../LanguageContext";

interface MemberStatsProps {
  isOwner: boolean;
  changesThisMonth: number;
  maxChanges: number;
  remainingChanges: number;
  onAddMember: () => void;
}

const MemberStats: React.FC<MemberStatsProps> = ({
  isOwner,
  changesThisMonth,
  maxChanges,
  remainingChanges,
  onAddMember
}) => {
  const { t } = useLanguage();

  if (!isOwner) return null;

  const progressPercentage = ((maxChanges - remainingChanges) / maxChanges) * 100;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
        <div className="flex flex-col space-y-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-lg">{t("familyMembers")}</h3>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {remainingChanges}/{maxChanges} changements restants ce mois
            </p>
            
            {/* Progress bar */}
            <div className="w-full sm:w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                Utilisés: {changesThisMonth}
              </span>
              <span className="bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                Restants: {remainingChanges}
              </span>
            </div>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onAddMember}
          disabled={remainingChanges <= 0}
          className="w-full sm:w-auto flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("addMember")}</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>
      
      {remainingChanges <= 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 animate-slide-in">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-pulse" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="font-medium">Limite atteinte !</span>
              <span className="text-sm">Les changements se réinitialiseront le mois prochain.</span>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MemberStats;
