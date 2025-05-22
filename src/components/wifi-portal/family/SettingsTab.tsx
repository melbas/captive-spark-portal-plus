
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "../../LanguageContext";
import { toast } from "sonner";
import { familyService } from "@/services/wifi/family";

interface SettingsTabProps {
  familyName: string;
  isOwner: boolean;
  onSave?: (name: string) => Promise<void>;
  familyId?: string;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ 
  familyName, 
  isOwner, 
  onSave, 
  familyId 
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState<string>(familyName);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const handleSaveName = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(name);
        toast.success(t("nameSaved"));
      } catch (error) {
        console.error("Error saving family name:", error);
        toast.error(t("errorSavingName"));
      } finally {
        setIsSaving(false);
      }
    } else if (familyId) {
      // If no onSave callback but we have familyId, use the service directly
      setIsSaving(true);
      try {
        const result = await familyService.updateFamilyProfile(familyId, { name });
        if (result) {
          toast.success(t("nameSaved"));
        } else {
          throw new Error("Failed to update family profile");
        }
      } catch (error) {
        console.error("Error saving family name:", error);
        toast.error(t("errorSavingName"));
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  const handleCancelFamily = () => {
    // This functionality would need to be implemented
    if (confirm(t("confirmCancelFamily"))) {
      toast.warning(t("notImplemented"));
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="familyName">{t("familyName")}</Label>
        <Input 
          id="familyName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isOwner}
        />
        {isOwner && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={handleSaveName}
            disabled={isSaving || !name.trim() || name === familyName}
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-t-2 border-current rounded-full animate-spin mr-2"></div>
                {t("saving")}
              </>
            ) : t("save")}
          </Button>
        )}
      </div>
      
      {isOwner && (
        <div className="space-y-4 border-t pt-4 mt-4">
          <h3 className="font-medium">{t("dangerZone")}</h3>
          <Button 
            variant="destructive"
            onClick={handleCancelFamily}
          >
            {t("cancelFamily")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
