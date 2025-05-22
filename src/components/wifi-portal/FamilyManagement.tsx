
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, Activity, Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from "../LanguageContext";
import { UserData, FamilyRole } from "./types";
import { familyService } from "@/services/wifi/family-service";
import CreateFamilyCard from "./family/CreateFamilyCard";
import FamilyMembersTab from "./family/FamilyMembersTab";
import ActivityLogsTab from "./family/ActivityLogsTab";
import SettingsTab from "./family/SettingsTab";

interface FamilyManagementProps {
  userData: UserData;
  onBack: () => void;
}

const FamilyManagement: React.FC<FamilyManagementProps> = ({ userData, onBack }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [familyName, setFamilyName] = useState<string>("");
  const [showCreateFamily, setShowCreateFamily] = useState<boolean>(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<number>(0);
  
  const loadFamily = async () => {
    setLoading(true);
    try {
      if (userData.family) {
        // Utilisateur a déjà une famille
        const familyProfile = await familyService.getFamilyProfile(userData.family);
        if (familyProfile) {
          setFamilyName(familyProfile.name);
          
          // Charger les membres
          const members = await familyService.getFamilyMembers(familyProfile.id);
          setFamilyMembers(members.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
            role: member.role as FamilyRole,
            active: member.active,
            lastConnection: member.last_connection
          })));
          
          // Charger les logs d'activité
          const logs = await familyService.getFamilyActivityLogs(familyProfile.id);
          setActivityLogs(logs);
          
          // TODO: Charger les invitations en attente
          // setPendingInvites(invites.length);
        }
      } else {
        // Pas de famille, afficher l'option pour en créer une
        setShowCreateFamily(true);
      }
    } catch (error) {
      console.error("Failed to load family data:", error);
      toast.error(t("errorLoadingFamily"));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadFamily();
  }, [userData.family]);
  
  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto glass-card animate-fade-in">
        <CardContent className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">{t("loading")}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (showCreateFamily) {
    return (
      <CreateFamilyCard 
        userData={userData} 
        onBack={onBack}
        onFamilyCreated={loadFamily}
      />
    );
  }
  
  const isOwner = userData.familyRole === "owner";
  
  return (
    <Card className="w-full max-w-4xl mx-auto glass-card animate-fade-in">
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-2 top-2"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> {t("goBack")}
        </Button>
        <CardTitle className="text-2xl font-bold text-center mt-4">
          {familyName || t("familyManagement")}
        </CardTitle>
        <CardDescription className="text-center">
          {isOwner ? t("familyOwnerDesc") : t("familyMemberDesc")}
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="members">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            {t("members")}
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            {t("activity")}
          </TabsTrigger>
          <TabsTrigger value="settings" disabled={!isOwner}>
            <Settings className="h-4 w-4 mr-2" />
            {t("settings")}
          </TabsTrigger>
        </TabsList>
        
        <CardContent className="p-4">
          <TabsContent value="members" className="mt-2">
            <FamilyMembersTab
              familyMembers={familyMembers}
              isOwner={isOwner}
              pendingInvites={pendingInvites}
              familyId={userData.family!}
              onUpdate={loadFamily}
            />
          </TabsContent>
          
          <TabsContent value="activity" className="mt-2">
            <ActivityLogsTab activityLogs={activityLogs} />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-2">
            <SettingsTab
              familyName={familyName}
              isOwner={isOwner}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default FamilyManagement;
