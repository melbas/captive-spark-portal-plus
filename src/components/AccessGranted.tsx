
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wifi } from 'lucide-react';

interface AccessGrantedProps {
  duration?: string;
  downloadSpeed?: string;
  uploadSpeed?: string;
  onContinue?: () => void;
}

const AccessGranted: React.FC<AccessGrantedProps> = ({ 
  duration = "2 hours", 
  downloadSpeed = "10 Mbps",
  uploadSpeed = "5 Mbps",
  onContinue 
}) => {
  const [countdown, setCountdown] = useState(5);
  
  // Simulate auto-redirect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onContinue) setTimeout(onContinue, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [onContinue]);

  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in text-center">
      <CardHeader className="pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Wifi className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl font-bold">Access Granted!</CardTitle>
        <CardDescription>
          You're connected to SparkWiFi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Duration</div>
            <div className="font-medium mt-1">{duration}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Download</div>
            <div className="font-medium mt-1">{downloadSpeed}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Upload</div>
            <div className="font-medium mt-1">{uploadSpeed}</div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Redirecting to the internet in {countdown} seconds...
        </p>
        
        <Button 
          onClick={onContinue} 
          className="w-full"
        >
          Continue to Internet <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default AccessGranted;
