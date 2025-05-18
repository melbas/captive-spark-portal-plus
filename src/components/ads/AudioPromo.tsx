
import React, { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

export interface AudioPromoProps {
  audioUrl: string;
  title: string;
  subtitle?: string;
  coverImage?: string;
  autoPlay?: boolean;
  language?: string;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

const AudioPromo: React.FC<AudioPromoProps> = ({
  audioUrl,
  title,
  subtitle,
  coverImage,
  autoPlay = false,
  language,
  className,
  onPlay,
  onPause,
  onEnd
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { language: currentLanguage } = useLanguage();
  
  // If language is specified and doesn't match current language, don't show
  if (language && language !== currentLanguage && language !== 'all') {
    return null;
  }
  
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (onPause) onPause();
      } else {
        audioRef.current.play();
        if (onPlay) onPlay();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  const handleEnd = () => {
    setIsPlaying(false);
    setProgress(0);
    if (onEnd) onEnd();
  };
  
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const { currentTime, duration } = audioRef.current;
      setProgress((currentTime / duration) * 100);
    }
  };
  
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Cover image or play button */}
          <div className="relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted">
            {coverImage ? (
              <img src={coverImage} alt={title} className="object-cover w-full h-full" />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-primary/10">
                <Play className="h-6 w-6 text-primary" />
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute inset-0 bg-transparent hover:bg-black/10 rounded-md"
              onClick={togglePlay}
            >
              {isPlaying ? 
                <Pause className="h-4 w-4" /> : 
                <Play className="h-4 w-4" />
              }
            </Button>
          </div>
          
          {/* Audio info */}
          <div className="flex-1">
            <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>}
            <div className="mt-2">
              <Progress value={progress} className="h-1" />
            </div>
          </div>
          
          {/* Mute button */}
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={toggleMute}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
        
        <audio
          ref={audioRef}
          src={audioUrl}
          autoPlay={autoPlay}
          hidden
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnd}
        />
      </CardContent>
    </Card>
  );
};

export default AudioPromo;
