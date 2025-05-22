
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Users, Settings, Activity } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../../LanguageContext";
import { familyService } from "@/services/wifi/family";
import { UserData, FamilyRole } from "../types";

interface CreateFamilyCardProps {
  userData: UserData;
  onBack: () => void;
  onFamilyCreated: () => Promise<void>;
}

const CreateFamilyCard: React.FC<CreateFamilyCardProps> = ({ userData, onBack, onFamilyCreated }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(false);
  const [createFamilyName, setCreateFamilyName] = useState<string>("");

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
        // Update user data with new family
        userData.family = result.id;
        userData.familyName = result.name;
        userData.familyRole = FamilyRole.OWNER;
        await onFamilyCreated();
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
            disabled={loading || !createFamilyName.trim()}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-t-2 border-current rounded-full animate-spin mr-2"></div>
                {t("processing")}
              </>
            ) : t("createAndPay")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateFamilyCard;
