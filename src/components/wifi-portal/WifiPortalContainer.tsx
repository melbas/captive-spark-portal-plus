import React, { useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useWifiPortal } from "./useWifiPortal";
import WifiPortalContent from "./WifiPortalContent";
import { useLanguage } from "../LanguageContext";
import AdCarousel from "../ads/AdCarousel";
import VideoAd from "../ads/VideoAd";
import AudioPromo from "../ads/AudioPromo";
import WhatsAppSupport from "../support/WhatsAppSupport";
import { Step } from "./types";

// Mise à jour avec les nouvelles images téléchargées par l'utilisateur
const adSlides = [
  {
    id: "ad1",
    imageUrl: "/lovable-uploads/188625b4-1006-40a3-9d8f-4406793e432a.png", // Première image uploadée
    fallbackUrl: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?auto=format&fit=crop&w=800&h=400", // Image de secours
    title: {
      en: "High-Speed WiFi Access",
      fr: "Accès WiFi Haut Débit"
    },
    description: {
      en: "Connect instantly to our nationwide network",
      fr: "Connectez-vous instantanément à notre réseau national"
    },
    link: "#wifi-plans"
  },
  {
    id: "ad2",
    imageUrl: "/lovable-uploads/6d63d396-05e7-4d74-9fa2-4e65d7539370.png", // Deuxième image uploadée
    fallbackUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&h=400", // Image de secours
    title: {
      en: "WiFi for Business",
      fr: "WiFi pour Entreprises"
    },
    description: {
      en: "Reliable connectivity for your company",
      fr: "Connectivité fiable pour votre entreprise"
    },
    link: "#business-wifi"
  },
  {
    id: "ad3",
    imageUrl: "/lovable-uploads/a07006bb-2820-445b-ac39-fb06d95be8fe.png", // Troisième image uploadée
    fallbackUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=400", // Image de secours
    title: {
      en: "Home WiFi Solutions",
      fr: "Solutions WiFi Domicile"
    },
    description: {
      en: "Stay connected at home with our premium plans",
      fr: "Restez connecté chez vous avec nos forfaits premium"
    },
    link: "#home-wifi"
  },
  {
    id: "ad4",
    imageUrl: "/lovable-uploads/34c1a509-4608-4a3e-bcff-29e71eff2849.png", // Quatrième image uploadée
    fallbackUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&h=400", // Image de secours
    title: {
      en: "Mobile WiFi Access",
      fr: "Accès WiFi Mobile"
    },
    description: {
      en: "Take your connection anywhere in Senegal",
      fr: "Emportez votre connexion partout au Sénégal"
    },
    link: "#mobile-wifi"
  }
];

