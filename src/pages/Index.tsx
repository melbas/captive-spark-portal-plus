
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
import { Timer, Trophy } from "lucide-react";
import { wifiPortalService, WifiUser, WifiSession } from "@/services/wifi-portal-service";

// Portal access flow steps
enum Step {
  AUTH,
  ENGAGEMENT,
  SUCCESS,
  EXTEND_TIME,
  LEAD_GAME
}

// Engagement types
enum EngagementType {
  VIDEO,
  QUIZ
}

interface UserData {
  authMethod?: string;
  timeRemainingMinutes?: number;
  engagementData?: any;
  id?: string;
  sessionId?: string;
  [key: string]: any;
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.AUTH);
  const [engagementType, setEngagementType] = useState<EngagementType>(EngagementType.VIDEO);
  const [userData, setUserData] = useState<UserData>({
    timeRemainingMinutes: 30, // Default 30 minutes
  });
  
  // Try to get MAC address - in a real implementation this would be provided by the captive portal
  const getMacAddress = (): string | null => {
    // This is a mock implementation - in a real captive portal, this would be provided
    // by the OPNsense API or URL parameters
    return null;
  };
  
  useEffect(() => {
    const checkExistingUser = async () => {
      const macAddress = getMacAddress();
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
              name: existingUser.name
            });
            
            setCurrentStep(Step.SUCCESS);
            toast.success("Welcome back! You've been automatically connected.");
          }
        }
      }
    };
    
    checkExistingUser();
  }, []);
  
  const handleAuth = async (method: string, data: any) => {
    // Create new user in database
    const user: WifiUser = {
      auth_method: method,
      ...data
    };
    
    const macAddress = getMacAddress();
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
  };
  
  const handleEngagementComplete = async (data?: any) => {
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
  };
  
  const handleContinue = () => {
    // In a real implementation, this would redirect to the requested URL
    window.location.href = "https://www.google.com";
  };
  
  const handleExtendTime = async (additionalMinutes: number) => {
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
  };
  
  const handleLeadGameComplete = async (leadData: any) => {
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
        
        // This would update the user record - not implemented in the service yet
        // await wifiPortalService.updateUser(userData.id, updateData);
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
        </div>
        
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
        
        <Card className="w-full max-w-md mt-8 p-4 glass-card">
          <p className="text-sm text-center text-muted-foreground">
            By connecting to our network, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
