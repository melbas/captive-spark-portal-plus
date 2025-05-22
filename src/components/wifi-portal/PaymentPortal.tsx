import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CreditCard, Smartphone, Clock } from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.MOBILE_MONEY);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMobileOperator, setSelectedMobileOperator] = useState<string>("orange");
  const { t } = useLanguage();
  
  // Mise à jour des forfaits avec les nouveaux tarifs
  const packages: PaymentPackage[] = [
    {
      id: "daily",
      name: t("daily"),
      description: t("dailyWifiAccess"),
      price: 300,
      currency: "FCFA",
      minutes: 1440
    },
    {
      id: "weekly",
      name: t("weekly"),
      description: t("weeklyWifiAccess"),
      price: 1000,
      currency: "FCFA",
      minutes: 10080
    },
    {
      id: "monthly",
      name: t("monthly"),
      description: t("monthlyWifiAccess"),
      price: 3000,
      currency: "FCFA",
      minutes: 43200,
      isPopular: true
    },
    {
      id: "family",
      name: t("familyPlan"),
      description: t("familyPlanDescription"),
      price: 10000,
      currency: "FCFA",
      minutes: 43200 * 5 // Équivalent à 5 forfaits mensuels
    }
  ];
  
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
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(t("paymentSuccess"));
      
      // Call the onPaymentComplete function to update the user's time
      onPaymentComplete(selectedPackage.id, selectedPackage.minutes);
    }, 2000);
  };

  // Mise à jour pour ajouter Wave comme option de paiement
  const paymentProviderLogos = {
    orange: (
      <div className="flex items-center justify-center bg-[#FF6600] text-white rounded-md px-3 py-1">
        <span className="font-bold mr-1">Orange</span>
        <span className="font-light">Money</span>
      </div>
    ),
    wave: (
      <div className="flex items-center justify-center bg-[#1DC8FF] text-white rounded-md px-3 py-1">
        <span className="font-bold">Wave</span>
      </div>
    ),
    free: (
      <div className="flex items-center justify-center border border-[#FF0000] text-[#FF0000] rounded-md px-3 py-1">
        <span className="font-bold mr-1">Free</span>
        <span className="font-light">Money</span>
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
                          {Math.floor(pkg.minutes / 60 / 24)} {pkg.id === 'daily' ? t("day") : pkg.id === 'weekly' ? t("week") : pkg.id === 'monthly' ? t("month") : t("familyPlanDuration")}
                          {pkg.id === 'family' && <span className="ml-1">({t("upTo5Users")})</span>}
                        </>
                      ) : (
                        <>{pkg.minutes} {t("minutes")}</>
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
            ))}
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
                        {Math.floor(selectedPackage.minutes / 60 / 24)} {selectedPackage.id === 'daily' ? t("day") : selectedPackage.id === 'weekly' ? t("week") : selectedPackage.id === 'monthly' ? t("month") : t("familyPlanDuration")}
                        {selectedPackage.id === 'family' && <span className="ml-1">({t("upTo5Users")})</span>}
                      </>
                    ) : (
                      <>{selectedPackage.minutes} {t("minutes")}</>
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
