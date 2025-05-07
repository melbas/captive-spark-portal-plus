
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Copy, Share, Mail, Users } from "lucide-react";
import { UserData } from "./types";
import { toast } from "sonner";

interface ReferralSystemProps {
  userData: UserData;
  onBack: () => void;
  onInvite: (email: string) => void;
}

const ReferralSystem = ({ userData, onBack, onInvite }: ReferralSystemProps) => {
  const [email, setEmail] = useState("");
  const referralCode = userData.referralCode || "WIFI" + Math.floor(Math.random() * 10000);
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const referredUsers = userData.referredUsers?.length || 0;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Lien de parrainage copié!");
  };
  
  const handleInvite = () => {
    if (!email || !email.includes('@')) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }
    
    onInvite(email);
    toast.success(`Invitation envoyée à ${email}`);
    setEmail("");
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SparkWiFi - Accès WiFi gratuit',
          text: `Utilisez mon code de parrainage ${referralCode} pour obtenir 30 minutes de WiFi gratuit!`,
          url: referralLink,
        });
        toast.success("Merci d'avoir partagé!");
      } catch (err) {
        console.error("Erreur lors du partage:", err);
      }
    } else {
      handleCopyLink();
    }
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
          <Users className="h-5 w-5 inline-block mr-2" /> 
          Parrainez vos amis
        </CardTitle>
        <CardDescription className="text-center">
          Partagez SparkWiFi et gagnez du temps supplémentaire
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="p-4 bg-primary/10 rounded-lg space-y-4">
          <h3 className="font-medium text-center">Votre code de parrainage</h3>
          <div className="text-3xl font-bold tracking-wider text-center text-primary">
            {referralCode}
          </div>
          <div className="text-sm text-center text-muted-foreground">
            Chaque ami parrainé vous rapporte 30 minutes de WiFi gratuit et 50 points!
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium">Partager votre code</h3>
          
          <div className="flex gap-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="bg-muted/30"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button variant="outline" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" /> Partager
            </Button>
            <Button variant="outline" className="w-full" onClick={() => {
              window.location.href = `mailto:?subject=Accès WiFi gratuit&body=Utilisez mon code de parrainage ${referralCode} pour obtenir 30 minutes de WiFi gratuit! ${referralLink}`;
            }}>
              <Mail className="mr-2 h-4 w-4" /> Email
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="font-medium">Inviter par email</h3>
          <div className="flex gap-2">
            <Input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ami@email.com" 
              type="email"
            />
            <Button onClick={handleInvite}>Inviter</Button>
          </div>
        </div>
        
        <div className="bg-muted/30 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">Vos parrainages</h4>
              <p className="text-sm text-muted-foreground">Nombre d'amis parrainés</p>
            </div>
            <div className="text-2xl font-bold">{referredUsers}</div>
          </div>
          
          {referredUsers > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Temps WiFi gagné: {referredUsers * 30} minutes
              </p>
              <p className="text-sm text-muted-foreground">
                Points gagnés: {referredUsers * 50} points
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSystem;
