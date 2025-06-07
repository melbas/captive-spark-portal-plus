
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FamilyMemberData, FamilyRole } from "../types";
import { useLanguage } from "../../LanguageContext";
import MemberActions from "./MemberActions";

interface MemberRowProps {
  member: FamilyMemberData;
  isOwner: boolean;
  remainingChanges: number;
  onToggleStatus: (memberId: string) => void;
  onReplace: (memberId: string) => void;
  onRemove: (memberId: string) => void;
}

const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isOwner,
  remainingChanges,
  onToggleStatus,
  onReplace,
  onRemove
}) => {
  const { t } = useLanguage();

  const getRoleBadge = (role: FamilyRole) => {
    switch (role) {
      case FamilyRole.OWNER:
        return <Badge variant="default">{t("owner")}</Badge>;
      case FamilyRole.MEMBER:
        return <Badge variant="outline">{t("member")}</Badge>;
      case FamilyRole.CHILD:
        return <Badge variant="secondary">{t("child")}</Badge>;
      default:
        return null;
    }
  };

  return (
    <TableRow key={member.id}>
      <TableCell className="font-medium">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>{(member.name?.substring(0, 2) || "U").toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p>{member.name || t("unnamed")}</p>
            <p className="text-xs text-muted-foreground">
              {member.email || member.phone || t("noContact")}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>{getRoleBadge(member.role)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {member.active ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              {t("active")}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              SUSPENDU
            </Badge>
          )}
        </div>
      </TableCell>
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
    </TableRow>
  );
};

export default MemberRow;
