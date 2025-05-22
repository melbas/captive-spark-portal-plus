
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CreditCard, Smartphone, Clock, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentMethod, PaymentPackage, UserData } from "./types";
import { toast } from "sonner";
import { useLanguage } from "../LanguageContext";

interface PaymentPortalProps {
  userData: UserData;
  onBack: () => void;
  onPaymentComplete: (packageId: string, minutes: number) => void;
}

const PaymentPortal: React.FC<PaymentPortalProps> = ({ userData, onBack, onPaymentComplete }) => {
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [isFamilyView, setIsFamilyView] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.MOBILE_MONEY);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMobileOperator, setSelectedMobileOperator] = useState<string>("orange");
  const { t } = useLanguage();
  
  // Forfaits individuels mis à jour
  const individualPackages: PaymentPackage[] = [
    {
      id: "daily",
      name: "Journalier",
      description: "WiFi haute vitesse pour 24 heures",
      price: 300,
      currency: "FCFA",
      minutes: 1440
    },
    {
      id: "weekly",
      name: "Hebdomadaire",
      description: "WiFi haute vitesse pour 7 jours",
      price: 1000,
      currency: "FCFA",
      minutes: 10080,
      isPopular: true
    },
    {
      id: "monthly",
      name: "Mensuel",
      description: "WiFi haute vitesse pour 30 jours",
      price: 3000,
      currency: "FCFA",
      minutes: 43200
    }
  ];
  
  // Forfait famille
  const familyPackage: PaymentPackage = {
    id: "family",
    name: "Forfait Famille",
    description: "WiFi pour toute la famille (5 membres max) pendant 30 jours",
    price: 10000,
    currency: "FCFA",
    minutes: 43200,
    isPopular: true
  };
  
  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPackage(pkg);
  };
  
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
  };
  
  const handleOperatorChange = (operator: string) => {
    setSelectedMobileOperator(operator);
  };
  
  const handleProcessPayment = () => {
    if (!selectedPackage) {
      toast.error(t("selectPackage"));
      return;
    }
    
    setIsProcessing(true);
    
    // Simuler le traitement du paiement
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(t("paymentSuccess"));
      
      // Appeler la fonction onPaymentComplete pour mettre à jour le temps de l'utilisateur
      onPaymentComplete(selectedPackage.id, selectedPackage.minutes);
    }, 2000);
  };

  // Logos des fournisseurs de paiement mobile
  const paymentProviderLogos = {
    orange: (
      <div className="flex items-center justify-center bg-[#FF6600] text-white rounded-md px-3 py-1">
        <span className="font-bold mr-1">Orange</span>
        <span className="font-light">Money</span>
      </div>
    ),
    free: (
      <div className="flex items-center justify-center border border-[#FF0000] text-[#FF0000] rounded-md px-3 py-1">
        <span className="font-bold mr-1">Free</span>
        <span className="font-light">Money</span>
      </div>
    ),
    wave: (
      <div className="flex items-center justify-center bg-[#1DC8FF] text-white rounded-md px-3 py-1">
        <span className="font-bold">Wave</span>
      </div>
    )
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
          <ChevronLeft className="h-4 w-4 mr-1" /> {t("goBack")}
        </Button>
        <CardTitle className="text-2xl font-bold text-center mt-4">
          {t("buyWifiTime")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("choosePackageAndPay")}
        </CardDescription>
        
        <Tabs 
          defaultValue="individual" 
          className="mt-4"
          onValueChange={(value) => setIsFamilyView(value === "family")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" /> {t("individualPlan")}
            </TabsTrigger>
            <TabsTrigger value="family" className="flex items-center">
              <Users className="h-4 w-4 mr-2" /> {t("familyPlan")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!selectedPackage ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isFamilyView ? (
              <Card 
                key={familyPackage.id} 
                className={`col-span-2 overflow-hidden cursor-pointer transition-all hover:border-primary border-primary`}
                onClick={() => handleSelectPackage(familyPackage)}
              >
                <div className="bg-primary text-primary-foreground text-xs text-center py-1">
                  {t("familyPlan")}
                </div>
                <CardContent className="p-0">
                  <div className="p-4 space-y-2">
                    <h3 className="font-medium">{familyPackage.name}</h3>
                    <p className="text-sm text-muted-foreground">{familyPackage.description}</p>
                    <p className="text-2xl font-bold">{familyPackage.price} {familyPackage.currency}</p>
                    
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {familyPackage.minutes >= 60 ? (
                        <>
                          {Math.floor(familyPackage.minutes / 1440)} jour{familyPackage.minutes >= 2880 ? 's' : ''}
                        </>
                      ) : (
                        <>{familyPackage.minutes} minutes</>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t">
                      <ul className="space-y-2">
                        <li className="flex items-start text-sm">
                          <Users className="h-3 w-3 mr-2 mt-1 text-primary" />
                          <span>Jusqu'à 5 membres de famille</span>
                        </li>
                        <li className="flex items-start text-sm">
                          <svg className="h-3 w-3 mr-2 mt-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                          <span>Contrôle parental</span>
                        </li>
                        <li className="flex items-start text-sm">
                          <svg className="h-3 w-3 mr-2 mt-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                          <span>Tableau de bord d'activité</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="border-t p-3 bg-background/50">
                    <Button 
                      className="w-full" 
                      onClick={() => handleSelectPackage(familyPackage)}
                    >
                      {t("select")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              individualPackages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={`overflow-hidden cursor-pointer transition-all hover:border-primary ${pkg.isPopular ? 'border-primary' : ''}`}
                  onClick={() => handleSelectPackage(pkg)}
                >
                  {pkg.isPopular && (
                    <div className="bg-primary text-primary-foreground text-xs text-center py-1">
                      {t("mostPopular")}
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
                            {Math.floor(pkg.minutes / 1440)} jour{pkg.minutes >= 2880 ? 's' : ''}
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
                        {t("select")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-medium mb-2">{t("selectedPackage")}</h3>
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
                        {Math.floor(selectedPackage.minutes / 1440)} jour{selectedPackage.minutes >= 2880 ? 's' : ''}
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
                {t("changePackage")}
              </Button>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">{t("paymentMethod")}</h3>
              <Tabs defaultValue={paymentMethod} onValueChange={(value) => handlePaymentMethodChange(value as PaymentMethod)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value={PaymentMethod.MOBILE_MONEY} className="flex items-center">
                    <Smartphone className="h-4 w-4 mr-2" /> {t("mobileMoney")}
                  </TabsTrigger>
                  <TabsTrigger value={PaymentMethod.CREDIT_CARD} className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" /> {t("creditCard")}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value={PaymentMethod.MOBILE_MONEY} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="operator">{t("selectProvider")}</Label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className={`p-2 h-auto ${selectedMobileOperator === 'orange' ? 'border-[#FF6600] bg-[#FF6600]/10' : ''}`}
                        onClick={() => handleOperatorChange('orange')}
                      >
                        {paymentProviderLogos.orange}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className={`p-2 h-auto ${selectedMobileOperator === 'wave' ? 'border-[#1DC8FF] bg-[#1DC8FF]/10' : ''}`}
                        onClick={() => handleOperatorChange('wave')}
                      >
                        {paymentProviderLogos.wave}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className={`p-2 h-auto ${selectedMobileOperator === 'free' ? 'border-[#FF0000] bg-[#FF0000]/10' : ''}`}
                        onClick={() => handleOperatorChange('free')}
                      >
                        {paymentProviderLogos.free}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("phoneNumber")}</Label>
                    <Input id="phone" placeholder={t("enterPhoneNumber")} />
                    <p className="text-xs text-muted-foreground">{t("example")}: 77 123 45 67</p>
                  </div>
                </TabsContent>
                
                <TabsContent value={PaymentMethod.CREDIT_CARD} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
                    <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">{t("expiryDate")}</Label>
                      <Input id="expiry" placeholder="MM/AA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input id="cvc" placeholder="123" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">{t("nameOnCard")}</Label>
                    <Input id="cardName" placeholder={t("fullName")} />
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
                  {t("processing")}
                </>
              ) : (
                `${t("pay")} ${selectedPackage.price} ${selectedPackage.currency}`
              )}
            </Button>
          </div>
        )}
        
        <div className="bg-muted/30 p-4 rounded-lg text-sm">
          <h4 className="font-medium mb-2">{t("securePayment")}</h4>
          <p className="text-muted-foreground">
            {t("paymentSecurityInfo")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentPortal;
