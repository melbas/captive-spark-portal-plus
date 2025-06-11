
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Star, 
  Download, 
  Eye, 
  Filter,
  Palette,
  Globe,
  Smartphone,
  Zap
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { toast } from "sonner";

interface MarketplaceTheme {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  rating: number;
  downloads: number;
  price: number;
  currency: string;
  preview_images: string[];
  features: string[];
  categories: string[];
  compatibility: string[];
  last_updated: string;
  license: string;
}

const ThemeMarketplace: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

  const themes: MarketplaceTheme[] = [
    {
      id: "wifi-senegal-v1",
      name: "WiFi Sénégal Portal",
      description: "Thème complet avec parcours client gamifié pour l'Afrique de l'Ouest",
      author: "WiFi Sénégal Team",
      version: "1.0.0",
      rating: 4.8,
      downloads: 1250,
      price: 0,
      currency: "EUR",
      preview_images: ["/themes/previews/wifi-senegal-1.png"],
      features: ["Gamification", "Multi-langues", "Paiements mobiles", "Gestion familiale"],
      categories: ["Telecom", "Africa", "Gaming"],
      compatibility: ["Supabase", "PostgreSQL"],
      last_updated: "2025-01-06",
      license: "MIT"
    },
    {
      id: "corporate-blue-v2",
      name: "Corporate Blue",
      description: "Thème professionnel élégant pour entreprises",
      author: "ThemeStudio",
      version: "2.1.0",
      rating: 4.5,
      downloads: 890,
      price: 49,
      currency: "EUR",
      preview_images: ["/themes/previews/corporate-blue.png"],
      features: ["Design professionnel", "Analytics avancées", "Support premium"],
      categories: ["Corporate", "Business"],
      compatibility: ["Generic Backend", "Supabase"],
      last_updated: "2024-12-15",
      license: "Commercial"
    },
    {
      id: "hotel-luxury-v1",
      name: "Hotel Luxury",
      description: "Thème premium pour hôtels et restaurants haut de gamme",
      author: "LuxuryThemes",
      version: "1.5.2",
      rating: 4.9,
      downloads: 445,
      price: 89,
      currency: "EUR",
      preview_images: ["/themes/previews/hotel-luxury.png"],
      features: ["Design luxueux", "Intégrations PMS", "Booking engine"],
      categories: ["Hospitality", "Luxury"],
      compatibility: ["Custom API", "Supabase"],
      last_updated: "2024-11-28",
      license: "Commercial"
    },
    {
      id: "campus-student-v1",
      name: "Campus Student",
      description: "Thème moderne et coloré pour universités et écoles",
      author: "EduTech Solutions",
      version: "1.2.0",
      rating: 4.3,
      downloads: 675,
      price: 29,
      currency: "EUR",
      preview_images: ["/themes/previews/campus-student.png"],
      features: ["Interface jeune", "Gamification", "Intégration LMS"],
      categories: ["Education", "Student"],
      compatibility: ["Supabase", "Firebase"],
      last_updated: "2024-12-01",
      license: "Educational"
    }
  ];

  const categories = [
    { id: "all", name: "Tous", icon: Globe },
    { id: "telecom", name: "Télécom", icon: Smartphone },
    { id: "hospitality", name: "Hôtellerie", icon: Star },
    { id: "corporate", name: "Entreprise", icon: Palette },
    { id: "education", name: "Éducation", icon: Zap }
  ];

  const filteredThemes = themes.filter(theme => {
    const matchesSearch = theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         theme.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           theme.categories.some(cat => cat.toLowerCase().includes(selectedCategory));
    return matchesSearch && matchesCategory;
  });

  const handleDownload = (theme: MarketplaceTheme) => {
    if (theme.price > 0) {
      toast.info(`Redirection vers le paiement pour ${theme.name} (${theme.price}€)`);
    } else {
      toast.success(`Téléchargement de ${theme.name} commencé`);
    }
  };

  const handlePreview = (theme: MarketplaceTheme) => {
    toast.info(`Ouverture de l'aperçu pour ${theme.name}`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketplace de Thèmes</h1>
        <p className="text-muted-foreground">
          Découvrez et téléchargez des thèmes pour votre portail WiFi
        </p>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un thème..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-1"
                >
                  <category.icon className="h-3 w-3" />
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grille des thèmes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredThemes.map((theme) => (
          <Card key={theme.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Palette className="h-12 w-12 text-primary/50" />
            </div>
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{theme.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">par {theme.author}</p>
                </div>
                <div className="text-right">
                  {theme.price > 0 ? (
                    <div className="text-lg font-bold text-primary">
                      {theme.price}€
                    </div>
                  ) : (
                    <Badge variant="secondary">Gratuit</Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {theme.description}
              </p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  {renderStars(theme.rating)}
                  <span className="ml-1 font-medium">{theme.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{theme.downloads}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {theme.features.slice(0, 3).map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {theme.features.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{theme.features.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handlePreview(theme)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Aperçu
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleDownload(theme)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {theme.price > 0 ? 'Acheter' : 'Télécharger'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredThemes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucun thème trouvé</h3>
            <p className="text-muted-foreground">
              Essayez de modifier vos critères de recherche ou de sélectionner une autre catégorie.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThemeMarketplace;
