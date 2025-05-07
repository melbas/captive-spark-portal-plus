
import React from "react";
import AuthBox from "@/components/AuthBox";
import VideoForWifi from "@/components/VideoForWifi";
import MarketingQuiz from "@/components/MarketingQuiz";
import AccessGranted from "@/components/AccessGranted";
import ExtendTimeForWifi from "@/components/ExtendTimeForWifi";
import LeadCollectionGame from "@/components/LeadCollectionGame";
import { Button } from "@/components/ui/button";
import { Timer, Trophy, ChevronLeft, Award, Users } from "lucide-react";
import { Step, EngagementType, UserData, Reward, MiniGameData } from "./types";
import UserDashboard from "./UserDashboard";
import RewardSystem from "./RewardSystem";
import ReferralSystem from "./ReferralSystem";
import MiniGamesHub from "./MiniGamesHub";
import AdminDashboard from "./AdminDashboard";
import PaymentPortal from "./PaymentPortal";

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
  handleGameComplete: (gameData: MiniGameData, score: number) => void;
  handlePaymentComplete: (packageId: string, minutes: number) => void;
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
  handleGameComplete,
  handlePaymentComplete,
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
              onClick={() => setCurrentStep(Step.MINI_GAMES)}
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
          
          <div className="w-full max-w-md mt-3 grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleNavigate("payment")}
              className="flex-1"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              Acheter du temps
            </Button>
            
            {userData.isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => handleNavigate("admin")}
                className="flex-1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                Administration
              </Button>
            )}
            
            {!userData.isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => handleNavigate("referral")}
                className="flex-1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path d="M6 1v3M10 1v3M14 1v3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                Inviter des amis
              </Button>
            )}
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
      
      {currentStep === Step.MINI_GAMES && (
        <MiniGamesHub 
          userData={userData}
          onBack={() => setCurrentStep(Step.SUCCESS)}
          onGameComplete={handleGameComplete}
        />
      )}
      
      {currentStep === Step.ADMIN_STATS && (
        <AdminDashboard 
          userData={userData}
          onBack={() => setCurrentStep(Step.SUCCESS)}
        />
      )}
      
      {currentStep === Step.PAYMENT && (
        <PaymentPortal 
          userData={userData}
          onBack={() => setCurrentStep(Step.SUCCESS)}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </>
  );
};

export default WifiPortalContent;
