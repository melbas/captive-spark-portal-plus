
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FamilyMemberData } from "../types";
import { useLanguage } from "../../LanguageContext";
import MemberRow from "./MemberRow";

interface MembersTableProps {
  familyMembers: FamilyMemberData[];
  isOwner: boolean;
  remainingChanges: number;
  onToggleStatus: (memberId: string) => void;
  onReplace: (memberId: string) => void;
  onRemove: (memberId: string) => void;
}

const MembersTable: React.FC<MembersTableProps> = ({
  familyMembers,
  isOwner,
  remainingChanges,
  onToggleStatus,
  onReplace,
  onRemove
}) => {
  const { t } = useLanguage();

  if (familyMembers.length === 0) {
    return (
      <Card className="bg-muted/20">
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">{t("noFamilyMembers")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("member")}</TableHead>
          <TableHead>{t("role")}</TableHead>
          <TableHead>{t("status")}</TableHead>
          {isOwner && <TableHead className="text-right">{t("actions")}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {familyMembers.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isOwner={isOwner}
            remainingChanges={remainingChanges}
            onToggleStatus={onToggleStatus}
            onReplace={onReplace}
            onRemove={onRemove}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default MembersTable;
