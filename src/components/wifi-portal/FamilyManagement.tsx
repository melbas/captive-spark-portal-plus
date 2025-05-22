
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Plus, Users, UserPlus, UserX, UserCheck, AlertTriangle } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { UserData, FamilyProfile, FamilyMember } from "./types";
import { familyService } from "@/services/wifi/family-service";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FamilyManagementProps {
  userData: UserData;
  onBack: () => void;
}

const FamilyManagement: React.FC<FamilyManagementProps> = ({ userData, onBack }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  
  // État pour l'ajout d'un nouveau membre
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    macAddress: ""
  });
  
  // Charger le profil familial s'il existe
  useEffect(() => {
    const loadFamilyProfile = async () => {
      if (userData.familyId) {
        setLoading(true);
        try {
          const profile = await familyService.getFamilyProfile(userData.familyId);
          setFamilyProfile(profile);
        } catch (error) {
          console.error("Error loading family profile:", error);
          toast.error(t("errorLoadingFamilyProfile"));
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadFamilyProfile();
  }, [userData.familyId, t]);
  
  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) {
      toast.error(t("familyNameRequired"));
      return;
    }
    
    setLoading(true);
    try {
      if (!userData.id) {
        toast.error(t("userNotAuthenticated"));
        return;
      }
      
      const profile = await familyService.createFamilyProfile(userData.id, newFamilyName);
      if (profile) {
        setFamilyProfile(profile);
        toast.success(t("familyProfileCreated"));
      } else {
        toast.error(t("errorCreatingFamilyProfile"));
      }
    } catch (error) {
      console.error("Error creating family profile:", error);
      toast.error(t("errorCreatingFamilyProfile"));
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      toast.error(t("memberNameRequired"));
      return;
    }
    
    if (!familyProfile?.id) {
      toast.error(t("familyProfileNotFound"));
      return;
    }
    
    setLoading(true);
    try {
      const member = await familyService.addFamilyMember(familyProfile.id, newMember);
      if (member) {
        // Rafraîchir le profil familial
        const updatedProfile = await familyService.getFamilyProfile(familyProfile.id);
        setFamilyProfile(updatedProfile);
        
        // Réinitialiser le formulaire
        setNewMember({
          name: "",
          email: "",
          phone: "",
          macAddress: ""
        });
        
        toast.success(t("memberAdded"));
      } else {
        toast.error(t("errorAddingMember"));
      }
    } catch (error) {
      console.error("Error adding family member:", error);
      toast.error(t("errorAddingMember"));
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!familyProfile?.id) {
      toast.error(t("familyProfileNotFound"));
      return;
    }
    
    if (!confirm(t("confirmRemoveMember"))) {
      return;
    }
    
    setLoading(true);
    try {
      const success = await familyService.removeFamilyMember(familyProfile.id, memberId);
      if (success) {
        // Rafraîchir le profil familial
        const updatedProfile = await familyService.getFamilyProfile(familyProfile.id);
        setFamilyProfile(updatedProfile);
        
        toast.success(t("memberRemoved"));
      } else {
        toast.error(t("errorRemovingMember"));
      }
    } catch (error) {
      console.error("Error removing family member:", error);
      toast.error(t("errorRemovingMember"));
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleMemberStatus = async (memberId: string, isActive: boolean) => {
    if (!familyProfile?.id) {
      toast.error(t("familyProfileNotFound"));
      return;
    }
    
    setLoading(true);
    try {
      const success = await familyService.toggleMemberStatus(familyProfile.id, memberId, isActive);
      if (success) {
        // Rafraîchir le profil familial
        const updatedProfile = await familyService.getFamilyProfile(familyProfile.id);
        setFamilyProfile(updatedProfile);
        
        toast.success(isActive ? t("memberActivated") : t("memberDeactivated"));
      } else {
        toast.error(t("errorUpdatingMemberStatus"));
      }
    } catch (error) {
      console.error("Error updating family member status:", error);
      toast.error(t("errorUpdatingMemberStatus"));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-2 top-2"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> {t("goBack")}
        </Button>
        <CardTitle className="text-center pt-4">
          {t("familyManagement")}
        </CardTitle>
        <CardDescription className="text-center">
          {familyProfile ? t("manageFamilyMembers") : t("createFamilyProfile")}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div>
          </div>
        ) : !familyProfile ? (
          <div className="space-y-4">
            <div className="p-6 bg-muted/30 rounded-lg text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">{t("createFamilyPlan")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("familyPlanDescription")}
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="familyName">{t("familyName")}</Label>
                  <Input
                    id="familyName"
                    placeholder={t("enterFamilyName")}
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleCreateFamily}
                  disabled={!newFamilyName.trim()}
                >
                  {t("createFamilyProfile")}
                </Button>
              </div>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("familyPlanCost")}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-medium">{familyProfile.name}</h3>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("owner")}:</span> {familyProfile.ownerName}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("members")}:</span> {familyProfile.memberCount}/{familyProfile.maxMembers}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("created")}:</span> {new Date(familyProfile.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("expires")}:</span> {new Date(familyProfile.expiresAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="members">{t("members")}</TabsTrigger>
                <TabsTrigger value="add">{t("addMember")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="members" className="space-y-4">
                {familyProfile.members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("noFamilyMembers")}
                  </div>
                ) : (
                  familyProfile.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.email || member.phone || t("noContactInfo")}
                        </div>
                      </div>
                      
                      {member.id !== familyProfile.ownerId && (
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleMemberStatus(member.id, !member.active)}
                          >
                            {member.active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="add" className="space-y-4">
                {familyProfile.memberCount >= familyProfile.maxMembers ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t("maxMembersReached")}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="memberName">{t("name")}</Label>
                      <Input
                        id="memberName"
                        placeholder={t("enterName")}
                        value={newMember.name}
                        onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="memberEmail">{t("email")}</Label>
                      <Input
                        id="memberEmail"
                        type="email"
                        placeholder={t("enterEmail")}
                        value={newMember.email}
                        onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="memberPhone">{t("phone")}</Label>
                      <Input
                        id="memberPhone"
                        placeholder={t("enterPhone")}
                        value={newMember.phone}
                        onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="memberMacAddress">{t("macAddress")}</Label>
                      <Input
                        id="memberMacAddress"
                        placeholder={t("enterMacAddress")}
                        value={newMember.macAddress}
                        onChange={(e) => setNewMember({...newMember, macAddress: e.target.value})}
                      />
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleAddMember}
                      disabled={!newMember.name.trim()}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("addMember")}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FamilyManagement;
