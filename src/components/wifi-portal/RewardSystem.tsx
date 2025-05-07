
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ChevronLeft, Clock, Gift, Star } from "lucide-react";
import { UserData, Reward, RewardType } from "./types";
import { toast } from "sonner";

interface RewardSystemProps {
  userData: UserData;
  onBack: () => void;
  onRedeem: (reward: Reward) => void;
}

const RewardSystem = ({ userData, onBack, onRedeem }: RewardSystemProps) => {
  // Sample rewards - in a real implementation, these would come from the database
  const availableRewards: Reward[] = [
    {
      id: "wifi-15",
      name: "15 Minutes WiFi",
      description: "Obtenez 15 minutes supplémentaires de WiFi",
      pointsCost: 50,
      type: RewardType.WIFI_TIME,
      value: 15
    },
    {
      id: "wifi-30",
      name: "30 Minutes WiFi",
      description: "Obtenez 30 minutes supplémentaires de WiFi",
      pointsCost: 100,
      type: RewardType.WIFI_TIME,
      value: 30
    },
    {
      id: "wifi-60",
      name: "1 Heure WiFi",
      description: "Obtenez une heure complète de WiFi supplémentaire",
      pointsCost: 180,
      type: RewardType.WIFI_TIME,
      value: 60
    },
    {
      id: "premium-1",
      name: "Accès Premium",
      description: "Accès Premium pendant 1 jour (sans publicités)",
      pointsCost: 300,
      type: RewardType.PREMIUM_ACCESS,
      value: 1
    },
    {
      id: "discount-10",
      name: "Réduction 10%",
      description: "Bon de réduction de 10% dans notre boutique",
      pointsCost: 250,
      type: RewardType.DISCOUNT,
      value: 10
    }
  ];
  
  const handleRedeem = (reward: Reward) => {
    const userPoints = userData.points || 0;
    
    if (userPoints < reward.pointsCost) {
      toast.error("Points insuffisants pour cette récompense");
      return;
    }
    
    onRedeem(reward);
    toast.success(`Vous avez échangé ${reward.name} pour ${reward.pointsCost} points`);
  };

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
          <Award className="h-6 w-6 inline-block mr-2" /> 
          Système de Récompenses
        </CardTitle>
        <CardDescription className="text-center">
          Échangez vos points contre des récompenses
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="text-sm font-medium">Vos points disponibles</p>
            <p className="text-2xl font-bold text-primary">{userData.points || 0}</p>
          </div>
          <Award className="h-10 w-10 text-primary opacity-20" />
        </div>
        
        <div className="space-y-1">
          <h3 className="font-medium text-lg flex items-center">
            <Gift className="h-5 w-5 mr-2" /> 
            Récompenses disponibles
          </h3>
          <p className="text-sm text-muted-foreground">Choisissez une récompense à échanger</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableRewards.map((reward) => (
            <Card 
              key={reward.id} 
              className={`overflow-hidden transition-all ${(userData.points || 0) >= reward.pointsCost ? "hover:border-primary" : "opacity-60"}`}
            >
              <CardContent className="p-0">
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{reward.name}</p>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                    <div className="bg-primary/10 text-primary text-xs font-semibold rounded-full px-2 py-1">
                      {reward.pointsCost} pts
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    {reward.type === RewardType.WIFI_TIME && (
                      <><Clock className="h-3 w-3 mr-1" /> {reward.value} minutes</>
                    )}
                    {reward.type === RewardType.DISCOUNT && (
                      <><Star className="h-3 w-3 mr-1" /> {reward.value}% de réduction</>
                    )}
                    {reward.type === RewardType.PREMIUM_ACCESS && (
                      <><Award className="h-3 w-3 mr-1" /> {reward.value} jour(s) d'accès premium</>
                    )}
                  </div>
                </div>
                
                <div className="border-t p-3 bg-background/50">
                  <Button 
                    className="w-full" 
                    variant={(userData.points || 0) >= reward.pointsCost ? "default" : "outline"}
                    disabled={(userData.points || 0) < reward.pointsCost}
                    onClick={() => handleRedeem(reward)}
                  >
                    {(userData.points || 0) >= reward.pointsCost ? 
                      "Échanger" : `Il vous manque ${reward.pointsCost - (userData.points || 0)} points`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="bg-muted/30 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Comment gagner des points</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center">
              <div className="bg-primary/10 rounded-full p-1 mr-2">
                <Clock className="h-3 w-3 text-primary" />
              </div>
              Connexion quotidienne: +10 points
            </li>
            <li className="flex items-center">
              <div className="bg-primary/10 rounded-full p-1 mr-2">
                <Award className="h-3 w-3 text-primary" />
              </div>
              Regarder une vidéo: +20 points
            </li>
            <li className="flex items-center">
              <div className="bg-primary/10 rounded-full p-1 mr-2">
                <Star className="h-3 w-3 text-primary" />
              </div>
              Compléter un quiz: +30 points
            </li>
            <li className="flex items-center">
              <div className="bg-primary/10 rounded-full p-1 mr-2">
                <Gift className="h-3 w-3 text-primary" />
              </div>
              Parrainer un ami: +50 points
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default RewardSystem;
