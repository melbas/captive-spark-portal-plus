
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CreditCard, Smartphone, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentMethod, PaymentPackage, UserData } from "./types";
import { toast } from "sonner";

interface PaymentPortalProps {
  userData: UserData;
  onBack: () => void;
  onPaymentComplete: (packageId: string, minutes: number) => void;
}

const PaymentPortal: React.FC<PaymentPortalProps> = ({ userData, onBack, onPaymentComplete }) => {
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.MOBILE_MONEY);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mock payment packages
  const packages: PaymentPackage[] = [
    {
      id: "basic",
      name: "Basique",
      description: "1 heure de WiFi haute vitesse",
      price: 500,
      currency: "FCFA",
      minutes: 60
    },
    {
      id: "standard",
      name: "Standard",
      description: "3 heures de WiFi haute vitesse",
      price: 1000,
      currency: "FCFA",
      minutes: 180,
      isPopular: true
    },
    {
      id: "premium",
      name: "Premium",
      description: "6 heures de WiFi haute vitesse",
      price: 1500,
      currency: "FCFA",
      minutes: 360
    },
    {
      id: "daily",
      name: "Journalier",
      description: "24 heures de WiFi haute vitesse",
      price: 2500,
      currency: "FCFA",
      minutes: 1440
    }
  ];
  
  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPackage(pkg);
  };
  
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
  };
  
  const handleProcessPayment = () => {
    if (!selectedPackage) {
      toast.error("Veuillez sélectionner un forfait");
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("Paiement réussi! Votre temps WiFi a été ajouté.");
      
      // Call the onPaymentComplete function to update the user's time
      onPaymentComplete(selectedPackage.id, selectedPackage.minutes);
    }, 2000);
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto glass-card animate-fade-in">
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-2 top-2"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <CardTitle className="text-2xl font-bold text-center mt-4">
          Acheter du temps WiFi
        </CardTitle>
        <CardDescription className="text-center">
          Choisissez un forfait et payez pour obtenir plus de temps WiFi
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!selectedPackage ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={`overflow-hidden cursor-pointer transition-all hover:border-primary ${pkg.isPopular ? 'border-primary' : ''}`}
                onClick={() => handleSelectPackage(pkg)}
              >
                {pkg.isPopular && (
                  <div className="bg-primary text-primary-foreground text-xs text-center py-1">
                    Plus populaire
                  </div>
                )}
                <CardContent className="p-0">
                  <div className="p-4 space-y-2">
                    <h3 className="font-medium">{pkg.name}</h3>
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    <p className="text-2xl font-bold">{pkg.price} {pkg.currency}</p>
                    
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {pkg.minutes >= 60 ? (
                        <>
                          {Math.floor(pkg.minutes / 60)} heure{pkg.minutes >= 120 ? 's' : ''}
                          {pkg.minutes % 60 > 0 ? ` ${pkg.minutes % 60} min` : ''}
                        </>
                      ) : (
                        <>{pkg.minutes} minutes</>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t p-3 bg-background/50">
                    <Button 
                      className="w-full" 
                      variant={pkg.isPopular ? "default" : "outline"}
                    >
                      Sélectionner
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Forfait sélectionné</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedPackage.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPackage.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{selectedPackage.price} {selectedPackage.currency}</p>
                  <p className="text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {selectedPackage.minutes >= 60 ? (
                      <>
                        {Math.floor(selectedPackage.minutes / 60)} heure{selectedPackage.minutes >= 120 ? 's' : ''}
                        {selectedPackage.minutes % 60 > 0 ? ` ${selectedPackage.minutes % 60} min` : ''}
                      </>
                    ) : (
                      <>{selectedPackage.minutes} minutes</>
                    )}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setSelectedPackage(null)}
              >
                Changer de forfait
              </Button>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Méthode de paiement</h3>
              <Tabs defaultValue={paymentMethod} onValueChange={(value) => handlePaymentMethodChange(value as PaymentMethod)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value={PaymentMethod.MOBILE_MONEY}>
                    <Smartphone className="h-4 w-4 mr-2" /> Mobile Money
                  </TabsTrigger>
                  <TabsTrigger value={PaymentMethod.CREDIT_CARD}>
                    <CreditCard className="h-4 w-4 mr-2" /> Carte bancaire
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value={PaymentMethod.MOBILE_MONEY} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <Input id="phone" placeholder="Entrez votre numéro de téléphone" />
                    <p className="text-xs text-muted-foreground">Exemple: 77 123 45 67</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operator">Opérateur</Label>
                    <select className="w-full p-2 rounded-md border" id="operator">
                      <option value="orange">Orange Money</option>
                      <option value="free">Free Money</option>
                      <option value="wave">Wave</option>
                    </select>
                  </div>
                </TabsContent>
                
                <TabsContent value={PaymentMethod.CREDIT_CARD} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Numéro de carte</Label>
                    <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Date d'expiration</Label>
                      <Input id="expiry" placeholder="MM/AA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input id="cvc" placeholder="123" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Nom sur la carte</Label>
                    <Input id="cardName" placeholder="Prénom NOM" />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleProcessPayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 border-t-2 border-current rounded-full animate-spin mr-2"></div>
                  Traitement en cours...
                </>
              ) : (
                `Payer ${selectedPackage.price} ${selectedPackage.currency}`
              )}
            </Button>
          </div>
        )}
        
        <div className="bg-muted/30 p-4 rounded-lg text-sm">
          <h4 className="font-medium mb-2">Paiement sécurisé</h4>
          <p className="text-muted-foreground">
            Toutes vos informations de paiement sont sécurisées. Nous ne stockons pas vos données de carte bancaire.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentPortal;
