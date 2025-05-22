
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

export interface AdSlide {
  id: string;
  imageUrl: string;
  fallbackUrl?: string;
  title?: string | {
    en: string;
    fr: string;
    es?: string;
  };
  description?: string | {
    en: string;
    fr: string;
    es?: string;
  };
  link?: string;
  language?: string;
}

interface AdCarouselProps {
  slides: AdSlide[];
  autoRotate?: boolean;
  interval?: number;
  className?: string;
  onSlideChange?: (slideIndex: number) => void;
  onSlideClick?: (slide: AdSlide) => void;
}

const AdCarousel: React.FC<AdCarouselProps> = ({
  slides,
  autoRotate = true,
  interval = 5000,
  className = "",
  onSlideChange,
  onSlideClick
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { language } = useLanguage();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Filter slides by language or show all if no language is specified
  const filteredSlides = slides.filter(slide => 
    !slide.language || slide.language === language || slide.language === 'all'
  );
  
  // Helper to get localized content
  const getLocalizedContent = (content: string | Record<string, string> | undefined): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return content[language as keyof typeof content] || content['en'] || '';
  };
  
  // Handle auto-rotation
  useEffect(() => {
    if (!autoRotate || filteredSlides.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % filteredSlides.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [autoRotate, interval, filteredSlides.length]);
  
  // Handle slide change
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    if (onSlideChange) onSlideChange(index);
  };
  
  const nextSlide = () => goToSlide((currentSlide + 1) % filteredSlides.length);
  const prevSlide = () => goToSlide(currentSlide === 0 ? filteredSlides.length - 1 : currentSlide - 1);
  
  // Handle click on slide
  const handleSlideClick = (slide: AdSlide) => {
    if (onSlideClick) onSlideClick(slide);
    else if (slide.link) window.open(slide.link, '_blank');
  };
  
  // Handle image error avec traçage supplémentaire
  const handleImageError = (slideId: string) => {
    console.log(`Erreur d'image pour la diapositive ${slideId}`);
    setImageErrors(prev => ({ ...prev, [slideId]: true }));
  };
  
  if (filteredSlides.length === 0) return null;
  
  return (
    <Card className={cn("relative overflow-hidden rounded-lg", className)}>
      <div className="relative w-full h-full">
        {/* Slides */}
        <div className="relative w-full overflow-hidden aspect-[16/9]">
          {filteredSlides.map((slide, index) => (
            <div 
              key={slide.id}
              className={cn(
                "absolute top-0 left-0 w-full h-full transition-opacity duration-500",
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onClick={() => handleSlideClick(slide)}
            >
              {imageErrors[slide.id] && slide.fallbackUrl ? (
                <img 
                  src={slide.fallbackUrl} 
                  alt={getLocalizedContent(slide.title) || `Advertisement ${index + 1}`}
                  className="object-cover w-full h-full cursor-pointer" 
                  onError={() => console.log(`L'image de fallback a également échoué pour ${slide.id}`)}
                />
              ) : (
                <img 
                  src={slide.imageUrl} 
                  alt={getLocalizedContent(slide.title) || `Advertisement ${index + 1}`}
                  className="object-contain w-full h-full cursor-pointer"
                  onError={() => handleImageError(slide.id)}
                />
              )}
              
              {(slide.title || slide.description) && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm">
                  {slide.title && (
                    <h3 className="font-medium text-lg">{getLocalizedContent(slide.title)}</h3>
                  )}
                  {slide.description && (
                    <p className="text-sm text-muted-foreground">{getLocalizedContent(slide.description)}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Navigation arrows */}
        {filteredSlides.length > 1 && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/50 hover:bg-background/80 z-20"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/50 hover:bg-background/80 z-20"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {/* Indicators */}
        {filteredSlides.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1 z-20">
            <div className="flex space-x-2 p-2">
              {filteredSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(index);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    index === currentSlide 
                      ? "bg-primary w-4" 
                      : "bg-primary/50 hover:bg-primary/70"
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AdCarousel;
