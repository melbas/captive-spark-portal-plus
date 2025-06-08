
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
      <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-full animate-fade-in">
        {t("owner")}
      </span>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto animate-fade-in">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onToggleStatus(memberId)}
        className="w-full sm:w-auto text-xs px-3 py-1 h-8 transition-all duration-200 hover:scale-105"
      >
        {isActive ? "Suspendre" : "Réactiver"}
      </Button>
      {isActive && (
        <div className="flex flex-col sm:flex-row gap-2 animate-slide-in">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => onReplace(memberId)}
            disabled={remainingChanges <= 0}
            className="w-full sm:w-auto text-xs px-3 py-1 h-8 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remplacer
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => onRemove(memberId)}
            disabled={remainingChanges <= 0}
            className="w-full sm:w-auto text-xs px-3 py-1 h-8 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("remove")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MemberActions;
