
import React from "react";
import AuthBox from "@/components/AuthBox";
import VideoForWifi from "@/components/VideoForWifi";
import MarketingQuiz from "@/components/MarketingQuiz";
import AccessGranted from "@/components/AccessGranted";
import ExtendTimeForWifi from "@/components/ExtendTimeForWifi";
import LeadCollectionGame from "@/components/LeadCollectionGame";
import { Button } from "@/components/ui/button";
import { Timer, Trophy } from "lucide-react";
import { Step, EngagementType, UserData } from "@/components/wifi-portal/types";

interface WifiPortalContentProps {
  currentStep: Step;
  engagementType: EngagementType;
  userData: UserData;
  onAuth: (method: string, data: any) => void;
  onEngagementComplete: (data?: any) => void;
  onContinue: () => void;
  onExtendTime: (additionalMinutes: number) => void;
  onLeadGameComplete: (leadData: any) => void;
  onSetCurrentStep: (step: Step) => void;
}

const WifiPortalContent: React.FC<WifiPortalContentProps> = ({
  currentStep,
  engagementType,
  userData,
  onAuth,
  onEngagementComplete,
  onContinue,
  onExtendTime,
  onLeadGameComplete,
  onSetCurrentStep
}) => {
  return (
    <>
      {currentStep === Step.AUTH && (
        <AuthBox onAuth={onAuth} />
      )}
      
      {currentStep === Step.ENGAGEMENT && engagementType === EngagementType.VIDEO && (
        <VideoForWifi onComplete={onEngagementComplete} />
      )}
      
      {currentStep === Step.ENGAGEMENT && engagementType === EngagementType.QUIZ && (
        <MarketingQuiz onComplete={onEngagementComplete} />
      )}
      
      {currentStep === Step.SUCCESS && (
        <>
          <AccessGranted 
            duration={userData.timeRemainingMinutes} 
            onContinue={onContinue} 
          />
          
          <div className="w-full max-w-md mt-6 flex flex-col md:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => onSetCurrentStep(Step.EXTEND_TIME)}
              className="flex-1"
            >
              <Timer className="mr-2 h-4 w-4" />
              Watch Video for More Time
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onSetCurrentStep(Step.LEAD_GAME)}
              className="flex-1"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Play Game for Free WiFi
            </Button>
          </div>
        </>
      )}
      
      {currentStep === Step.EXTEND_TIME && (
        <ExtendTimeForWifi onComplete={onExtendTime} />
      )}
      
      {currentStep === Step.LEAD_GAME && (
        <LeadCollectionGame onComplete={onLeadGameComplete} />
      )}
    </>
  );
};

export default WifiPortalContent;
