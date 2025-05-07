
import React from "react";
import { Globe } from "lucide-react";
import { useLanguage, Language } from "./LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface LanguageSelectorProps {
  variant?: "select" | "buttons";
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = "select" }) => {
  const { language, setLanguage } = useLanguage();

  if (variant === "buttons") {
    return (
      <div className="flex space-x-2">
        <Button
          variant={language === "en" ? "default" : "outline"} 
          size="sm"
          onClick={() => setLanguage("en")}
          className="min-w-[40px]"
        >
          EN
        </Button>
        <Button
          variant={language === "fr" ? "default" : "outline"}
          size="sm" 
          onClick={() => setLanguage("fr")}
          className="min-w-[40px]"
        >
          FR
        </Button>
        <Button
          variant={language === "es" ? "default" : "outline"}
          size="sm"
          onClick={() => setLanguage("es")}
          className="min-w-[40px]"
        >
          ES
        </Button>
      </div>
    );
  }

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger className="w-[80px]">
        <Globe className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Lang" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="fr">Français</SelectItem>
        <SelectItem value="es">Español</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
