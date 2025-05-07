
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { wifiPortalService, WifiUser, WifiSession } from "@/services/wifi-portal-service";
import { Step, EngagementType, UserData, UserLevel, Reward, RewardType } from "./types";

export const useWifiPortal = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.AUTH);
  const [engagementType, setEngagementType] = useState<EngagementType>(EngagementType.VIDEO);
  const [userData, setUserData] = useState<UserData>({
    timeRemainingMinutes: 30, // Default 30 minutes
    points: 0,
    level: UserLevel.BASIC,
    connectionHistory: [],
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
              // In a real implementation, we would fetch the user's points, level, history from the database
              setUserData({
                id: existingUser.id,
                authMethod: existingUser.auth_method,
                timeRemainingMinutes: session.duration_minutes,
                sessionId: session.id,
                email: existingUser.email,
                phone: existingUser.phone,
                name: existingUser.name,
                macAddress: macAddress,
                // Mock data for new features
                points: Math.floor(Math.random() * 500),
                level: UserLevel.SILVER, 
                referralCode: "WIFI" + existingUser.id?.substring(0, 4),
                connectionHistory: [
                  {
                    date: new Date().toLocaleDateString(),
                    duration: 30,
                    engagementType: 'auto-login'
                  },
                  {
                    date: new Date(Date.now() - 86400000).toLocaleDateString(),
                    duration: 45,
                    engagementType: 'video'
                  },
                  {
                    date: new Date(Date.now() - 172800000).toLocaleDateString(),
                    duration: 60,
                    engagementType: 'quiz'
                  }
                ]
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
            points: 10, // Starting points for new users
            level: UserLevel.BASIC,
            referralCode: "WIFI" + Math.floor(Math.random() * 10000),
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
          // Add points for completing a video
          setUserData(prev => ({
            ...prev,
            points: (prev.points || 0) + 20,
            engagementData: data
          }));
        } else {
          await wifiPortalService.incrementStatistic('quiz_completions');
          // Add points for completing a quiz
          setUserData(prev => ({
            ...prev,
            points: (prev.points || 0) + 30,
            engagementData: data
          }));
        }
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
      
      // Add points for watching video to extend time
      setUserData(prev => ({
        ...prev,
        timeRemainingMinutes: newDuration,
        points: (prev.points || 0) + 15
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
      
      // Add points for completing the lead game
      setUserData(prev => ({
        ...prev,
        leadData,
        timeRemainingMinutes: newDuration,
        points: (prev.points || 0) + 35
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
  
  const handleViewDashboard = () => {
    setCurrentStep(Step.DASHBOARD);
  };
  
  const handleViewRewards = () => {
    setCurrentStep(Step.REWARDS);
  };
  
  const handleViewReferral = () => {
    setCurrentStep(Step.REFERRAL);
  };
  
  const handleNavigate = (section: string) => {
    switch (section) {
      case "dashboard":
        setCurrentStep(Step.DASHBOARD);
        break;
      case "rewards":
        setCurrentStep(Step.REWARDS);
        break;
      case "referral":
        setCurrentStep(Step.REFERRAL);
        break;
      default:
        setCurrentStep(Step.SUCCESS);
    }
  };
  
  const handleRedeemReward = (reward: Reward) => {
    const pointsCost = reward.pointsCost;
    const currentPoints = userData.points || 0;
    
    if (currentPoints < pointsCost) {
      toast.error("Vous n'avez pas assez de points");
      return;
    }
    
    let additionalMinutes = 0;
    
    switch (reward.type) {
      case RewardType.WIFI_TIME:
        additionalMinutes = reward.value;
        break;
      case RewardType.PREMIUM_ACCESS:
        // In a real implementation, we would set a premium flag in the user record
        toast.success(`Accès premium activé pour ${reward.value} jour(s)`);
        break;
      case RewardType.DISCOUNT:
        // In a real implementation, we would generate a discount code
        toast.success(`Code de réduction de ${reward.value}% généré`);
        break;
    }
    
    if (additionalMinutes > 0) {
      // Update time remaining
      setUserData(prev => ({
        ...prev,
        timeRemainingMinutes: (prev.timeRemainingMinutes || 0) + additionalMinutes,
        points: currentPoints - pointsCost
      }));
      
      toast.success(`Vous avez gagné ${additionalMinutes} minutes de WiFi supplémentaires!`);
    } else {
      // Just deduct points for non-time rewards
      setUserData(prev => ({
        ...prev,
        points: currentPoints - pointsCost
      }));
    }
  };
  
  const handleInvite = (email: string) => {
    // In a real implementation, this would send an invitation email
    // For now, just simulate adding a referred user
    const referredUsers = userData.referredUsers || [];
    
    if (!referredUsers.includes(email)) {
      // Add the new referral
      setUserData(prev => ({
        ...prev,
        referredUsers: [...referredUsers, email],
        timeRemainingMinutes: (prev.timeRemainingMinutes || 0) + 30, // Bonus time
        points: (prev.points || 0) + 50 // Bonus points
      }));
      
      toast.success(`${email} a été invité(e). Vous avez gagné 30 minutes et 50 points!`);
    } else {
      toast.error("Cet utilisateur a déjà été invité");
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
    getMacAddress,
    handleViewDashboard,
    handleViewRewards,
    handleViewReferral,
    handleNavigate,
    handleRedeemReward,
    handleInvite
  };
};
