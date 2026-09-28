
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ChevronLeft, Clock, Gift, Star } from "lucide-react";
import { UserData, Reward, RewardType } from "./types";
import { fetchSiteRewards } from "@/lib/supabase/portalModuleQueries";
import { toast } from "sonner";

interface RewardSystemProps {
  userData: UserData;
  onBack: () => void;
  onRedeem: (reward: Reward) => void;
  /** sites.id — scope les récompenses lues en base (Task 18). */
  siteId?: string | null;
}

/** reward_type DB → type de récompense du portail. Type inconnu → null. */
function toRewardType(rewardType: string): RewardType | null {
  switch (rewardType) {
    case "time":
    case "wifi_time":
      return RewardType.WIFI_TIME;
    case "premium":
    case "premium_access":
      return RewardType.PREMIUM_ACCESS;
    case "discount":
    case "promo":
      return RewardType.DISCOUNT;
    case "gift":
      // Un cadeau concret est traité comme un avantage premium unitaire.
      return RewardType.PREMIUM_ACCESS;
    default:
      return null;
  }
}

const RewardSystem = ({ userData, onBack, onRedeem, siteId }: RewardSystemProps) => {
  // Task 18 : les récompenses viennent de la table `rewards` (par site, actives).
  // Catalogue vide = état vide explicite — plus aucune récompense hardcodée.
  const { data: dbRewards = [], isLoading: rewardsLoading } = useQuery({
    queryKey: ["portal-rewards", siteId],
    queryFn: () => fetchSiteRewards(siteId ?? ""),
    enabled: Boolean(siteId),
    staleTime: 60_000,
  });

  // Projection DB → Reward ; types inconnus ignorés (pas d'invention d'UI).
  const availableRewards: Reward[] = dbRewards
    .map((r) => {
      const type = toRewardType(r.reward_type);
      if (!type) return null;
      const reward: Reward = {
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        type,
        value: Number(r.value) || 0,
        pointsCost: r.points_cost,
      };
      return reward;
    })
    .filter((r): r is Reward => r !== null);
  
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
        
        {rewardsLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-t-2 border-primary rounded-full animate-spin"></div>
          </div>
        ) : availableRewards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune récompense disponible pour le moment.
          </p>
        ) : (
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
        )}
        
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
