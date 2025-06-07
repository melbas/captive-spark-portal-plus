
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserPlus } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h3 className="font-medium">{t("familyMembers")}</h3>
          <p className="text-sm text-muted-foreground">
            {remainingChanges}/{maxChanges} changements restants ce mois
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddMember}
          disabled={remainingChanges <= 0}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t("addMember")}
        </Button>
      </div>
      
      {remainingChanges <= 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Limite de changements atteinte pour ce mois. Les changements se réinitialiseront le mois prochain.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MemberStats;
