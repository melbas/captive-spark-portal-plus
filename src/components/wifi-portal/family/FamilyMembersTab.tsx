
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { FamilyMemberData } from "../types";
import { familyService } from "@/services/wifi/family";
import AddMemberDialog from "./AddMemberDialog";
import MemberStats from "./MemberStats";
import MembersTable from "./MembersTable";
import PendingInvitesAlert from "./PendingInvitesAlert";

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
        toast.success(newStatus ? "Membre réactivé" : "Membre suspendu");
        await onUpdate();
        
        // Log the change (suspension/reactivation doesn't count as a monthly change)
        console.log(`Member ${actionType}:`, { memberId, familyId, actionType });
      } else {
        throw new Error("Failed to update member status");
      }
    } catch (error) {
      console.error("Error updating member status:", error);
      toast.error("Erreur lors de la mise à jour du membre");
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    // Check if user has remaining changes
    if (remainingChanges <= 0) {
      toast.error(`Limite atteinte: ${changesThisMonth}/${maxChanges} changements ce mois`);
      return;
    }
    
    if (confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")) {
      try {
        const result = await familyService.removeFamilyMember(memberId);
        if (result) {
          toast.success("Membre supprimé");
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
        toast.error("Erreur lors de la suppression du membre");
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

  const handleAddMember = () => {
    setShowInviteDialog(true);
  };
  
  return (
    <div className="space-y-4">
      <MemberStats
        isOwner={isOwner}
        changesThisMonth={changesThisMonth}
        maxChanges={maxChanges}
        remainingChanges={remainingChanges}
        onAddMember={handleAddMember}
      />

      <MembersTable
        familyMembers={familyMembers}
        isOwner={isOwner}
        remainingChanges={remainingChanges}
        onToggleStatus={handleToggleMemberStatus}
        onReplace={handleReplaceMember}
        onRemove={handleRemoveMember}
      />

      <PendingInvitesAlert pendingInvites={pendingInvites} />

      <AddMemberDialog 
        showDialog={showInviteDialog} 
        setShowDialog={setShowInviteDialog}
        familyId={familyId}
        onMemberAdded={onUpdate}
      />
    </div>
  );
};

export default FamilyMembersTab;
