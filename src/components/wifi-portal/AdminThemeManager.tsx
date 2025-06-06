
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Eye, 
  Upload, 
  Palette, 
  Settings, 
  FileText,
  Code,
  Database
} from "lucide-react";
import ThemeDownloader from "./ThemeDownloader";
import { useLanguage } from "../LanguageContext";

const AdminThemeManager: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("download");

  const integrationSteps = [
    {
      step: 1,
      title: "Import du thème",
      description: "Téléchargez et importez le fichier JSON dans votre back-office",
      icon: Upload,
      details: [
        "Utilisez la fonction d'import de thème",
        "Sélectionnez le fichier wifi-senegal-theme.json",
        "Validez la structure et les dépendances"
      ]
    },
    {
      step: 2, 
      title: "Configuration visuelle",
      description: "Personnalisez les couleurs, polices et composants",
      icon: Palette,
      details: [
        "Adaptez les couleurs primaires/secondaires",
        "Modifiez le logo et les messages",
        "Configurez les animations et transitions"
      ]
    },
    {
      step: 3,
      title: "Parcours client",
      description: "Configurez les étapes et options d'engagement",
      icon: Settings,
      details: [
        "Activez/désactivez les méthodes d'auth",
        "Configurez les récompenses et points",
        "Définissez les durées de session"
      ]
    },
    {
      step: 4,
      title: "Base de données",
      description: "Créez les tables et configurez les services",
      icon: Database,
      details: [
        "Exécutez les scripts de création de tables",
        "Configurez les APIs et webhooks",
        "Testez les connexions aux services externes"
      ]
    }
  ];

  const technicalRequirements = [
    {
      category: "Frontend",
      icon: Code,
      requirements: [
        "React 18.3+ avec TypeScript",
        "Tailwind CSS 3.4+ configuré", 
        "Radix UI composants installés",
        "TanStack Query pour les données"
      ]
    },
    {
      category: "Backend", 
      icon: Database,
      requirements: [
        "Base de données PostgreSQL",
        "Supabase ou équivalent pour l'auth",
        "APIs SMS/Email configurées",
        "Système de paiement mobile money"
      ]
    },
    {
      category: "Services",
      icon: Settings,
      requirements: [
        "Service d'analytics configuré",
        "CDN pour les médias",
        "Système de cache Redis (optionnel)",
        "Monitoring et logs"
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestionnaire de Thème - Back Office</h1>
        <p className="text-muted-foreground">
          Téléchargez et intégrez le thème du portail WiFi Sénégal dans votre back-office
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="download">Téléchargement</TabsTrigger>
          <TabsTrigger value="integration">Intégration</TabsTrigger>
          <TabsTrigger value="technical">Technique</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
        </TabsList>

        <TabsContent value="download" className="space-y-6">
          <ThemeDownloader 
            onDownload={() => console.log("Thème téléchargé")}
            onPreview={() => setActiveTab("preview")}
          />
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guide d'intégration en 4 étapes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {integrationSteps.map((step, index) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {step.step}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      <ul className="text-sm space-y-1">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <div className="grid gap-6">
            {technicalRequirements.map((req, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <req.icon className="h-5 w-5" />
                    Prérequis {req.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {req.requirements.map((requirement, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Badge variant="outline" className="text-xs">
                          {req.category}
                        </Badge>
                        <span className="text-sm">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Structure du fichier thème</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <pre>{`{
  "meta": { /* Métadonnées du thème */ },
  "visual_config": { /* Design system complet */ },
  "user_journey": { /* Parcours client configuré */ },
  "gamification": { /* Système de points et niveaux */ },
  "features_config": { /* Fonctionnalités activées */ },
  "languages": { /* Traductions multi-langues */ },
  "technical_config": { /* Dépendances et APIs */ },
  "customization_options": { /* Options configurables */ }
}`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu du thème WiFi Sénégal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg" style={{background: "hsl(248, 100%, 65%)"}}>
                    <h4 className="text-white font-medium">Couleur Primaire</h4>
                    <p className="text-white/80 text-sm">#5B4DFF</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{background: "hsl(350, 100%, 65%)"}}>
                    <h4 className="text-white font-medium">Couleur Secondaire</h4>
                    <p className="text-white/80 text-sm">#FF4D6A</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-primary to-secondary">
                    <h4 className="text-white font-medium">Dégradé Header</h4>
                    <p className="text-white/80 text-sm">Primaire → Secondaire</p>
                  </div>
                </div>
                
                <div className="p-6 rounded-lg glass-card">
                  <h3 className="font-semibold mb-2">Exemple de carte Glass</h3>
                  <p className="text-sm text-muted-foreground">
                    Style glass-card avec backdrop-blur et transparence
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button className="btn-primary">Bouton Principal</Button>
                  <Button variant="secondary" className="btn-secondary">Bouton Secondaire</Button>
                  <Button variant="outline" className="btn-outline">Bouton Outline</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminThemeManager;
