import React, { useState, useEffect } from "react";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, Users, UserPlus, Activity, Settings, AlertTriangle } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { UserData, FamilyRole, FamilyMemberData } from "./types";
import { toast } from "sonner";
import { familyService } from "@/services/wifi/family-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FamilyManagementProps {
  userData: UserData;
  onBack: () => void;
}

const FamilyManagement: React.FC<FamilyManagementProps> = ({ userData, onBack }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberData[]>([]);
  const [familyName, setFamilyName] = useState<string>("");
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberPhone, setNewMemberPhone] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<FamilyRole>(FamilyRole.MEMBER);
  const [showCreateFamily, setShowCreateFamily] = useState<boolean>(false);
  const [createFamilyName, setCreateFamilyName] = useState<string>("");
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<number>(0);
  const [showInviteDialog, setShowInviteDialog] = useState<boolean>(false);
  const [inviteProcessing, setInviteProcessing] = useState<boolean>(false);
  
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
  
  const handleCreateFamily = async () => {
    if (!createFamilyName.trim()) {
      toast.error(t("familyNameRequired"));
      return;
    }
    
    setLoading(true);
    try {
      const result = await familyService.createFamilyProfile(
        createFamilyName,
        userData.id!,
        userData.name,
        userData.email,
        userData.phone
      );
      
      if (result) {
        toast.success(t("familyCreated"));
        // Mettre à jour les données utilisateur avec la nouvelle famille
        userData.family = result.id;
        userData.familyName = result.name;
        userData.familyRole = FamilyRole.OWNER;
        setShowCreateFamily(false);
        await loadFamily();
      } else {
        throw new Error("Failed to create family");
      }
    } catch (error) {
      console.error("Error creating family:", error);
      toast.error(t("errorCreatingFamily"));
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddMember = async () => {
    if (!newMemberEmail && !newMemberPhone) {
      toast.error(t("needContactInfo"));
      return;
    }
    
    setInviteProcessing(true);
    try {
      // Pour cette démo, nous allons simuler l'ajout direct d'un utilisateur
      // sans passer par le processus d'invitation
      
      // Dans un système réel, nous enverrions une invitation par e-mail/SMS
      // avec un lien pour accepter et rejoindre la famille
      
      const mockUserData = {
        id: `usr-${Math.random().toString(36).substring(2, 8)}`,
        name: newMemberName,
        email: newMemberEmail,
        phone: newMemberPhone
      };
      
      const result = await familyService.addFamilyMember(
        userData.family!,
        mockUserData,
        newMemberRole
      );
      
      if (result) {
        toast.success(t("memberAdded"));
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberPhone("");
        setShowInviteDialog(false);
        await loadFamily();
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
  
  const handleToggleMemberStatus = async (memberId: string, active: boolean) => {
    try {
      const result = await familyService.toggleMemberStatus(memberId, active);
      if (result) {
        toast.success(active ? t("memberReactivated") : t("memberSuspended"));
        await loadFamily();
      } else {
        throw new Error("Failed to update member status");
      }
    } catch (error) {
      console.error("Error updating member status:", error);
      toast.error(t("errorUpdatingMember"));
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (confirm(t("confirmRemoveMember"))) {
      try {
        const result = await familyService.removeFamilyMember(memberId);
        if (result) {
          toast.success(t("memberRemoved"));
          await loadFamily();
        } else {
          throw new Error("Failed to remove member");
        }
      } catch (error) {
        console.error("Error removing member:", error);
        toast.error(t("errorRemovingMember"));
      }
    }
  };
  
  const isOwner = userData.familyRole === FamilyRole.OWNER;
  
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
  
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <Badge variant="outline" className="bg-green-100">Connexion</Badge>;
      case 'logout':
        return <Badge variant="outline" className="bg-gray-100">Déconnexion</Badge>;
      case 'join':
        return <Badge variant="outline" className="bg-blue-100">A rejoint</Badge>;
      case 'remove_member':
        return <Badge variant="outline" className="bg-red-100">Membre retiré</Badge>;
      case 'suspend_member':
        return <Badge variant="outline" className="bg-yellow-100">Membre suspendu</Badge>;
      case 'reactivate_member':
        return <Badge variant="outline" className="bg-green-100">Membre réactivé</Badge>;
      default:
        return <Badge variant="outline">Action</Badge>;
    }
  };
  
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
      <Card className="w-full max-w-2xl mx-auto glass-card animate-fade-in">
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
            {t("createFamilyPlan")}
          </CardTitle>
          <CardDescription className="text-center">
            {t("createFamilyPlanDesc")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/30 p-6 rounded-lg space-y-4">
            <h3 className="text-xl font-semibold">{t("familyPlanFeatures")}</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Users className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>{t("familyFeature1")}</span>
              </li>
              <li className="flex items-start">
                <Settings className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>{t("familyFeature2")}</span>
              </li>
              <li className="flex items-start">
                <Activity className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>{t("familyFeature3")}</span>
              </li>
            </ul>
            
            <div className="mt-6 pt-4 border-t">
              <p className="font-bold text-2xl mb-2">10 000 FCFA<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
              <p className="text-muted-foreground text-sm">{t("fiveMembers")}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">{t("familyName")}</Label>
              <Input 
                id="familyName" 
                value={createFamilyName}
                onChange={(e) => setCreateFamilyName(e.target.value)}
                placeholder={t("familyNamePlaceholder")}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleCreateFamily}
              disabled={!createFamilyName.trim()}
            >
              {t("createAndPay")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
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
            <div className="space-y-4">
              {isOwner && (
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">{t("familyMembers")}</h3>
                  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
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
                              variant={newMemberRole === FamilyRole.MEMBER ? "default" : "outline"}
                              onClick={() => setNewMemberRole(FamilyRole.MEMBER)}
                              className="justify-start"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              {t("member")}
                            </Button>
                            <Button
                              type="button"
                              variant={newMemberRole === FamilyRole.CHILD ? "default" : "outline"}
                              onClick={() => setNewMemberRole(FamilyRole.CHILD)}
                              className="justify-start"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"></path>
                              </svg>
                              {t("child")}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {newMemberRole === FamilyRole.CHILD 
                              ? t("childRoleExplanation") 
                              : t("memberRoleExplanation")}
                          </p>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowInviteDialog(false)}
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
                </div>
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
                          {member.active ? (
                            <Badge variant="outline" className="bg-green-100">{t("active")}</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-100">{t("suspended")}</Badge>
                          )}
                        </TableCell>
                        {isOwner && member.role !== FamilyRole.OWNER && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleToggleMemberStatus(member.id, !member.active)}
                              >
                                {member.active ? t("suspend") : t("activate")}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                {t("remove")}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        {(isOwner && member.role === FamilyRole.OWNER) && (
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
          </TabsContent>
          
          <TabsContent value="activity" className="mt-2">
            <div className="space-y-4">
              <h3 className="font-medium">{t("recentActivity")}</h3>
              
              <ScrollArea className="h-[500px] w-full pr-4">
                {activityLogs.length === 0 ? (
                  <Card className="bg-muted/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-muted-foreground">{t("noActivityLogs")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 pb-4 border-b">
                        <div className="mt-1">
                          {getActivityIcon(log.action)}
                        </div>
                        <div>
                          <div className="font-medium">{log.user_name || t("system")}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleDateString()} à {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-sm mt-1">
                            {log.action === 'join' && "A rejoint la famille"}
                            {log.action === 'remove_member' && "Membre retiré de la famille"}
                            {log.action === 'suspend_member' && "Membre suspendu"}
                            {log.action === 'reactivate_member' && "Membre réactivé"}
                            {log.action === 'login' && "S'est connecté au WiFi"}
                            {log.action === 'logout' && "S'est déconnecté du WiFi"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="mt-2">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="familyName">{t("familyName")}</Label>
                <Input 
                  id="familyName"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  disabled={!isOwner}
                />
              </div>
              
              {isOwner && (
                <div className="space-y-4 border-t pt-4 mt-4">
                  <h3 className="font-medium">{t("dangerZone")}</h3>
                  <Button variant="destructive">
                    {t("cancelFamily")}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default FamilyManagement;
