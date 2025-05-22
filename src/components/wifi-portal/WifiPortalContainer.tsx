
import React, { useState } from "react";
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

// West African themed advertisement slides - updated with more relevant imagery
const adSlides = [
  {
    id: "ad1",
    imageUrl: "https://images.unsplash.com/photo-1603294278610-b4ee8654abff?auto=format&fit=crop&w=800&h=400",
    title: {
      en: "Student WiFi Plans",
      fr: "Forfaits WiFi Étudiants"
    },
    description: {
      en: "Special internet rates for students",
      fr: "Tarifs internet spéciaux pour étudiants"
    },
    link: "#student-wifi"
  },
  {
    id: "ad2",
    imageUrl: "https://images.unsplash.com/photo-1621958335842-6a9bbff73d6d?auto=format&fit=crop&w=800&h=400",
    title: {
      en: "Market Vendor Connectivity",
      fr: "Connectivité pour Commerçants"
    },
    description: {
      en: "Stay connected at your market stall",
      fr: "Restez connecté à votre étal de marché"
    },
    link: "#market-wifi"
  },
  {
    id: "ad3",
    imageUrl: "https://images.unsplash.com/photo-1506877339221-ede41280a7a2?auto=format&fit=crop&w=800&h=400",
    title: {
      en: "Café WiFi Access",
      fr: "Accès WiFi dans les Cafés"
    },
    description: {
      en: "Enjoy WiFi while sipping coffee",
      fr: "Profitez du WiFi tout en dégustant un café"
    },
    link: "#cafe-wifi"
  },
  {
    id: "ad4",
    imageUrl: "https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?auto=format&fit=crop&w=800&h=400",
    title: {
      en: "Family WiFi Packages",
      fr: "Forfaits WiFi Famille"
    },
    description: {
      en: "Connect the whole family with our special rates",
      fr: "Connectez toute la famille avec nos tarifs spéciaux"
    },
    link: "#family-wifi"
  }
];

const WifiPortalContainer = () => {
  const [showAds, setShowAds] = useState(true);
  
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
    handleReset,
    getMacAddress,
    handleGameComplete,
    handlePaymentComplete
  } = useWifiPortal();
  
  const { t, language } = useLanguage();
  
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
