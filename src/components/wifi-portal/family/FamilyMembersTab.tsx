
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useLanguage } from "../../LanguageContext";
import { FamilyMemberData, FamilyRole } from "../types";
import { familyService } from "@/services/wifi/family";
import AddMemberDialog from "./AddMemberDialog";

interface FamilyMembersTabProps {
  familyMembers: FamilyMemberData[];
  isOwner: boolean;
  pendingInvites: number;
  familyId: string;
  onUpdate: () => Promise<void>;
}

const FamilyMembersTab: React.FC<FamilyMembersTabProps> = ({ 
  familyMembers, 
  isOwner, 
  pendingInvites, 
  familyId, 
  onUpdate 
}) => {
  const { t } = useLanguage();
  const [showInviteDialog, setShowInviteDialog] = useState<boolean>(false);
  const [changeStats, setChangeStats] = useState({
    changesThisMonth: 0,
    maxChanges: 3,
    remainingChanges: 3
  });
  
  // Load change statistics
  useEffect(() => {
    const loadChangeStats = async () => {
      try {
        // In a real app, you'd get the current user ID from auth context
        const currentUserId = "mock-user-id"; // Replace with actual user ID
        const stats = await familyService.getUserChangeStats?.(currentUserId);
        if (stats) {
          setChangeStats(stats);
        }
      } catch (error) {
        console.error("Error loading change stats:", error);
      }
    };
    
    if (isOwner) {
      loadChangeStats();
    }
  }, [isOwner]);
  
  const { changesThisMonth, maxChanges, remainingChanges } = changeStats;
  
  const handleToggleMemberStatus = async (memberId: string) => {
    try {
      // Find the current member's status to toggle it
      const member = familyMembers.find(m => m.id === memberId);
      if (!member) return;
      
      const newStatus = !member.active;
      const result = await familyService.toggleMemberStatus(memberId, newStatus);
      
      if (result) {
        const actionType = newStatus ? "reactivated" : "suspended";
        toast.success(newStatus ? t("memberReactivated") : t("memberSuspended"));
        await onUpdate();
        
        // Log the change (suspension/reactivation doesn't count as a monthly change)
        console.log(`Member ${actionType}:`, { memberId, familyId, actionType });
      } else {
        throw new Error("Failed to update member status");
      }
    } catch (error) {
      console.error("Error updating member status:", error);
      toast.error(t("errorUpdatingMember"));
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    // Check if user has remaining changes
    if (remainingChanges <= 0) {
      toast.error(`Limite atteinte: ${changesThisMonth}/${maxChanges} changements ce mois`);
      return;
    }
    
    if (confirm(t("confirmRemoveMember"))) {
      try {
        const result = await familyService.removeFamilyMember(memberId);
        if (result) {
          toast.success(t("memberRemoved"));
          await onUpdate();
          
          // Refresh change stats
          const currentUserId = "mock-user-id"; // Replace with actual user ID
          const newStats = await familyService.getUserChangeStats?.(currentUserId);
          if (newStats) {
            setChangeStats(newStats);
          }
          
          // Log the change as a monthly change
          console.log("Member removed:", { 
            memberId, 
            familyId, 
            changeType: "remove",
            changesThisMonth: changesThisMonth + 1 
          });
        } else {
          throw new Error("Failed to remove member");
        }
      } catch (error) {
        console.error("Error removing member:", error);
        toast.error(t("errorRemovingMember"));
      }
    }
  };

  const handleReplaceMember = async (memberId: string) => {
    // Check if user has remaining changes
    if (remainingChanges <= 0) {
      toast.error(`Limite atteinte: ${changesThisMonth}/${maxChanges} changements ce mois`);
      return;
    }
    
    // This would open a dialog to select a new member
    console.log("Replace member:", { memberId, remainingChanges });
    toast.info("Fonctionnalité de remplacement à implémenter");
  };

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
    <div className="space-y-4">
      {isOwner && (
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
            onClick={() => setShowInviteDialog(true)}
            disabled={remainingChanges <= 0}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t("addMember")}
          </Button>
          <AddMemberDialog 
            showDialog={showInviteDialog} 
            setShowDialog={setShowInviteDialog}
            familyId={familyId}
            onMemberAdded={onUpdate}
          />
        </div>
      )}
      
      {remainingChanges <= 0 && isOwner && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Limite de changements atteinte pour ce mois. Les changements se réinitialiseront le mois prochain.
          </AlertDescription>
        </Alert>
      )}
      
      {familyMembers.length === 0 ? (
        <Card className="bg-muted/20">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground">{t("noFamilyMembers")}</p>
          </CardContent>
        </Card>
      ) : (
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
                {isOwner && member.role !== FamilyRole.OWNER && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleMemberStatus(member.id)}
                      >
                        {member.active ? "Suspendre" : "Réactiver"}
                      </Button>
                      {member.active && (
                        <>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleReplaceMember(member.id)}
                            disabled={remainingChanges <= 0}
                          >
                            Remplacer
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={remainingChanges <= 0}
                          >
                            {t("remove")}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
                {isOwner && member.role === FamilyRole.OWNER && (
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground">{t("owner")}</span>
                  </TableCell>
                )}
                {!isOwner && (
                  <TableCell></TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      {pendingInvites > 0 && (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("pendingInvitations", { count: pendingInvites })}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FamilyMembersTab;
