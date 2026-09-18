import React, { Suspense, lazy } from "react";
import AuthBox from "@/components/AuthBox";
import VideoForWifi from "@/components/VideoForWifi";
import MarketingQuiz from "@/components/MarketingQuiz";
import AccessGranted from "@/components/AccessGranted";
import LeadCollectionGame from "@/components/LeadCollectionGame";
import { Button } from "@/components/ui/button";
import { Timer, Trophy, Award, Users, AlertTriangle, GraduationCap } from 'lucide-react';
import { Step, EngagementType, UserData, Reward, MiniGameData } from "./types";
import { useLanguage } from "../LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PortalModuleGating, PortalModuleKey } from "@/lib/portal-config-defaults";

// Code-splitting : les modules du parcours (le plus lourd du bundle) sont chargés à la demande.
const ExtendTimeForWifi = lazy(() => import("@/components/ExtendTimeForWifi"));
const UserDashboard = lazy(() => import("./UserDashboard"));
const RewardSystem = lazy(() => import("./RewardSystem"));
const ReferralSystem = lazy(() => import("./ReferralSystem"));
const MiniGamesHub = lazy(() => import("./MiniGamesHub"));
const LearningCenter = lazy(() => import("./LearningCenter"));
const PaymentPortal = lazy(() => import("./PaymentPortal"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));

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
  loading?: boolean;
  error?: string | null;
  /** Gating des modules du parcours (portal_enabled_modules). null = fail-closed. */
  modules: PortalModuleGating;
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
  loading,
  error,
  modules
}: WifiPortalContentProps) => {
  const { t } = useLanguage();
  // Fail-closed : sans config publiée sur un vrai site, seul l'essentiel reste visible
  const moduleOn = (key: PortalModuleKey) =>
    modules ? modules[key] === true : false;

  // Helper function for showing the main actions grid
  const renderMainActions = () => (
    <>
      <div className="w-full max-w-md mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {moduleOn("extend_time") && (
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Step.EXTEND_TIME)}
            className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] sm:flex-row sm:justify-start"
          >
            <Timer className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-center sm:text-left">{t("watchVideo")}</span>
          </Button>
        )}

        {moduleOn("mini_games") && (
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Step.MINI_GAMES)}
            className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] sm:flex-row sm:justify-start"
          >
            <Trophy className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-center sm:text-left">{t("playGame")}</span>
          </Button>
        )}

        {moduleOn("rewards") && (
          <Button
            variant="outline"
            onClick={() => handleNavigate("rewards")}
            className="flex flex-col items-center justify-center p-3 h-auto min-h-[80px] sm:flex-row sm:justify-start"
          >
            <Award className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-center sm:text-left">{t("rewards")}</span>
          </Button>
        )}

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
        {moduleOn("payment") && (
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
        )}

        {moduleOn("learning_center") && (
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Step.LEARNING_CENTER)}
            className="flex flex-col items-center justify-center p-3 h-auto min-h-[60px] sm:flex-row sm:justify-start"
          >
            <GraduationCap className="w-5 h-5 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-center sm:text-left">{t("learningCenter")}</span>
          </Button>
        )}
      </div>

      <div className="w-full max-w-md mt-3 grid grid-cols-1 gap-3">
        {userData.isAdmin && (
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
        )}

        {!userData.isAdmin && moduleOn("referral") && (
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

  // Display error message if any
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
        <CardContent className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
          <div className="text-center">
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
        <CardContent className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">{t("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case Step.AUTH:
        return <AuthBox onAuth={handleAuth} />;
      case Step.ENGAGEMENT:
        if (engagementType === EngagementType.VIDEO && moduleOn("video")) {
          return <VideoForWifi onComplete={handleEngagementComplete} />;
        }
        if (engagementType === EngagementType.QUIZ && moduleOn("quiz")) {
          return <MarketingQuiz onComplete={handleEngagementComplete} />;
        }
        // Module d'engagement désactivé : pas de contournement simulé
        return null;
      case Step.SUCCESS:
        return (
          <>
            <AccessGranted
              duration={userData.timeRemainingMinutes}
              onContinue={handleContinue}
            />
            {renderConnectionStats()}
            {renderMainActions()}
          </>
        );
      case Step.EXTEND_TIME:
        return moduleOn("extend_time") ? (
          <ExtendTimeForWifi onComplete={handleExtendTime} />
        ) : null;
      case Step.LEAD_GAME:
        return moduleOn("mini_games") ? (
          <LeadCollectionGame onComplete={handleLeadGameComplete} />
        ) : null;
      case Step.DASHBOARD:
        return (
          <UserDashboard
            userData={userData}
            onBack={() => setCurrentStep(Step.SUCCESS)}
            onNavigate={handleNavigate}
            onExtendTime={() => setCurrentStep(Step.EXTEND_TIME)}
          />
        );
      case Step.REWARDS:
        return moduleOn("rewards") ? (
          <RewardSystem
            userData={userData}
            onBack={() => setCurrentStep(Step.SUCCESS)}
            onRedeem={handleRedeemReward}
          />
        ) : null;
      case Step.REFERRAL:
        return moduleOn("referral") ? (
          <ReferralSystem
            userData={userData}
            onBack={() => setCurrentStep(Step.SUCCESS)}
            onInvite={handleInvite}
          />
        ) : null;
      case Step.MINI_GAMES:
        return moduleOn("mini_games") ? (
          <MiniGamesHub
            userData={userData}
            onBack={() => setCurrentStep(Step.SUCCESS)}
            onGameComplete={handleGameComplete}
          />
        ) : null;
      case Step.ADMIN_STATS:
        return (
          <AdminDashboard
            userData={userData}
            onBack={() => setCurrentStep(Step.SUCCESS)}
          />
        );
      case Step.LEARNING_CENTER:
        return moduleOn("learning_center") ? (
          <LearningCenter userData={userData} onBack={() => setCurrentStep(Step.SUCCESS)} />
        ) : null;
      case Step.PAYMENT:
        return moduleOn("payment") ? (
          <PaymentPortal
            userData={userData}
            onBack={() => setCurrentStep(Step.SUCCESS)}
            onPaymentComplete={handlePaymentComplete}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
          <CardContent className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">{t("loading")}</p>
          </CardContent>
        </Card>
      }
    >
      {renderStep()}
    </Suspense>
  );
};

export default WifiPortalContent;
