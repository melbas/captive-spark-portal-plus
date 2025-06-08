
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FamilyMemberData } from "../types";
import { useLanguage } from "../../LanguageContext";
import MemberActions from "./MemberActions";

interface MemberRowProps {
  member: FamilyMemberData;
  isOwner: boolean;
  remainingChanges: number;
  onToggleStatus: (memberId: string) => void;
  onReplace: (memberId: string) => void;
  onRemove: (memberId: string) => void;
  isMobileView?: boolean;
  animationDelay?: number;
}

const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isOwner,
  remainingChanges,
  onToggleStatus,
  onReplace,
  onRemove,
  isMobileView = false,
  animationDelay = 0
}) => {
  const { t } = useLanguage();

  if (isMobileView) {
    return (
      <div className="w-full">
        <MemberActions
          memberId={member.id}
          memberRole={member.role}
          isActive={member.active}
          isOwner={isOwner}
          remainingChanges={remainingChanges}
          onToggleStatus={onToggleStatus}
          onReplace={onReplace}
          onRemove={onRemove}
        />
      </div>
    );
  }

  return (
    <TableRow 
      className="hover:bg-muted/50 transition-all duration-200 animate-slide-in group"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-200 group-hover:bg-primary/20">
            <span className="text-xs font-medium text-primary">
              {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium">{member.name || member.email}</div>
            {member.name && (
              <div className="text-sm text-muted-foreground">{member.email}</div>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge 
          variant={member.role === 'owner' ? 'default' : 'secondary'}
          className="transition-all duration-200 hover:scale-105"
        >
          {member.role === 'owner' ? t("owner") : 'Membre'}
        </Badge>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
            member.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className={`text-sm font-medium ${
            member.active ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          }`}>
            {member.active ? 'Actif' : 'Suspendu'}
          </span>
        </div>
      </TableCell>
      
      {isOwner && (
        <TableCell className="text-right">
          <MemberActions
            memberId={member.id}
            memberRole={member.role}
            isActive={member.active}
            isOwner={isOwner}
            remainingChanges={remainingChanges}
            onToggleStatus={onToggleStatus}
            onReplace={onReplace}
            onRemove={onRemove}
          />
        </TableCell>
      )}
    </TableRow>
  );
};

export default MemberRow;
