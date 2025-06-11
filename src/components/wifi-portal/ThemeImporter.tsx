
import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Eye,
  Download
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { toast } from "sonner";

interface ImportedTheme {
  manifest: {
    name: string;
    version: string;
    description: string;
    author: string;
    created_at: string;
    compatibility: string[];
    requirements: {
      frontend: string[];
      backend: string[];
    };
  };
  components: any[];
  theme_config: any;
  installation_guide: {
    steps: string[];
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    components: number;
    features: number;
    size: string;
  };
}

const ThemeImporter: React.FC = () => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [importedTheme, setImportedTheme] = useState<ImportedTheme | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const validateTheme = (theme: ImportedTheme): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation du manifest
    if (!theme.manifest) {
      errors.push("Manifest manquant");
    } else {
      if (!theme.manifest.name) errors.push("Nom du thème manquant");
      if (!theme.manifest.version) errors.push("Version manquante");
      if (!theme.manifest.author) warnings.push("Auteur non spécifié");
    }

    // Validation des composants
    if (!theme.components || !Array.isArray(theme.components)) {
      errors.push("Liste des composants invalide");
    }

    // Validation de la configuration
    if (!theme.theme_config) {
      errors.push("Configuration du thème manquante");
    } else {
      if (!theme.theme_config.visual_config) {
        warnings.push("Configuration visuelle incomplète");
      }
      if (!theme.theme_config.user_journey) {
        warnings.push("Parcours utilisateur non défini");
      }
    }

    // Calcul des informations
    const componentCount = theme.components?.length || 0;
    const featureCount = theme.theme_config?.features_config ? 
      Object.keys(theme.theme_config.features_config).length : 0;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info: {
        components: componentCount,
        features: featureCount,
        size: "Calculé dynamiquement"
      }
    };
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("Veuillez sélectionner un fichier JSON");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const text = await file.text();
      const themeData = JSON.parse(text);

      setImportedTheme(themeData);
      const validationResult = validateTheme(themeData);
      setValidation(validationResult);

      if (validationResult.isValid) {
        toast.success("Thème importé avec succès !");
      } else {
        toast.warning("Thème importé avec des erreurs");
      }
    } catch (error) {
      console.error('Error importing theme:', error);
      toast.error("Erreur lors de l'import du thème");
    } finally {
      setIsUploading(false);
    }
  };

  const handleInstallTheme = async () => {
    if (!importedTheme || !validation?.isValid) return;

    try {
      toast.info("Installation du thème en cours...");
      
      // Simulate installation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Thème installé avec succès !");
      
      // Reset form
      setImportedTheme(null);
      setValidation(null);
      setShowPreview(false);
    } catch (error) {
      console.error('Error installing theme:', error);
      toast.error("Erreur lors de l'installation");
    }
  };

  const clearImport = () => {
    setImportedTheme(null);
    setValidation(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Importeur de Thème</h1>
        <p className="text-muted-foreground">
          Importez et installez des thèmes depuis un fichier de package
        </p>
      </div>

      {!importedTheme ? (
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner un package thème</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={handleFileSelect}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  Glissez votre fichier ici ou cliquez pour sélectionner
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Formats supportés: .json (package de thème)
                </p>
                <Button variant="outline">
                  Parcourir les fichiers
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Import en cours...</span>
                    <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    {importedTheme.manifest.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">v{importedTheme.manifest.version}</Badge>
                    <Badge variant="secondary">{importedTheme.manifest.author}</Badge>
                    {validation?.isValid ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valide
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Erreurs détectées
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearImport}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {importedTheme.manifest.description}
              </p>
              
              {validation && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-2xl font-bold text-primary">
                      {validation.info.components}
                    </div>
                    <div className="text-sm text-muted-foreground">Composants</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-2xl font-bold text-primary">
                      {validation.info.features}
                    </div>
                    <div className="text-sm text-muted-foreground">Fonctionnalités</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-2xl font-bold text-primary">
                      {importedTheme.manifest.compatibility.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Plateformes</div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleInstallTheme}
                  disabled={!validation?.isValid}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Installer le thème
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Masquer' : 'Prévisualiser'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Rapport de validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {validation.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Erreurs ({validation.errors.length})
                      </h4>
                      <ul className="space-y-1">
                        {validation.errors.map((error, index) => (
                          <li key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validation.warnings.length > 0 && (
                    <div>
                      <h4 className="font-medium text-yellow-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Avertissements ({validation.warnings.length})
                      </h4>
                      <ul className="space-y-1">
                        {validation.warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {showPreview && importedTheme.theme_config && (
            <Card>
              <CardHeader>
                <CardTitle>Aperçu de la configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                  <pre className="text-sm">
                    {JSON.stringify(importedTheme.theme_config, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ThemeImporter;
