
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { wifiPortalService, WifiUser, WifiSession } from "@/services/wifi-portal-service";
import { Step, EngagementType, UserData } from "./types";

export const useWifiPortal = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.AUTH);
  const [engagementType, setEngagementType] = useState<EngagementType>(EngagementType.VIDEO);
  const [userData, setUserData] = useState<UserData>({
    timeRemainingMinutes: 30, // Default 30 minutes
  });
  const [loading, setLoading] = useState<boolean>(true);
  
  // Get MAC address - in a real implementation this would be provided by the captive portal
  const getMacAddress = (): string | null => {
    // This is a mock implementation - in a real captive portal, this would be provided
    // by the OPNsense API or URL parameters
    
    // For demo purposes, we'll use a simulated MAC address from localStorage
    const simulatedMac = localStorage.getItem('simulated_mac_address');
    if (!simulatedMac) {
      // Generate a simulated MAC for testing
      const randomMac = Array.from({length: 6}, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(':');
      
      localStorage.setItem('simulated_mac_address', randomMac);
      return randomMac;
    }
    
    return simulatedMac;
  };
  
  useEffect(() => {
    const checkExistingUser = async () => {
      try {
        setLoading(true);
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
  }, []);
  
  const handleAuth = async (method: string, data: any) => {
    try {
      setLoading(true);
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
  
  const handleReset = () => {
    // For demo purposes - reset the MAC address to simulate a new device
    localStorage.removeItem('simulated_mac_address');
    window.location.reload();
  };

  return {
    currentStep,
    setCurrentStep,
    engagementType,
    setEngagementType,
    userData,
    setUserData,
    loading,
    handleAuth,
    handleEngagementComplete,
    handleContinue,
    handleExtendTime,
    handleLeadGameComplete,
    handleReset,
    getMacAddress
  };
};
