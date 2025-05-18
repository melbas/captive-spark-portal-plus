
import React, { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

export interface VideoAdProps {
  videoUrl: string;
  title?: string;
  description?: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  language?: string;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

const VideoAd: React.FC<VideoAdProps> = ({
  videoUrl,
  title,
  description,
  poster,
  autoPlay = false,
  muted = true,
  loop = true,
  language,
  className,
  onPlay,
  onPause,
  onEnd
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { language: currentLanguage } = useLanguage();
  
  // If language is specified and doesn't match current language, don't show
  if (language && language !== currentLanguage && language !== 'all') {
    return null;
  }
  
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (onPause) onPause();
      } else {
        videoRef.current.play();
        if (onPlay) onPlay();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  const handleEnd = () => {
    setIsPlaying(false);
    if (onEnd) onEnd();
    
    if (loop && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={poster}
          muted={isMuted}
          autoPlay={autoPlay}
          loop={loop}
          className="w-full h-auto"
          onEnded={handleEnd}
        />
        
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center p-2 bg-background/50 backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <div className="flex-1 px-2">
            {title && <p className="text-sm font-medium truncate">{title}</p>}
            {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
          </div>
          
          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default VideoAd;
