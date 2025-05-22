import { useState, useEffect } from "react";
import { toast } from "sonner";
import { wifiPortalService, WifiUser, WifiSession } from "@/services/wifi-portal-service";
import { 
  Step, 
  EngagementType, 
  UserData, 
  UserLevel, 
  Reward, 
  RewardType,
  MiniGameData,
  GameType
} from "./types";

export const useWifiPortal = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.AUTH);
  const [engagementType, setEngagementType] = useState<EngagementType>(EngagementType.VIDEO);
  const [userData, setUserData] = useState<UserData>({
    timeRemainingMinutes: 30, // Default 30 minutes
    points: 0,
    level: UserLevel.BASIC,
    connectionHistory: [],
    isAdmin: false, // Default to non-admin
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Logger les transitions d'état pour le débogage
  useEffect(() => {
    console.log(`État actuel: ${currentStep}`);
  }, [currentStep]);
  
  // Ajouter un gestionnaire d'erreurs global pour capturer les erreurs non détectées
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("Erreur non captée:", event.error);
      setError(`Une erreur s'est produite: ${event.message}`);
      toast.error("Une erreur s'est produite. Veuillez réessayer.");
    };

    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
  
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
        setError(null);
        const macAddress = getMacAddress();
        
        if (macAddress) {
          console.log("Vérification de l'utilisateur avec MAC:", macAddress);
          const existingUser = await wifiPortalService.getUserByMac(macAddress);
          
          if (existingUser) {
            console.log("Utilisateur existant trouvé:", existingUser);
            // Auto-login returning user
            const sessionData: WifiSession = {
              user_id: existingUser.id!,
              duration_minutes: 30
            };
            
            const session = await wifiPortalService.createSession(sessionData);
            
            if (session) {
              console.log("Session créée avec succès:", session);
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
                ],
                // Set admin status - in a real implementation, this would come from the database
                isAdmin: existingUser.email === "admin@example.com"
              });
              
              setCurrentStep(Step.SUCCESS);
              toast.success("Welcome back! You've been automatically connected.");
            } else {
              console.error("Échec de la création de session");
              throw new Error("Failed to create session");
            }
          } else {
            console.log("Aucun utilisateur existant trouvé, affichage de l'écran de connexion");
          }
        }
      } catch (error) {
        console.error("Error checking existing user:", error);
        setError("Failed to check existing user.");
      } finally {
        setLoading(false);
      }
    };
    
    checkExistingUser();
  }, []);
  
  const handleAuth = async (method: string, data: any) => {
    try {
      console.log(`Authentification avec méthode: ${method}`, data);
      setLoading(true);
      setError(null);
      
      // Create new user in database
      const user: WifiUser = {
        auth_method: method,
        ...data
      };
      
      const macAddress = getMacAddress();
      if (macAddress) {
        user.mac_address = macAddress;
      }
      
      // Directly create user with error handling
      let createdUser;
      try {
        createdUser = await wifiPortalService.createUser(user);
        console.log("Utilisateur créé:", createdUser);
      } catch (err: any) {
        console.error("Error creating user:", err);
        toast.error(`Authentication failed: ${err.message || "Unknown error"}`);
        throw err;
      }
      
      if (!createdUser) {
        console.error("Utilisateur non créé");
        toast.error("Error creating user account. Please try again.");
        throw new Error("Failed to create user");
      }
      
      // Create a new session
      const sessionData: WifiSession = {
        user_id: createdUser.id!,
        duration_minutes: 30,
      };
      
      console.log("Création de session pour l'utilisateur:", sessionData);
      const session = await wifiPortalService.createSession(sessionData);
      
      if (session) {
        console.log("Session créée avec succès:", session);
        // In a real implementation, we would fetch the user's points, level, history from the database
        setUserData({
          ...userData, 
          id: createdUser.id,
          sessionId: session.id,
          authMethod: method,
          macAddress: macAddress,
          points: 10, // Starting points for new users
          level: UserLevel.BASIC,
          referralCode: "WIFI" + Math.floor(Math.random() * 10000),
          isAdmin: data.email === "admin@example.com", // Simple admin check
          ...data
        });
        
        // Randomly choose engagement type (video or quiz)
        // In a real implementation, this could be configured by the admin
        const randomEngagement = Math.random() > 0.5 
          ? EngagementType.VIDEO 
          : EngagementType.QUIZ;
        
        console.log(`Type d'engagement choisi: ${randomEngagement}`);
        setEngagementType(randomEngagement);
        setCurrentStep(Step.ENGAGEMENT);
        
        toast.success(`Authentication successful via ${method}`);
      } else {
        console.error("Échec de la création de session");
        throw new Error("Failed to create session");
      }
    } catch (error: any) {
      console.error("Error during authentication:", error);
      setError(error?.message || "Authentication failed. Please try again.");
      // Keep at AUTH step to let user try again
    } finally {
      setLoading(false);
    }
  };
  
  const handleEngagementComplete = async (data?: any) => {
    try {
      console.log("Engagement complété:", data);
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
    // Dans une implémentation réelle, rediriger vers l'URL demandée
    // Utiliser un état React plutôt qu'une redirection de page complète
    console.log("Redirection vers l'URL demandée");
    toast.info("Redirection vers la page demandée...");
    
    // Simulation de redirection pour la démo
    setTimeout(() => {
      toast.success("Vous êtes maintenant connecté à Internet!");
    }, 1500);
    
    // IMPORTANT: Ne pas utiliser window.location.href pour éviter les problèmes d'écran blanc
    // window.location.href = "https://www.google.com";
  };
  
  const handleExtendTime = async (additionalMinutes: number) => {
    try {
      console.log(`Extension du temps de ${additionalMinutes} minutes`);
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
      console.log("Jeu de collecte de leads terminé:", leadData);
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
  
  const handleNavigate = (section: string) => {
    console.log(`Navigation vers: ${section}`);
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
      case "mini-games":
        setCurrentStep(Step.MINI_GAMES);
        break;
      case "admin":
        setCurrentStep(Step.ADMIN_STATS);
        break;
      case "payment":
        setCurrentStep(Step.PAYMENT);
        break;
      default:
        setCurrentStep(Step.SUCCESS);
    }
  };
  
  const handleRedeemReward = (reward: Reward) => {
    const pointsCost = reward.pointsCost;
    const currentPoints = userData.points || 0;
    
    console.log(`Tentative d'échange de récompense: ${reward.name}, coût: ${pointsCost}, points actuels: ${currentPoints}`);
    
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
    console.log(`Invitation envoyée à: ${email}`);
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
  
  const handleGameComplete = (gameData: MiniGameData, score: number) => {
    // Calculate rewards based on game type and score
    console.log(`Jeu terminé: ${gameData.name}, Score: ${score}`);
    const pointsEarned = Math.round(gameData.rewardPoints * (score / 100));
    const minutesEarned = Math.round(gameData.rewardMinutes * (score / 100));
    
    // Update user data with rewards
    setUserData(prev => ({
      ...prev,
      points: (prev.points || 0) + pointsEarned,
      timeRemainingMinutes: (prev.timeRemainingMinutes || 0) + minutesEarned
    }));
    
    // Show success message
    toast.success(`Jeu terminé! Vous avez gagné ${pointsEarned} points et ${minutesEarned} minutes de WiFi`);
    
    // Increment game statistics in a real implementation
    // For now just log it
    console.log(`Game played: ${gameData.name}, Score: ${score}`);
    
    // Return to the mini-games hub
    // The user can decide to play again or go back to the main screen
  };
  
  const handlePaymentComplete = (packageId: string, minutes: number) => {
    // In a real implementation, this would process the payment and update the user's time
    // For demo purposes, we'll just update the user's time
    console.log(`Paiement complété pour le paquet: ${packageId}, minutes: ${minutes}`);
    
    setUserData(prev => ({
      ...prev,
      timeRemainingMinutes: (prev.timeRemainingMinutes || 0) + minutes
    }));
    
    // Return to the main screen
    setCurrentStep(Step.SUCCESS);
  };
  
  const handleReset = () => {
    // For demo purposes - reset the MAC address to simulate a new device
    console.log("Réinitialisation complète");
    localStorage.removeItem('simulated_mac_address');
    
    // Utiliser un état React pour éviter une redirection de page complète
    setLoading(true);
    setUserData({
      timeRemainingMinutes: 30,
      points: 0,
      level: UserLevel.BASIC,
      connectionHistory: [],
      isAdmin: false
    });
    
    setCurrentStep(Step.AUTH);
    
    setTimeout(() => {
      setLoading(false);
      toast.success("Session réinitialisée");
    }, 500);
  };

  return {
    currentStep,
    setCurrentStep,
    engagementType,
    setEngagementType,
    userData,
    setUserData,
    loading,
    error,
    handleAuth,
    handleEngagementComplete,
    handleContinue,
    handleExtendTime,
    handleLeadGameComplete,
    handleReset,
    getMacAddress,
    handleNavigate,
    handleRedeemReward,
    handleInvite,
    handleGameComplete,
    handlePaymentComplete
  };
};
