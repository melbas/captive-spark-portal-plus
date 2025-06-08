
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
      <Card className="bg-muted/20 animate-fade-in">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">{t("noFamilyMembers")}</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Invitez des membres pour commencer
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {familyMembers.map((member, index) => (
          <Card key={member.id} className="p-4 hover:shadow-md transition-all duration-200 animate-slide-in" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.name || member.email}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    member.active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {member.active ? 'Actif' : 'Suspendu'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="bg-muted px-2 py-1 rounded-full">
                  {member.role === 'owner' ? t("owner") : 'Membre'}
                </span>
              </div>
              
              {isOwner && (
                <div className="pt-2 border-t">
                  <MemberRow
                    member={member}
                    isOwner={isOwner}
                    remainingChanges={remainingChanges}
                    onToggleStatus={onToggleStatus}
                    onReplace={onReplace}
                    onRemove={onRemove}
                    isMobileView={true}
                  />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">{t("member")}</TableHead>
              <TableHead className="font-semibold">{t("role")}</TableHead>
              <TableHead className="font-semibold">{t("status")}</TableHead>
              {isOwner && <TableHead className="text-right font-semibold">{t("actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {familyMembers.map((member, index) => (
              <MemberRow
                key={member.id}
                member={member}
                isOwner={isOwner}
                remainingChanges={remainingChanges}
                onToggleStatus={onToggleStatus}
                onReplace={onReplace}
                onRemove={onRemove}
                animationDelay={index * 100}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MembersTable;
