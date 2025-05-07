
import React from "react";
import AuthBox from "@/components/AuthBox";
import VideoForWifi from "@/components/VideoForWifi";
import MarketingQuiz from "@/components/MarketingQuiz";
import AccessGranted from "@/components/AccessGranted";
import ExtendTimeForWifi from "@/components/ExtendTimeForWifi";
import LeadCollectionGame from "@/components/LeadCollectionGame";
import { Button } from "@/components/ui/button";
import { Timer, Trophy } from "lucide-react";
import { Step, EngagementType, UserData } from "./types";

interface WifiPortalContentProps {
  currentStep: Step;
  setCurrentStep: (step: Step) => void;
  engagementType: EngagementType;
  userData: UserData;
  handleAuth: (method: string, data: any) => void;
  handleEngagementComplete: (data?: any) => void;
  handleContinue: () => void;
  handleExtendTime: (additionalMinutes: number) => void;
  handleLeadGameComplete: (leadData: any) => void;
}

const WifiPortalContent = ({
  currentStep,
  setCurrentStep,
  engagementType,
  userData,
  handleAuth,
  handleEngagementComplete,
  handleContinue,
  handleExtendTime,
  handleLeadGameComplete,
}: WifiPortalContentProps) => {
  return (
    <>
      {currentStep === Step.AUTH && (
        <AuthBox onAuth={handleAuth} />
      )}
      
      {currentStep === Step.ENGAGEMENT && engagementType === EngagementType.VIDEO && (
        <VideoForWifi onComplete={handleEngagementComplete} />
      )}
      
      {currentStep === Step.ENGAGEMENT && engagementType === EngagementType.QUIZ && (
        <MarketingQuiz onComplete={handleEngagementComplete} />
      )}
      
      {currentStep === Step.SUCCESS && (
        <>
          <AccessGranted 
            duration={userData.timeRemainingMinutes} 
            onContinue={handleContinue} 
          />
          
          <div className="w-full max-w-md mt-6 flex flex-col md:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Step.EXTEND_TIME)}
              className="flex-1"
            >
              <Timer className="mr-2 h-4 w-4" />
              Watch Video for More Time
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Step.LEAD_GAME)}
              className="flex-1"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Play Game for Free WiFi
            </Button>
          </div>
        </>
      )}
      
      {currentStep === Step.EXTEND_TIME && (
        <ExtendTimeForWifi onComplete={handleExtendTime} />
      )}
      
      {currentStep === Step.LEAD_GAME && (
        <LeadCollectionGame onComplete={handleLeadGameComplete} />
      )}
    </>
  );
};

export default WifiPortalContent;
