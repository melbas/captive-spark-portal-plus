
import React from "react";
import AuthBox from "@/components/AuthBox";
import VideoForWifi from "@/components/VideoForWifi";
import MarketingQuiz from "@/components/MarketingQuiz";
import AccessGranted from "@/components/AccessGranted";
import ExtendTimeForWifi from "@/components/ExtendTimeForWifi";
import LeadCollectionGame from "@/components/LeadCollectionGame";
import { Button } from "@/components/ui/button";
import { Timer, Trophy, Award, Users } from "lucide-react";
import { Step, EngagementType, UserData, Reward, MiniGameData } from "./types";
import UserDashboard from "./UserDashboard";
import RewardSystem from "./RewardSystem";
import ReferralSystem from "./ReferralSystem";
import MiniGamesHub from "./MiniGamesHub";
import AdminDashboard from "./AdminDashboard";
import PaymentPortal from "./PaymentPortal";
import { useLanguage } from "../LanguageContext";
import { Card, CardContent } from "@/components/ui/card";

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
  const { t } = useLanguage();
  
  // Helper function for showing the main actions grid
  const renderMainActions = () => (
    <>
      <div className="w-full max-w-md mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(Step.EXTEND_TIME)}
          className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] sm:flex-row sm:justify-start"
        >
          <Timer className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" />
          <span className="text-center sm:text-left">{t("watchVideo")}</span>
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(Step.MINI_GAMES)}
          className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] sm:flex-row sm:justify-start"
        >
          <Trophy className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" />
          <span className="text-center sm:text-left">{t("playGame")}</span>
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => handleNavigate("rewards")}
          className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] sm:flex-row sm:justify-start"
        >
          <Award className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" />
          <span className="text-center sm:text-left">{t("rewards")}</span>
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => handleNavigate("dashboard")}
          className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] sm:flex-row sm:justify-start"
        >
          <Users className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" />
          <span className="text-center sm:text-left">{t("profile")}</span>
        </Button>
      </div>
      
      <div className="w-full max-w-md mt-3 grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={() => handleNavigate("payment")}
          className="flex flex-col items-center justify-center p-3 h-auto min-h-[60px] sm:flex-row sm:justify-start"
        >
          <svg className="w-5 h-5 mb-1 sm:mb-0 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
          <span className="text-center sm:text-left">{t("buyTime")}</span>
        </Button>
        
        {userData.isAdmin ? (
          <Button 
            variant="outline" 
            onClick={() => handleNavigate("admin")}
            className="flex flex-col items-center justify-center p-3 h-auto min-h-[60px] sm:flex-row sm:justify-start"
          >
            <svg className="w-5 h-5 mb-1 sm:mb-0 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span className="text-center sm:text-left">{t("administration")}</span>
          </Button>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => handleNavigate("referral")}
            className="flex flex-col items-center justify-center p-3 h-auto min-h-[60px] sm:flex-row sm:justify-start"
          >
            <svg className="w-5 h-5 mb-1 sm:mb-0 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              <path d="M6 1v3M10 1v3M14 1v3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <span className="text-center sm:text-left">{t("inviteFriends")}</span>
          </Button>
        )}
      </div>
    </>
  );
  
  // Helper function for displaying connection stats
  const renderConnectionStats = () => (
    <Card className="w-full max-w-md mt-4 overflow-hidden border border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center mb-2 sm:mb-0">
            <Timer className="h-5 w-5 text-primary mr-2" />
            <div>
              <span className="text-sm text-muted-foreground">{t("remaining")}</span>
              <p className="font-medium">{userData.timeRemainingMinutes} {t("minutes")}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-primary mr-2" />
            <div>
              <span className="text-sm text-muted-foreground">{t("userPoints")}</span>
              <p className="font-medium">{userData.points || 0} pts</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
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
          
          {renderConnectionStats()}
          {renderMainActions()}
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