const WifiPortalContainer = () => {
  const [showAds, setShowAds] = useState(true);
  
  const wifiPortal = useWifiPortal();
  const {
    currentStep,
    setCurrentStep,
    engagementType,
    userData,
    loading,
    handleAuth,
    handleEngagementComplete,
    handleContinue,
    handleExtendTime,
    handleLeadGameComplete,
    handleNavigate,
    handleRedeemReward,
    handleInvite,
    handleGameComplete,
    handlePaymentComplete
  } = wifiPortal;
  
  const { t, language } = useLanguage();
  
  // Add these handlers directly within the component
  const handleReset = useCallback(() => {
    localStorage.removeItem('wifi_user_data');
    localStorage.removeItem('wifi_mac_address');
    window.location.reload();
  }, []);

  const getMacAddress = useCallback(() => {
    const storedMac = localStorage.getItem('wifi_mac_address');
    if (storedMac) return storedMac;
    
    // Generate a random MAC address for demo purposes
    const hexDigits = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      mac += hexDigits.charAt(Math.floor(Math.random() * 16));
      mac += hexDigits.charAt(Math.floor(Math.random() * 16));
      if (i < 5) mac += ':';
    }
    localStorage.setItem('wifi_mac_address', mac);
    return mac;
  }, []);
  
  const handleAdSlideChange = (index: number) => {
    console.log(`Ad changed to slide ${index}`);
    // Track ad impressions or implement other analytics here
  };
  
  const handleAdSlideClick = (slide: any) => {
    console.log(`Ad clicked: ${slide.title[language]}`);
    // Track ad clicks or implement other analytics here
  };
  
  return (
    <Layout withGradientBg>
      <div className="flex flex-col items-center justify-center min-h-[80vh] py-8">
        <div className="w-full max-w-md mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-4xl font-bold text-center md:text-left text-foreground">
              {t("portal")}
            </h1>
          </div>
          
          <p className="text-center md:text-left text-muted-foreground mt-2">
            {t("connectToWifi")}
          </p>
          
          {/* For demo purposes - show the simulated MAC address */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
            <p className="text-xs text-muted-foreground">
              {t("demoMac")} {getMacAddress()}
            </p>
            <Button variant="ghost" size="sm" className="h-6 px-2 py-0" onClick={handleReset}>
              <ChevronLeft className="h-3 w-3 mr-1" /> {t("reset")}
            </Button>
          </div>
        </div>
        
        {/* Advertisement Section - Shown conditionally */}
        {showAds && (
          <div className="w-full max-w-md mb-8">
            <AdCarousel 
              slides={adSlides}
              autoRotate={true}
              interval={7000}
              onSlideChange={handleAdSlideChange}
              onSlideClick={handleAdSlideClick}
              className="mb-4 wifi-card"
            />
          </div>
        )}
        
        {loading ? (
          <Card className="w-full max-w-md p-6 wifi-card">
            <div className="flex flex-col items-center justify-center">
              <div className="h-6 w-6 border-t-2 border-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-muted-foreground">{t("loading")}</p>
            </div>
          </Card>
        ) : (
          <WifiPortalContent 
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            engagementType={engagementType}
            userData={userData}
            handleAuth={handleAuth}
            handleEngagementComplete={handleEngagementComplete}
            handleContinue={handleContinue}
            handleExtendTime={handleExtendTime}
            handleLeadGameComplete={handleLeadGameComplete}
            handleNavigate={handleNavigate}
            handleRedeemReward={handleRedeemReward}
            handleInvite={handleInvite}
            handleGameComplete={handleGameComplete}
            handlePaymentComplete={handlePaymentComplete}
          />
        )}
        
        {/* Video or Audio Ad - Shown conditionally */}
        {showAds && currentStep !== Step.AUTH && (
          <div className="w-full max-w-md mt-8">
            <VideoAd
              videoUrl="https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"
              title={language === 'en' ? "Upgrade Your WiFi Experience" : "Améliorez votre expérience WiFi"}
              description={language === 'en' ? "Faster speeds, better coverage" : "Vitesses plus rapides, meilleure couverture"}
              poster="https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=800&h=450"
              autoPlay={false}
              className="mb-4 wifi-card"
            />
            
            <AudioPromo
              audioUrl="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
              title={language === 'en' ? "Special WiFi Offer" : "Offre WiFi Spéciale"}
              subtitle={language === 'en' ? "Listen to learn about our latest deals" : "Écoutez pour découvrir nos dernières offres"}
              coverImage="https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?auto=format&fit=crop&w=200&h=200"
              className="wifi-card"
            />
          </div>
        )}
        
        <Card className="w-full max-w-md mt-8 p-4 glass-card">
          <p className="text-sm text-center text-muted-foreground">
            {t("byConnecting")}{" "}
            <a href="#" className="text-primary hover:underline">{t("termsOfService")}</a>{" "}
            {t("and")}{" "}
            <a href="#" className="text-primary hover:underline">{t("privacyPolicy")}</a>
          </p>
        </Card>
      </div>
      
      {/* WhatsApp Support Button - Updated with Senegal number */}
      <WhatsAppSupport phoneNumber="221771234567" position="bottom-right" />
    </Layout>
  );
};

export default WifiPortalContainer;
