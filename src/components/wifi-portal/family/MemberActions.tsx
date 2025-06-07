
import React from "react";
import { Button } from "@/components/ui/button";
import { FamilyRole } from "../types";
import { useLanguage } from "../../LanguageContext";

interface MemberActionsProps {
  memberId: string;
  memberRole: FamilyRole;
  isActive: boolean;
  isOwner: boolean;
  remainingChanges: number;
  onToggleStatus: (memberId: string) => void;
  onReplace: (memberId: string) => void;
  onRemove: (memberId: string) => void;
}

const MemberActions: React.FC<MemberActionsProps> = ({
  memberId,
  memberRole,
  isActive,
  isOwner,
  remainingChanges,
  onToggleStatus,
  onReplace,
  onRemove
}) => {
  const { t } = useLanguage();

  if (!isOwner) return null;

  if (memberRole === FamilyRole.OWNER) {
    return (
      <span className="text-xs text-muted-foreground">{t("owner")}</span>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onToggleStatus(memberId)}
      >
        {isActive ? "Suspendre" : "Réactiver"}
      </Button>
      {isActive && (
        <>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => onReplace(memberId)}
            disabled={remainingChanges <= 0}
          >
            Remplacer
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => onRemove(memberId)}
            disabled={remainingChanges <= 0}
          >
            {t("remove")}
          </Button>
        </>
      )}
    </div>
  );
};

export default MemberActions;
