
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Clock, Award, Users, ChevronLeft, Share, Calendar } from "lucide-react";
import { UserData, UserLevel } from "./types";

interface UserDashboardProps {
  userData: UserData;
  onBack: () => void;
  onNavigate: (section: string) => void;
  onExtendTime: () => void;
}

const UserDashboard = ({ userData, onBack, onNavigate, onExtendTime }: UserDashboardProps) => {
  const [activeTab, setActiveTab] = useState("profile");
  
  // Determine user level based on points
  const getUserLevel = (points: number = 0): UserLevel => {
    if (points >= 1000) return UserLevel.PLATINUM;
    if (points >= 500) return UserLevel.GOLD;
    if (points >= 250) return UserLevel.SILVER;
    if (points >= 100) return UserLevel.BRONZE;
    return UserLevel.BASIC;
  };
  
  // Calculate next level threshold
  const getNextLevelPoints = (currentPoints: number = 0): number => {
    if (currentPoints < 100) return 100;
    if (currentPoints < 250) return 250;
    if (currentPoints < 500) return 500;
    if (currentPoints < 1000) return 1000;
    return currentPoints; // Already at max level
  };
  
  const currentLevel = getUserLevel(userData.points);
  const nextLevelPoints = getNextLevelPoints(userData.points);
  const progress = ((userData.points || 0) / nextLevelPoints) * 100;
  
  const connectionHistory = userData.connectionHistory || [
    { date: new Date().toLocaleDateString(), duration: userData.timeRemainingMinutes || 30, engagementType: 'video' }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto glass-card animate-fade-in">
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-2 top-2"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <CardTitle className="text-2xl font-bold text-center mt-4">
          Tableau de Bord Utilisateur
        </CardTitle>
        <CardDescription className="text-center">
          Gérez votre compte et consultez vos avantages
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="rewards">Récompenses</TabsTrigger>
        </TabsList>
        
        <CardContent className="pt-4">
          <TabsContent value="profile" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="w-full md:w-1/3 flex flex-col items-center space-y-2">
                <div className="bg-primary/10 text-primary rounded-full p-8 flex items-center justify-center">
                  <span className="text-3xl font-bold">{userData.name?.charAt(0) || "U"}</span>
                </div>
                <span className="text-lg font-medium">{userData.name || "Utilisateur"}</span>
                <div className="bg-muted/50 rounded-full px-3 py-1 text-xs flex items-center gap-1">
                  <Award className="h-3 w-3" /> {currentLevel}
                </div>
              </div>
              
              <div className="w-full md:w-2/3 space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Email</div>
                  <div className="bg-muted/30 rounded p-2 text-sm">{userData.email || "Non renseigné"}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium">Téléphone</div>
                  <div className="bg-muted/30 rounded p-2 text-sm">{userData.phone || "Non renseigné"}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium">Temps WiFi restant</div>
                  <div className="bg-muted/30 rounded p-2 text-sm font-semibold flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    {userData.timeRemainingMinutes || 0} minutes
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-auto"
                      onClick={onExtendTime}
                    >
                      Obtenir plus de temps
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Points fidélité</span>
                    <span className="font-medium">{userData.points || 0} / {nextLevelPoints}</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${progress > 100 ? 100 : progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {nextLevelPoints - (userData.points || 0)} points pour atteindre le niveau suivant
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onNavigate("referral")}
              >
                <Share className="mr-2 h-4 w-4" />
                Parrainer un ami
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onNavigate("rewards")}
              >
                <Award className="mr-2 h-4 w-4" />
                Échanger des points
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              <div className="text-center text-muted-foreground text-sm">
                <Calendar className="h-4 w-4 inline mr-1" /> Votre historique de connexions
              </div>
              {connectionHistory.length > 0 ? (
                <div className="space-y-3">
                  {connectionHistory.map((record, index) => (
                    <div key={index} className="bg-muted/30 rounded p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{record.date}</span>
                        <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">
                          {record.engagementType === 'video' ? 'Vidéo' : 
                           record.engagementType === 'quiz' ? 'Quiz' : 'Direct'}
                        </span>
                      </div>
                      <div className="mt-1 text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> {record.duration} minutes
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed rounded-md">
                  <p className="text-muted-foreground">Aucun historique disponible</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="rewards" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Vos points actuels</h3>
                <p className="text-2xl font-bold text-primary">{userData.points || 0} points</p>
              </div>
              <Button 
                variant="outline"
                onClick={() => onNavigate("rewards")}
              >
                <Award className="mr-2 h-4 w-4" />
                Voir toutes les récompenses
              </Button>
            </div>
            
            <div className="border-t pt-4 mt-2">
              <h3 className="font-medium mb-3">Avantages de votre niveau : {currentLevel}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentLevel === UserLevel.BASIC && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <p className="font-medium">Accès standard</p>
                      <p className="text-sm text-muted-foreground">
                        Accédez à notre WiFi après avoir regardé une publicité
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {currentLevel !== UserLevel.BASIC && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <p className="font-medium">Temps de connexion bonus</p>
                      <p className="text-sm text-muted-foreground">
                        +{currentLevel === UserLevel.BRONZE ? 5 : 
                           currentLevel === UserLevel.SILVER ? 10 :
                           currentLevel === UserLevel.GOLD ? 15 : 20}% de temps supplémentaire
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {(currentLevel === UserLevel.GOLD || currentLevel === UserLevel.PLATINUM) && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <p className="font-medium">Connexion prioritaire</p>
                      <p className="text-sm text-muted-foreground">
                        Bande passante garantie aux heures de pointe
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {currentLevel === UserLevel.PLATINUM && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <p className="font-medium">Connexion VIP</p>
                      <p className="text-sm text-muted-foreground">
                        Une connexion par jour sans publicité
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default UserDashboard;
