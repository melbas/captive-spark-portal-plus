
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Trophy, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface LeadCollectionGameProps {
  onComplete: (leadData: LeadData) => void;
  timeReward?: number; // Time in minutes
}

interface LeadData {
  name: string;
  email: string;
  phone?: string;
  score: number;
}

const LeadCollectionGame: React.FC<LeadCollectionGameProps> = ({
  onComplete,
  timeReward = 15 // Default 15 minutes
}) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds game
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  
  const form = useForm<{ name: string; email: string; phone: string }>();
  
  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setTimeLeft(30);
    moveTarget();
    
    // Start the timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const moveTarget = () => {
    const x = Math.floor(Math.random() * 80) + 10; // 10-90%
    const y = Math.floor(Math.random() * 70) + 10; // 10-80%
    setTargetPosition({ x, y });
  };
  
  const hitTarget = () => {
    setScore(prev => prev + 1);
    moveTarget();
    // Visual feedback
    toast.success("+1 Point!");
  };
  
  const endGame = () => {
    setGameStarted(false);
    setGameCompleted(true);
    toast.success(`Game over! Your score: ${score} points`);
  };
  
  const handleSubmit = form.handleSubmit((data) => {
    const leadData: LeadData = {
      ...data,
      score
    };
    
    onComplete(leadData);
    toast.success(`Thanks for playing! You earned ${timeReward} minutes of WiFi time`);
  });
  
  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span>Play & Earn WiFi Time</span>
          </div>
        </CardTitle>
        <CardDescription className="text-center">
          Play this quick game and earn {timeReward} minutes of WiFi access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!gameStarted && !gameCompleted && (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Tap the star as many times as you can in 30 seconds!
            </p>
            <Button onClick={startGame} className="w-full">
              Start Game
            </Button>
          </div>
        )}
        
        {gameStarted && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <div className="font-medium">Score: {score}</div>
              <div className="text-primary font-medium">Time: {timeLeft}s</div>
            </div>
            
            <div className="relative h-64 bg-secondary/30 rounded-lg border border-border">
              <Button
                variant="ghost"
                className="absolute p-0 w-12 h-12 flex items-center justify-center text-amber-500 hover:text-amber-600 hover:bg-amber-100/20"
                style={{
                  left: `${targetPosition.x}%`,
                  top: `${targetPosition.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={hitTarget}
              >
                <Star className="h-8 w-8" />
              </Button>
            </div>
          </div>
        )}
        
        {gameCompleted && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">Your Score: {score}</div>
              <p className="text-muted-foreground">
                Great job! Fill out the form below to claim your {timeReward} minutes of WiFi time.
              </p>
            </div>
            
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Your email" {...field} required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Your phone number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full">
                  Claim WiFi Time
                </Button>
              </form>
            </Form>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadCollectionGame;
