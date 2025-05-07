
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TapGameProps {
  onComplete: (score: number) => void;
  onCancel: () => void;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  tapped: boolean;
}

const TapGame: React.FC<TapGameProps> = ({ onComplete, onCancel }) => {
  const [stars, setStars] = useState<Star[]>([]);
  const [score, setScore] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(30); // 30 seconds game
  const [gameWidth, setGameWidth] = useState<number>(300);
  const [gameHeight, setGameHeight] = useState<number>(400);
  
  // Initialize game area size
  useEffect(() => {
    const updateGameSize = () => {
      const container = document.getElementById('tap-game-container');
      if (container) {
        setGameWidth(container.clientWidth);
        setGameHeight(Math.min(500, window.innerHeight * 0.6));
      }
    };
    
    updateGameSize();
    window.addEventListener('resize', updateGameSize);
    
    return () => {
      window.removeEventListener('resize', updateGameSize);
    };
  }, []);
  
  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (gameStarted && !gameOver && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTime => prevTime - 1);
      }, 1000);
    } else if (timer === 0 && !gameOver && gameStarted) {
      setGameOver(true);
      
      const finalScore = score;
      
      setTimeout(() => {
        toast.success(`Temps écoulé! Score final: ${finalScore}`);
        onComplete(finalScore);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer, gameStarted, gameOver, score, onComplete]);
  
  // Star generation
  const generateStars = useCallback(() => {
    if (!gameStarted || gameOver) return;
    
    const newStar = {
      id: Date.now(),
      x: Math.random() * (gameWidth - 40),
      y: -50,
      size: 20 + Math.random() * 20,
      speed: 1 + Math.random() * 3,
      tapped: false
    };
    
    setStars(prevStars => [...prevStars, newStar]);
  }, [gameStarted, gameOver, gameWidth]);
  
  useEffect(() => {
    let starInterval: NodeJS.Timeout;
    let animationFrameId: number;
    let lastTime = 0;
    
    if (gameStarted && !gameOver) {
      // Generate new stars periodically
      starInterval = setInterval(generateStars, 1000);
      
      // Animation loop for moving stars
      const updateStars = (timestamp: number) => {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        
        setStars(prevStars => {
          // Update positions of existing stars
          const updatedStars = prevStars.map(star => {
            if (star.tapped) return star;
            return {
              ...star,
              y: star.y + star.speed * (deltaTime / 16)
            };
          });
          
          // Remove stars that have gone off screen
          return updatedStars.filter(star => star.y < gameHeight + 50);
        });
        
        if (gameStarted && !gameOver) {
          animationFrameId = requestAnimationFrame(updateStars);
        }
      };
      
      animationFrameId = requestAnimationFrame(updateStars);
    }
    
    return () => {
      clearInterval(starInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameStarted, gameOver, generateStars, gameHeight]);
  
  const handleTapStar = (starId: number) => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    
    if (gameOver) return;
    
    setStars(prevStars => 
      prevStars.map(star => 
        star.id === starId ? { ...star, tapped: true } : star
      )
    );
    
    setScore(prevScore => prevScore + 1);
  };
  
  const startGame = () => {
    setStars([]);
    setScore(0);
    setTimer(30);
    setGameOver(false);
    setGameStarted(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold">
          Score: {score}
        </div>
        <div className={`text-lg font-bold ${timer <= 5 ? 'text-red-500' : ''}`}>
          Temps: {timer}s
        </div>
      </div>
      
      <div 
        id="tap-game-container"
        className="relative bg-muted/20 rounded-lg overflow-hidden"
        style={{ height: `${gameHeight}px` }}
      >
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <p className="text-lg font-medium mb-4">Tapez sur les étoiles avant qu'elles ne disparaissent!</p>
            <Button onClick={startGame}>Commencer</Button>
          </div>
        )}
        
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center flex-col bg-black/50">
            <p className="text-2xl font-bold text-white mb-2">Score final: {score}</p>
            <Button onClick={startGame} className="mt-4">Rejouer</Button>
          </div>
        )}
        
        {stars.map(star => (
          <div 
            key={star.id}
            onClick={() => !star.tapped && handleTapStar(star.id)}
            className={`absolute transition-opacity ${star.tapped ? 'opacity-0' : 'opacity-100 cursor-pointer'}`}
            style={{
              left: `${star.x}px`,
              top: `${star.y}px`,
              width: `${star.size}px`,
              height: `${star.size}px`,
            }}
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className={`w-full h-full text-yellow-400`}
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-4">
        {gameStarted && !gameOver ? (
          <Button variant="outline" disabled>
            Partie en cours...
          </Button>
        ) : (
          <Button variant="outline" onClick={startGame}>
            {gameOver ? 'Rejouer' : 'Commencer'}
          </Button>
        )}
        
        <Button variant="outline" onClick={onCancel}>
          Quitter
        </Button>
      </div>
    </div>
  );
};

export default TapGame;
