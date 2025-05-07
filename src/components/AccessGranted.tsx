
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wifi, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface AccessGrantedProps {
  duration?: number; // Duration in minutes
  downloadSpeed?: string;
  uploadSpeed?: string;
  onContinue?: () => void;
}

const AccessGranted: React.FC<AccessGrantedProps> = ({ 
  duration = 30, // Default 30 minutes
  downloadSpeed = "10 Mbps",
  uploadSpeed = "5 Mbps",
  onContinue 
}) => {
  const [countdown, setCountdown] = useState(5);
  const [sessionTime, setSessionTime] = useState(duration * 60); // Convert to seconds
  const [sessionActive, setSessionActive] = useState(true);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Redirect countdown
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
  
  // Session time countdown
  useEffect(() => {
    if (!sessionActive) return;
    
    const sessionTimer = setInterval(() => {
      setSessionTime((prev) => {
        if (prev <= 1) {
          clearInterval(sessionTimer);
          setSessionActive(false);
          toast.warning("Your WiFi session has expired!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(sessionTimer);
  }, [sessionActive]);

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
            <div className="font-medium mt-1">{duration} minutes</div>
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
        
        <div className="py-2 px-3 bg-primary/10 rounded-lg flex items-center justify-center">
          <Clock className="mr-2 h-5 w-5 text-primary" />
          <span className="font-semibold">Time remaining: {formatTime(sessionTime)}</span>
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
