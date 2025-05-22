
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className, variant = 'light' }) => {
  const textColor = variant === 'light' ? 'text-white' : 'text-primary';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-8 h-8 flex items-center justify-center">
        {/* Modern WiFi Icon */}
        <div className="relative">
          <span className={`absolute w-6 h-6 border-t-2 border-l-2 border-r-2 ${variant === 'light' ? 'border-white' : 'border-primary'} rounded-tl-full rounded-tr-full transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2`}></span>
          <span className={`absolute w-4 h-4 border-t-2 border-l-2 border-r-2 ${variant === 'light' ? 'border-white' : 'border-primary'} rounded-tl-full rounded-tr-full transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2`}></span>
          <span className={`absolute w-2 h-2 ${variant === 'light' ? 'bg-white' : 'bg-primary'} rounded-full transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2`}></span>
        </div>
      </div>
      <span className={`font-bold text-xl uppercase tracking-wider ${textColor}`}>WIFI Senegal</span>
    </div>
  );
};

export default Logo;
