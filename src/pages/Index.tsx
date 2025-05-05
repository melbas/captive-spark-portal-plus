
import React, { useState } from "react";
import Layout from "@/components/Layout";
import AuthBox from "@/components/AuthBox";
import VideoForWifi from "@/components/VideoForWifi";
import MarketingQuiz from "@/components/MarketingQuiz";
import AccessGranted from "@/components/AccessGranted";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

// Portal access flow steps
enum Step {
  AUTH,
  ENGAGEMENT,
  SUCCESS
}

// Engagement types
enum EngagementType {
  VIDEO,
  QUIZ
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.AUTH);
  const [engagementType, setEngagementType] = useState<EngagementType>(EngagementType.VIDEO);
  const [userData, setUserData] = useState<any>({});
  
  const handleAuth = (method: string, data: any) => {
    setUserData({...userData, authMethod: method, ...data});
    
    // Randomly choose engagement type (video or quiz)
    // In a real implementation, this could be configured by the admin
    const randomEngagement = Math.random() > 0.5 
      ? EngagementType.VIDEO 
      : EngagementType.QUIZ;
    
    setEngagementType(randomEngagement);
    setCurrentStep(Step.ENGAGEMENT);
    
    toast.success(`Authentication successful via ${method}`);
  };
  
  const handleEngagementComplete = (data?: any) => {
    if (data) {
      setUserData({...userData, engagementData: data});
    }
    
    setCurrentStep(Step.SUCCESS);
    toast.success("Access granted!");
    
    // In a real implementation, this would call the OPNsense API to grant access
    console.log("Access granted with user data:", userData);
  };
  
  const handleContinue = () => {
    // In a real implementation, this would redirect to the requested URL
    window.location.href = "https://www.google.com";
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
          <AccessGranted onContinue={handleContinue} />
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
