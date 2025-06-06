
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, FileText, Palette, Settings, Users } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { toast } from "sonner";

interface ThemePreviewProps {
  onDownload?: () => void;
  onPreview?: () => void;
}

const ThemeDownloader: React.FC<ThemePreviewProps> = ({ onDownload, onPreview }) => {
  const { t } = useLanguage();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadTheme = async () => {
    try {
      setIsDownloading(true);
      
      // Fetch the theme file
      const response = await fetch('/themes/wifi-senegal-theme.json');
      if (!response.ok) {
        throw new Error('Failed to fetch theme file');
      }
      
      const themeData = await response.json();
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(themeData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wifi-senegal-theme-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Thème téléchargé avec succès !");
      onDownload?.();
      
    } catch (error) {
      console.error('Error downloading theme:', error);
      toast.error("Erreur lors du téléchargement du thème");
    } finally {
      setIsDownloading(false);
    }
  };

  const themeFeatures = [
    {
      icon: Palette,
      title: "Design système complet",
      description: "Couleurs, typographie, animations et composants"
    },
    {
      icon: Users,
      title: "Parcours client gamifié", 
      description: "Authentification, engagement, récompenses"
    },
    {
      icon: Settings,
      title: "Configuration technique",
      description: "Base de données, APIs, hooks et services"
    },
    {
      icon: FileText,
      title: "Multi-langues",
      description: "Français, Anglais, Espagnol inclus"
    }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Palette className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">WiFi Sénégal Portal Theme</CardTitle>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          <Badge variant="secondary">Version 1.0.0</Badge>
          <Badge variant="outline">Telecom</Badge>
          <Badge variant="outline">Gamifié</Badge>
          <Badge variant="outline">Multi-langue</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <p className="text-center text-muted-foreground">
          Thème complet du portail captif WiFi Sénégal avec parcours client gamifié, 
          gestion familiale et système de récompenses.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themeFeatures.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <feature.icon className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-accent/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Contenu du fichier thème :</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Configuration visuelle complète (couleurs, typographie, animations)</li>
            <li>• Parcours client configuré (étapes, engagements, gamification)</li>
            <li>• Traductions en 3 langues (FR, EN, ES)</li>
            <li>• Schéma technique (base de données, APIs, composants)</li>
            <li>• Options de personnalisation pour le back-office</li>
          </ul>
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={onPreview}
            variant="outline" 
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Prévisualiser
          </Button>
          
          <Button 
            onClick={handleDownloadTheme}
            disabled={isDownloading}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Téléchargement...' : 'Télécharger le thème'}
          </Button>
        </div>
        
        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          Compatible avec les back-office supportant l'import de thèmes JSON
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeDownloader;
