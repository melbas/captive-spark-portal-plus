
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  Upload, 
  Package, 
  Settings, 
  FileText,
  Code,
  Database,
  Palette,
  Users,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { toast } from "sonner";

interface ThemePackage {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  size: string;
  components: number;
  features: string[];
  status: 'draft' | 'ready' | 'published';
  lastModified: string;
}

const ThemePackageManager: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const [packageProgress, setPackageProgress] = useState(0);
  const [isPackaging, setIsPackaging] = useState(false);

  const currentTheme: ThemePackage = {
    id: "wifi-senegal-v1",
    name: "WiFi Sénégal Portal Theme",
    version: "1.0.0",
    description: "Thème complet du portail captif WiFi Sénégal avec parcours client gamifié",
    author: "WiFi Sénégal Team",
    size: "2.4 MB",
    components: 47,
    features: [
      "Parcours client gamifié",
      "Gestion familiale",
      "Système de récompenses", 
      "Multi-langues",
      "Paiements intégrés",
      "Analytics avancées"
    ],
    status: 'ready',
    lastModified: new Date().toLocaleDateString('fr-FR')
  };

  const packageComponents = [
    {
      category: "Frontend Components",
      icon: Code,
      items: [
        "AuthBox - Authentification utilisateur",
        "VideoForWifi - Engagement vidéo", 
        "MarketingQuiz - Quiz marketing",
        "UserDashboard - Tableau de bord utilisateur",
        "FamilyManagement - Gestion familiale",
        "RewardSystem - Système de récompenses",
        "PaymentPortal - Portail de paiement",
        "MiniGamesHub - Hub de mini-jeux"
      ]
    },
    {
      category: "Base de données",
      icon: Database,
      items: [
        "Schema complet (32 tables)",
        "Politiques RLS configurées",
        "Functions et triggers",
        "Données de démonstration",
        "Scripts de migration"
      ]
    },
    {
      category: "Design System",
      icon: Palette,
      items: [
        "Système de couleurs complet",
        "Typographie responsive",
        "Composants UI (shadcn/ui)",
        "Animations et transitions",
        "Thème sombre/clair"
      ]
    },
    {
      category: "Configuration",
      icon: Settings,
      items: [
        "Configuration du portail",
        "Paramètres d'authentification",
        "Options de paiement",
        "Gestion des modules",
        "Analytics et rapports"
      ]
    }
  ];

  const handleCreatePackage = async () => {
    setIsPackaging(true);
    setPackageProgress(0);

    // Simulate package creation progress
    const steps = [
      "Collecte des composants...",
      "Compilation des assets...",
      "Génération du manifest...",
      "Création de la documentation...",
      "Compression du package..."
    ];

    for (let i = 0; i < steps.length; i++) {
      toast.info(steps[i]);
      setPackageProgress((i + 1) * 20);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create and download the package
    try {
      const packageData = {
        manifest: {
          name: currentTheme.name,
          version: currentTheme.version,
          description: currentTheme.description,
          author: currentTheme.author,
          created_at: new Date().toISOString(),
          compatibility: ["supabase", "generic-backend"],
          requirements: {
            frontend: ["react@^18.3.1", "typescript@^5.0.0", "tailwindcss@^3.4.0"],
            backend: ["postgresql", "rest-api"]
          }
        },
        components: packageComponents,
        theme_config: await fetch('/themes/wifi-senegal-theme.json').then(r => r.json()),
        installation_guide: {
          steps: [
            "Télécharger et extraire le package",
            "Importer la configuration de base de données",
            "Installer les dépendances frontend",
            "Configurer les variables d'environnement",
            "Déployer les composants"
          ]
        }
      };

      const blob = new Blob([JSON.stringify(packageData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wifi-senegal-theme-package-v${currentTheme.version}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setPackageProgress(100);
      toast.success("Package créé et téléchargé avec succès !");
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error("Erreur lors de la création du package");
    } finally {
      setIsPackaging(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'draft': return 'bg-yellow-500';
      case 'published': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return CheckCircle;
      case 'draft': return AlertCircle;
      case 'published': return CheckCircle;
      default: return Info;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestionnaire de Package Thème</h1>
        <p className="text-muted-foreground">
          Créez et distribuez votre thème WiFi Portal comme un package réutilisable
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{currentTheme.name}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">v{currentTheme.version}</Badge>
                  <Badge variant="secondary">{currentTheme.size}</Badge>
                  <Badge className={getStatusColor(currentTheme.status)}>
                    {currentTheme.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleCreatePackage}
              disabled={isPackaging}
              className="min-w-[150px]"
            >
              <Download className="h-4 w-4 mr-2" />
              {isPackaging ? 'Création...' : 'Créer Package'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{currentTheme.components}</div>
              <div className="text-sm text-muted-foreground">Composants inclus</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{currentTheme.features.length}</div>
              <div className="text-sm text-muted-foreground">Fonctionnalités</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">3</div>
              <div className="text-sm text-muted-foreground">Langues supportées</div>
            </div>
          </div>

          {isPackaging && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Création du package en cours...</span>
                <span className="text-sm text-muted-foreground">{packageProgress}%</span>
              </div>
              <Progress value={packageProgress} className="h-2" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {currentTheme.features.map((feature, index) => (
              <Badge key={index} variant="outline">
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="components">Composants</TabsTrigger>
          <TabsTrigger value="installation">Installation</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description du thème</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{currentTheme.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Auteur:</strong> {currentTheme.author}
                </div>
                <div>
                  <strong>Dernière modification:</strong> {currentTheme.lastModified}
                </div>
                <div>
                  <strong>Compatibilité:</strong> Supabase, PostgreSQL
                </div>
                <div>
                  <strong>Licence:</strong> MIT
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          <div className="grid gap-6">
            {packageComponents.map((category, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="h-5 w-5" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {category.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="installation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guide d'installation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Prérequis système</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Node.js 18+ et npm/yarn</li>
                  <li>• PostgreSQL 14+</li>
                  <li>• Supabase CLI (optionnel)</li>
                  <li>• Back-office compatible avec l'import de thèmes JSON</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Étapes d'installation</h4>
                {[
                  "Télécharger le package thème",
                  "Extraire le contenu dans votre projet",
                  "Importer le schéma de base de données",
                  "Installer les dépendances npm",
                  "Configurer les variables d'environnement",
                  "Démarrer l'application"
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentation technique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Guide de personnalisation</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Télécharger
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <span>Documentation API</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Télécharger
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Schéma de base de données</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Télécharger
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Guide utilisateur</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Télécharger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ThemePackageManager;
