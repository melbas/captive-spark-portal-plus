
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Play, Check } from 'lucide-react';

interface VideoForWifiProps {
  onComplete: () => void;
  videoUrl?: string;
}

const VideoForWifi: React.FC<VideoForWifiProps> = ({ 
  onComplete, 
  videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4" // Default demo video
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percentage = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percentage);
      
      // Mark as completed when video is 80% watched
      if (percentage > 80 && !completed) {
        setCompleted(true);
        toast.success("Video watched! You can now connect to WiFi");
      }
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (!completed) {
      setCompleted(true);
      toast.success("Video complete! You can now connect to WiFi");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Watch & Connect</CardTitle>
        <CardDescription className="text-center">
          Watch this short video to get free WiFi access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-full w-16 h-16 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handlePlayClick}
              >
                <Play className="h-8 w-8" />
              </Button>
            </div>
          )}
          <video 
            ref={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnd}
            className="w-full h-full"
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        
        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
          <div 
            className="bg-primary h-full transition-all" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          disabled={!completed}
          onClick={onComplete}
        >
          {completed ? (
            <>Connect to WiFi <Check className="ml-2 h-4 w-4" /></>
          ) : (
            "Watch video to continue"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VideoForWifi;
