
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import AuthBox from "@/components/AuthBox";
import VideoForWifi from "@/components/VideoForWifi";
import MarketingQuiz from "@/components/MarketingQuiz";
import AccessGranted from "@/components/AccessGranted";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import ExtendTimeForWifi from "@/components/ExtendTimeForWifi";
import LeadCollectionGame from "@/components/LeadCollectionGame";
import { Button } from "@/components/ui/button";
import { Timer, Trophy, ChevronLeft } from "lucide-react";
import { wifiPortalService, WifiUser, WifiSession } from "@/services/wifi-portal-service";
import { Step, EngagementType, UserData } from "@/components/wifi-portal/types";
import { useMacAddress } from "@/components/wifi-portal/hooks/useMacAddress";

const WifiPortalContainer = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.AUTH);
  const [engagementType, setEngagementType] = useState<EngagementType>(EngagementType.VIDEO);
  const [userData, setUserData] = useState<UserData>({
    timeRemainingMinutes: 30, // Default 30 minutes
  });
  const [loading, setLoading] = useState<boolean>(true);
  
  const { macAddress, handleReset } = useMacAddress();
  
  useEffect(() => {
    const checkExistingUser = async () => {
      try {
        setLoading(true);
        
        if (macAddress) {
          const existingUser = await wifiPortalService.getUserByMac(macAddress);
          
          if (existingUser) {
            // Auto-login returning user
            const sessionData: WifiSession = {
              user_id: existingUser.id!,
              duration_minutes: 30
            };
            
            const session = await wifiPortalService.createSession(sessionData);
            
            if (session) {
              setUserData({
                id: existingUser.id,
                authMethod: existingUser.auth_method,
                timeRemainingMinutes: session.duration_minutes,
                sessionId: session.id,
                email: existingUser.email,
                phone: existingUser.phone,
                name: existingUser.name,
                macAddress: macAddress
              });
              
              setCurrentStep(Step.SUCCESS);
              toast.success("Welcome back! You've been automatically connected.");
            }
          }
        }
      } catch (error) {
        console.error("Error checking existing user:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkExistingUser();
  }, [macAddress]);
  
  const handleAuth = async (method: string, data: any) => {
    try {
      setLoading(true);
      // Create new user in database
      const user: WifiUser = {
        auth_method: method,
        ...data
      };
      
      if (macAddress) {
        user.mac_address = macAddress;
      }
      
      const createdUser = await wifiPortalService.createUser(user);
      
      if (createdUser) {
        // Create a new session
        const sessionData: WifiSession = {
          user_id: createdUser.id!,
          duration_minutes: 30,
        };
        
        const session = await wifiPortalService.createSession(sessionData);
        
        if (session) {
          setUserData({
            ...userData, 
            id: createdUser.id,
            sessionId: session.id,
            authMethod: method,
            macAddress: macAddress,
            ...data
          });
          
          // Randomly choose engagement type (video or quiz)
          // In a real implementation, this could be configured by the admin
          const randomEngagement = Math.random() > 0.5 
            ? EngagementType.VIDEO 
            : EngagementType.QUIZ;
          
          setEngagementType(randomEngagement);
          setCurrentStep(Step.ENGAGEMENT);
          
          toast.success(`Authentication successful via ${method}`);
        }
      } else {
        toast.error("Error creating user account. Please try again.");
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      toast.error("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleEngagementComplete = async (data?: any) => {
    try {
      setLoading(true);
      if (userData.sessionId && data) {
        // Update session with engagement data
        await wifiPortalService.updateSession(userData.sessionId, {
          user_id: userData.id!,
          engagement_type: engagementType === EngagementType.VIDEO ? 'video' : 'quiz',
          engagement_data: data,
          duration_minutes: userData.timeRemainingMinutes || 30
        });
        
        // Update stats based on engagement type
        if (engagementType === EngagementType.VIDEO) {
          await wifiPortalService.incrementStatistic('video_views');
        } else {
          await wifiPortalService.incrementStatistic('quiz_completions');
        }
        
        setUserData({...userData, engagementData: data});
      }
      
      setCurrentStep(Step.SUCCESS);
      toast.success("Access granted!");
    } catch (error) {
      console.error("Error completing engagement:", error);
      toast.error("Error processing your engagement. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleContinue = () => {
    // In a real implementation, this would redirect to the requested URL
    window.location.href = "https://www.google.com";
  };
  
  const handleExtendTime = async (additionalMinutes: number) => {
    try {
      setLoading(true);
      const newDuration = (userData.timeRemainingMinutes || 0) + additionalMinutes;
      
      if (userData.sessionId) {
        await wifiPortalService.updateSession(userData.sessionId, {
          user_id: userData.id!,
          duration_minutes: newDuration
        });
        
        // Increment video views stat
        await wifiPortalService.incrementStatistic('video_views');
      }
      
      setUserData(prev => ({
        ...prev,
        timeRemainingMinutes: newDuration
      }));
      
      setCurrentStep(Step.SUCCESS);
      toast.success(`Great! You've earned ${additionalMinutes} more minutes of WiFi time.`);
    } catch (error) {
      console.error("Error extending time:", error);
      toast.error("Error extending your WiFi time. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleLeadGameComplete = async (leadData: any) => {
    try {
      setLoading(true);
      const additionalMinutes = 15; // Default reward
      const newDuration = (userData.timeRemainingMinutes || 0) + additionalMinutes;
      
      if (userData.sessionId) {
        await wifiPortalService.updateSession(userData.sessionId, {
          user_id: userData.id!,
          duration_minutes: newDuration
        });
        
        // Update lead data for the user if available
        if (userData.id) {
          const updateData: Partial<WifiUser> = {};
          
          if (leadData.email) updateData.email = leadData.email;
          if (leadData.name) updateData.name = leadData.name;
          if (leadData.phone) updateData.phone = leadData.phone;
          
          // Update user record with lead data
          await wifiPortalService.updateUser(userData.id, updateData);
        }
        
        // Increment lead collection stat
        await wifiPortalService.incrementStatistic('leads_collected');
        await wifiPortalService.incrementStatistic('games_played');
      }
      
      setUserData(prev => ({
        ...prev,
        leadData,
        timeRemainingMinutes: newDuration
      }));
      
      setCurrentStep(Step.SUCCESS);
      toast.success("Thanks for playing! You've earned 15 more minutes of WiFi time.");
    } catch (error) {
      console.error("Error completing lead game:", error);
      toast.error("Error processing your game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout withGradientBg>
      <div className="flex flex-col items-center justify-center min-h-[80vh] py-8">
        <div className="w-full max-w-md mb-8">
          <h1 className="text-4xl font-bold text-center mb-2 text-foreground">
            SparkWiFi Portal
          </h1>
          <p className="text-center text-muted-foreground">
            Connect to our high-speed WiFi network
          </p>
          
          {/* For demo purposes - show the simulated MAC address */}
          <p className="text-center text-xs text-muted-foreground mt-2">
            Demo MAC: {macAddress}
            <Button variant="ghost" size="sm" className="ml-2 h-5 px-2" onClick={handleReset}>
              <ChevronLeft className="h-3 w-3 mr-1" /> Reset
            </Button>
          </p>
        </div>
        
        {loading ? (
          <LoadingCard />
        ) : (
          <WifiPortalContent 
            currentStep={currentStep}
            engagementType={engagementType}
            userData={userData}
            onAuth={handleAuth}
            onEngagementComplete={handleEngagementComplete}
            onContinue={handleContinue}
            onExtendTime={handleExtendTime}
            onLeadGameComplete={handleLeadGameComplete}
            onSetCurrentStep={setCurrentStep}
          />
        )}
        
        <TermsFooter />
      </div>
    </Layout>
  );
};

const LoadingCard = () => (
  <Card className="w-full max-w-md p-6">
    <div className="flex flex-col items-center justify-center">
      <div className="h-6 w-6 border-t-2 border-primary rounded-full animate-spin"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </Card>
);

const TermsFooter = () => (
  <Card className="w-full max-w-md mt-8 p-4 glass-card">
    <p className="text-sm text-center text-muted-foreground">
      By connecting to our network, you agree to our{" "}
      <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
      and{" "}
      <a href="#" className="text-primary hover:underline">Privacy Policy</a>
    </p>
  </Card>
);

export default WifiPortalContainer;
