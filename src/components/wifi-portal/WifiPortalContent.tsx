
import React from "react";
import AuthBox from "@/components/AuthBox";
import VideoForWifi from "@/components/VideoForWifi";
import MarketingQuiz from "@/components/MarketingQuiz";
import AccessGranted from "@/components/AccessGranted";
import ExtendTimeForWifi from "@/components/ExtendTimeForWifi";
import LeadCollectionGame from "@/components/LeadCollectionGame";
import { Button } from "@/components/ui/button";
import { Timer, Trophy, ChevronLeft, Award, Users } from "lucide-react";
import { Step, EngagementType, UserData, Reward } from "./types";
import UserDashboard from "./UserDashboard";
import RewardSystem from "./RewardSystem";
import ReferralSystem from "./ReferralSystem";

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
  handleNavigate: (section: string) => void;
  handleRedeemReward: (reward: Reward) => void;
  handleInvite: (email: string) => void;
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
  handleNavigate,
  handleRedeemReward,
  handleInvite,
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
          
          <div className="w-full max-w-md mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Step.EXTEND_TIME)}
              className="flex-1"
            >
              <Timer className="mr-2 h-4 w-4" />
              Regarder une vidéo
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Step.LEAD_GAME)}
              className="flex-1"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Jouer
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => handleNavigate("rewards")}
              className="flex-1"
            >
              <Award className="mr-2 h-4 w-4" />
              Récompenses
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => handleNavigate("dashboard")}
              className="flex-1"
            >
              <Users className="mr-2 h-4 w-4" />
              Profil
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
      
      {currentStep === Step.DASHBOARD && (
        <UserDashboard 
          userData={userData}
          onBack={() => setCurrentStep(Step.SUCCESS)}
          onNavigate={handleNavigate}
          onExtendTime={() => setCurrentStep(Step.EXTEND_TIME)}
        />
      )}
      
      {currentStep === Step.REWARDS && (
        <RewardSystem 
          userData={userData}
          onBack={() => setCurrentStep(Step.SUCCESS)}
          onRedeem={handleRedeemReward}
        />
      )}
      
      {currentStep === Step.REFERRAL && (
        <ReferralSystem 
          userData={userData}
          onBack={() => setCurrentStep(Step.SUCCESS)}
          onInvite={handleInvite}
        />
      )}
    </>
  );
};

export default WifiPortalContent;
