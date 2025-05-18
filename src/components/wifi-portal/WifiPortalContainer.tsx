
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useWifiPortal } from "./useWifiPortal";
import WifiPortalContent from "./WifiPortalContent";
import { useLanguage } from "../LanguageContext";
import LanguageSelector from "../LanguageSelector";
import AdCarousel from "../ads/AdCarousel";
import VideoAd from "../ads/VideoAd";
import AudioPromo from "../ads/AudioPromo";
import WhatsAppSupport from "../support/WhatsAppSupport";

// Mock advertisements for demonstration
const adSlides = [
  {
    id: "ad1",
    imageUrl: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=800&h=400",
    title: "Premium WiFi Plans",
    description: "Get high-speed internet for your business",
    link: "#premium-plans"
  },
  {
    id: "ad2",
    imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&h=400",
    title: "Work From Anywhere",
    description: "Reliable WiFi for remote workers",
    link: "#remote-work"
  },
  {
    id: "ad3",
    imageUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&h=400",
    title: "Student Discount",
    description: "Special rates for students",
    link: "#student-discount"
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
  
  const { t } = useLanguage();
  
  const handleAdSlideChange = (index: number) => {
    console.log(`Ad changed to slide ${index}`);
    // Track ad impressions or implement other analytics here
  };
  
  const handleAdSlideClick = (slide: any) => {
    console.log(`Ad clicked: ${slide.title}`);
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
            <LanguageSelector variant="select" />
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
              className="mb-4"
            />
          </div>
        )}
        
        {loading ? (
          <Card className="w-full max-w-md p-6">
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
        {showAds && currentStep !== 'auth' && (
          <div className="w-full max-w-md mt-8">
            <VideoAd
              videoUrl="https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"
              title="Upgrade Your WiFi Experience"
              description="Faster speeds, better coverage"
              poster="https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=800&h=450"
              autoPlay={false}
              className="mb-4"
            />
            
            <AudioPromo
              audioUrl="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
              title="Special WiFi Offer"
              subtitle="Listen to learn about our latest deals"
              coverImage="https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&w=200&h=200"
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
      
      {/* WhatsApp Support Button */}
      <WhatsAppSupport phoneNumber="221771234567" position="bottom-right" />
    </Layout>
  );
};

export default WifiPortalContainer;
