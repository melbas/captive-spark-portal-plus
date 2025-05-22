
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "../../LanguageContext";

interface SettingsTabProps {
  familyName: string;
  isOwner: boolean;
  onSave?: (name: string) => Promise<void>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ familyName, isOwner, onSave }) => {
  const { t } = useLanguage();
  const [name, setName] = useState<string>(familyName);
  
  const handleSaveName = async () => {
    if (onSave) {
      await onSave(name);
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
          >
            {t("save")}
          </Button>
        )}
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
  );
};

export default SettingsTab;
