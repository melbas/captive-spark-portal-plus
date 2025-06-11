
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  Clock, 
  Download, 
  Upload, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Tag
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { toast } from "sonner";

interface ThemeVersion {
  id: string;
  version: string;
  name: string;
  description: string;
  release_date: string;
  author: string;
  changes: string[];
  status: 'draft' | 'stable' | 'deprecated';
  size: string;
  compatibility: string[];
  breaking_changes: boolean;
}

const ThemeVersionManager: React.FC = () => {
  const { t } = useLanguage();
  const [currentVersion, setCurrentVersion] = useState("1.0.0");

  const versions: ThemeVersion[] = [
    {
      id: "v1.2.0",
      version: "1.2.0",
      name: "Amélioration Performance",
      description: "Optimisations performances et nouvelles fonctionnalités",
      release_date: "2025-01-06",
      author: "WiFi Sénégal Team", 
      changes: [
        "Amélioration des performances de 40%",
        "Nouveau système de cache intelligent",
        "Interface de gestion familiale repensée",
        "Support des paiements Stripe",
        "Corrections de bugs critiques"
      ],
      status: 'draft',
      size: "2.6 MB",
      compatibility: ["Supabase v2.49+", "PostgreSQL 14+"],
      breaking_changes: false
    },
    {
      id: "v1.1.2",
      version: "1.1.2",
      name: "Corrections Critiques",
      description: "Corrections de sécurité et bugs critiques",
      release_date: "2024-12-20",
      author: "WiFi Sénégal Team",
      changes: [
        "Correction faille de sécurité dans l'auth",
        "Fix problème de synchronisation familiale",
        "Amélioration stabilité des paiements",
        "Optimisation mobile"
      ],
      status: 'stable',
      size: "2.4 MB",
      compatibility: ["Supabase v2.45+", "PostgreSQL 13+"],
      breaking_changes: false
    },
    {
      id: "v1.1.0",
      version: "1.1.0",
      name: "Fonctionnalités Gamification",
      description: "Ajout du système de gamification complet",
      release_date: "2024-11-15",
      author: "WiFi Sénégal Team",
      changes: [
        "Système de points et niveaux",
        "Mini-jeux intégrés",
        "Programme de fidélité",
        "Système de parrainage",
        "Tableau de bord utilisateur"
      ],
      status: 'stable',
      size: "2.2 MB",
      compatibility: ["Supabase v2.40+", "PostgreSQL 13+"],
      breaking_changes: true
    },
    {
      id: "v1.0.0",
      version: "1.0.0",
      name: "Version Initiale",
      description: "Première version stable du thème WiFi Sénégal",
      release_date: "2024-10-01",
      author: "WiFi Sénégal Team",
      changes: [
        "Portail captif complet",
        "Authentification multi-méthodes",
        "Interface responsive",
        "Support multi-langues",
        "Système de paiement mobile money"
      ],
      status: 'stable',
      size: "1.8 MB",
      compatibility: ["Supabase v2.30+", "PostgreSQL 12+"],
      breaking_changes: false
    },
    {
      id: "v0.9.0",
      version: "0.9.0",
      name: "Version Beta",
      description: "Version de test et validation",
      release_date: "2024-09-15",
      author: "WiFi Sénégal Team",
      changes: [
        "Version beta pour tests",
        "Fonctionnalités de base",
        "Interface prototype"
      ],
      status: 'deprecated',
      size: "1.5 MB",
      compatibility: ["Supabase v2.20+"],
      breaking_changes: true
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'stable': return CheckCircle;
      case 'draft': return Clock;
      case 'deprecated': return AlertTriangle;
      default: return Tag;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stable': return 'bg-green-500';
      case 'draft': return 'bg-blue-500';
      case 'deprecated': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleDownloadVersion = (version: ThemeVersion) => {
    toast.info(`Téléchargement de la version ${version.version}...`);
  };

  const handleRollback = (version: ThemeVersion) => {
    if (version.version === currentVersion) {
      toast.warning("Cette version est déjà active");
      return;
    }

    toast.success(`Retour à la version ${version.version} effectué`);
    setCurrentVersion(version.version);
  };

  const handleUploadVersion = () => {
    toast.info("Fonctionnalité d'upload de version en développement");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestionnaire de Versions</h1>
        <p className="text-muted-foreground">
          Gérez les versions de votre thème et effectuez des rollbacks
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-6 w-6" />
                Version Actuelle: {currentVersion}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                WiFi Sénégal Portal Theme
              </p>
            </div>
            <Button onClick={handleUploadVersion}>
              <Upload className="h-4 w-4 mr-2" />
              Uploader Version
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {versions.map((version, index) => {
          const StatusIcon = getStatusIcon(version.status);
          const isCurrentVersion = version.version === currentVersion;
          
          return (
            <Card key={version.id} className={isCurrentVersion ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{version.name}</h3>
                      <Badge variant="outline" className="text-sm">
                        v{version.version}
                      </Badge>
                      <Badge className={getStatusColor(version.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {version.status.toUpperCase()}
                      </Badge>
                      {isCurrentVersion && (
                        <Badge variant="default">ACTUELLE</Badge>
                      )}
                      {version.breaking_changes && (
                        <Badge variant="destructive">Breaking Changes</Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground mb-3">
                      {version.description}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="font-medium">Date:</span><br />
                        {new Date(version.release_date).toLocaleDateString('fr-FR')}
                      </div>
                      <div>
                        <span className="font-medium">Auteur:</span><br />
                        {version.author}
                      </div>
                      <div>
                        <span className="font-medium">Taille:</span><br />
                        {version.size}
                      </div>
                      <div>
                        <span className="font-medium">Compatibilité:</span><br />
                        {version.compatibility[0]}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadVersion(version)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Télécharger
                    </Button>
                    
                    {!isCurrentVersion && version.status !== 'deprecated' && (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleRollback(version)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Nouveautés et corrections:
                  </h4>
                  <ul className="space-y-1">
                    {version.changes.map((change, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1.5">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {version.compatibility.length > 1 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Compatibilité:</h4>
                    <div className="flex flex-wrap gap-2">
                      {version.compatibility.map((comp, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeVersionManager;
