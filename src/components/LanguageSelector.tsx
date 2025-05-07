
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
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  variant?: "select" | "buttons";
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = "select", className = "" }) => {
  const { language, setLanguage } = useLanguage();

  const flags: Record<Language, string> = {
    en: "🇬🇧",
    fr: "🇫🇷",
    es: "🇪🇸"
  };
  
  const names: Record<Language, string> = {
    en: "English",
    fr: "Français",
    es: "Español"
  };

  if (variant === "buttons") {
    return (
      <div className={`flex space-x-2 ${className}`}>
        <Button
          variant={language === "en" ? "default" : "outline"} 
          size="sm"
          onClick={() => setLanguage("en")}
          className="min-w-[40px]"
        >
          <span className="mr-1">{flags.en}</span> EN
        </Button>
        <Button
          variant={language === "fr" ? "default" : "outline"}
          size="sm" 
          onClick={() => setLanguage("fr")}
          className="min-w-[40px]"
        >
          <span className="mr-1">{flags.fr}</span> FR
        </Button>
        <Button
          variant={language === "es" ? "default" : "outline"}
          size="sm"
          onClick={() => setLanguage("es")}
          className="min-w-[40px]"
        >
          <span className="mr-1">{flags.es}</span> ES
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
        <SelectTrigger className="w-[130px]">
          <span className="mr-2">{flags[language]}</span>
          <SelectValue placeholder={names[language]} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">
            <div className="flex items-center">
              <span className="mr-2">{flags.en}</span> {names.en}
            </div>
          </SelectItem>
          <SelectItem value="fr">
            <div className="flex items-center">
              <span className="mr-2">{flags.fr}</span> {names.fr}
            </div>
          </SelectItem>
          <SelectItem value="es">
            <div className="flex items-center">
              <span className="mr-2">{flags.es}</span> {names.es}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
