
import React from "react";
import { Card } from "@/components/ui/card";
import WifiPortalContent from "./WifiPortalContent";
import { useWifiPortal } from "./useWifiPortal";
import LanguageSelector from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface WifiPortalContainerProps {
  className?: string;
}

const WifiPortalContainer = ({ className }: WifiPortalContainerProps) => {
  const { 
    currentStep, 
    setCurrentStep,
    engagementType,
    setEngagementType,
    userData, 
    loading,
    error,
    handleAuth,
    handleEngagementComplete,
    handleContinue,
    handleExtendTime,
    handleLeadGameComplete,
    handleNavigate,
    handleRedeemReward,
    handleInvite,
    handleGameComplete,
    handlePaymentComplete,
    handleReset,
    getMacAddress
  } = useWifiPortal();
  
  return (
    <div className={`flex flex-col items-center justify-center min-h-[80vh] py-8 ${className}`}>
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-foreground">
            SparkWiFi Portal
          </h1>
          <LanguageSelector className="ml-2" />
        </div>
        <p className="text-muted-foreground">
          Connect to our high-speed WiFi network
        </p>
        
        {/* For demo purposes - show the simulated MAC address with reset button */}
        <p className="text-xs text-muted-foreground mt-2">
          Demo MAC: {getMacAddress?.() || 'Unknown'}
          <Button variant="ghost" size="sm" className="ml-2 h-5 px-2" onClick={handleReset}>
            <ChevronLeft className="h-3 w-3 mr-1" /> Reset
          </Button>
        </p>
      </div>
      
      <Card className="w-full max-w-2xl glass-card">
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
          loading={loading}
          error={error}
        />
      </Card>
      
      <Card className="w-full max-w-md mt-8 p-4 glass-card">
        <p className="text-sm text-center text-muted-foreground">
          By connecting to our network, you agree to our{" "}
          <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
          and{" "}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </p>
      </Card>
    </div>
  );
};

export default WifiPortalContainer;
