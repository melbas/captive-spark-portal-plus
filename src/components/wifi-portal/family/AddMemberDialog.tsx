
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Users } from "lucide-react";
import { useLanguage } from "../../LanguageContext";
import { FamilyRole } from "../types";
import { toast } from "sonner";
import { familyService } from "@/services/wifi/family-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AddMemberDialogProps {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  familyId: string;
  onMemberAdded: () => Promise<void>;
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  showDialog,
  setShowDialog,
  familyId,
  onMemberAdded
}) => {
  const { t } = useLanguage();
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberPhone, setNewMemberPhone] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<FamilyRole>("member");
  const [inviteProcessing, setInviteProcessing] = useState<boolean>(false);

  const handleAddMember = async () => {
    if (!newMemberEmail && !newMemberPhone) {
      toast.error(t("needContactInfo"));
      return;
    }

    setInviteProcessing(true);
    try {
      // Pour cette démo, nous allons simuler l'ajout direct d'un utilisateur
      // sans passer par le processus d'invitation

      const mockUserData = {
        id: `usr-${Math.random().toString(36).substring(2, 8)}`,
        name: newMemberName,
        email: newMemberEmail,
        phone: newMemberPhone
      };

      const result = await familyService.addFamilyMember(
        familyId,
        mockUserData,
        newMemberRole
      );

      if (result) {
        toast.success(t("memberAdded"));
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberPhone("");
        setShowDialog(false);
        await onMemberAdded();
      } else {
        throw new Error("Failed to add member");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error(t("errorAddingMember"));
    } finally {
      setInviteProcessing(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          {t("addMember")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addFamilyMember")}</DialogTitle>
          <DialogDescription>
            {t("addFamilyMemberDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="memberName">{t("name")}</Label>
            <Input 
              id="memberName"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberEmail">{t("email")}</Label>
            <Input 
              id="memberEmail"
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberPhone">{t("phone")}</Label>
            <Input 
              id="memberPhone"
              value={newMemberPhone}
              onChange={(e) => setNewMemberPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberRole">{t("role")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={newMemberRole === "member" ? "default" : "outline"}
                onClick={() => setNewMemberRole("member")}
                className="justify-start"
              >
                <Users className="h-4 w-4 mr-2" />
                {t("member")}
              </Button>
              <Button
                type="button"
                variant={newMemberRole === "child" ? "default" : "outline"}
                onClick={() => setNewMemberRole("child")}
                className="justify-start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"></path>
                </svg>
                {t("child")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {newMemberRole === "child" 
                ? t("childRoleExplanation") 
                : t("memberRoleExplanation")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDialog(false)}
          >
            {t("cancel")}
          </Button>
          <Button 
            onClick={handleAddMember}
            disabled={inviteProcessing || (!newMemberEmail && !newMemberPhone)}
          >
            {inviteProcessing ? (
              <>
                <div className="h-4 w-4 border-t-2 border-current rounded-full animate-spin mr-2"></div>
                {t("processing")}
              </>
            ) : t("addMember")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
