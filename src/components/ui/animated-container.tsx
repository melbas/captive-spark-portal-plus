
import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedContainerProps {
  children: ReactNode;
  animation?: 'fade-in' | 'slide-in' | 'scale-in' | 'bounce-in' | 'slide-up' | 'slide-down';
  delay?: number;
  duration?: 'fast' | 'normal' | 'slow';
  className?: string;
  stagger?: boolean;
  staggerDelay?: number;
}

const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  animation = 'fade-in',
  delay = 0,
  duration = 'normal',
  className,
  stagger = false,
  staggerDelay = 100
}) => {
  const durationClasses = {
    fast: 'duration-200',
    normal: 'duration-500',
    slow: 'duration-700'
  };

  const animationClasses = {
    'fade-in': 'animate-fade-in',
    'slide-in': 'animate-slide-in',
    'scale-in': 'animate-scale-in',
    'bounce-in': 'animate-bounce-in',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down'
  };

  if (stagger && React.Children.count(children) > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {React.Children.map(children, (child, index) => (
          <div
            key={index}
            className={cn(
              'opacity-0',
              animationClasses[animation],
              durationClasses[duration]
            )}
            style={{
              animationDelay: `${delay + (index * staggerDelay)}ms`,
              animationFillMode: 'forwards'
            }}
          >
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'opacity-0',
        animationClasses[animation],
        durationClasses[duration],
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards'
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedContainer;
