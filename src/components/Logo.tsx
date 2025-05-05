
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-8 h-8 overflow-hidden">
        <div className="absolute inset-0 bg-primary rounded-lg rotate-45 transform origin-center"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-white dark:bg-background rounded-full"></div>
        </div>
        <div className="absolute top-1/2 left-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 border-2 border-white dark:border-background rounded-full"></div>
      </div>
      <span className="font-bold text-xl text-foreground">SparkWiFi</span>
    </div>
  );
};

export default Logo;
