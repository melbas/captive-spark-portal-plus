
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MemoryGameProps {
  onComplete: (score: number) => void;
  onCancel: () => void;
}

interface MemoryCard {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
}

type Difficulty = "easy" | "medium" | "hard";

const MemoryGame: React.FC<MemoryGameProps> = ({ onComplete, onCancel }) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [showDifficultySelection, setShowDifficultySelection] = useState<boolean>(true);
  
  // Get total pairs based on difficulty
  const getTotalPairs = (): number => {
    switch (difficulty) {
      case "easy": return 6;
      case "hard": return 12;
      default: return 8; // medium
    }
  };
  
  const totalPairs = getTotalPairs();
  
  // Initialize game after difficulty selection
  const startGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setShowDifficultySelection(false);
    initGame(selectedDifficulty);
  };
  
  // Initialize the game based on selected difficulty
  const initGame = (selectedDifficulty: Difficulty = difficulty) => {
    // Create card pairs based on difficulty
    const pairs = selectedDifficulty === "easy" ? 6 : 
                 selectedDifficulty === "hard" ? 12 : 8;
    
    // Pool of card values - add more for higher difficulties
    const allCardValues = ["🍎", "🍌", "🍇", "🍊", "🍓", "🍉", "🍒", "🥝", 
                         "🥭", "🍍", "🍑", "🍋", "🍈", "🍏", "🥥", "🫐"];
    
    // Select only the number of values needed for current difficulty
    const cardValues = allCardValues.slice(0, pairs);
    
    let cards: MemoryCard[] = [];
    
    // Create pairs
    cardValues.forEach((value, index) => {
      cards.push({ id: index * 2, value, flipped: false, matched: false });
      cards.push({ id: index * 2 + 1, value, flipped: false, matched: false });
    });
    
    // Shuffle cards
    cards = shuffleArray(cards);
    setCards(cards);
    setMatchedPairs(0);
    setMoves(0);
    setTimer(0);
    setGameOver(false);
    setFlippedCards([]);
    setGameStarted(false);
  };
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (gameStarted && !gameOver) {
      interval = setInterval(() => {
        setTimer(prevTime => prevTime + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted, gameOver]);
  
  // Check for game completion
  useEffect(() => {
    if (matchedPairs === totalPairs && gameStarted) {
      setGameOver(true);
      // Calculate score based on moves and time, adjusted by difficulty
      const baseScore = difficulty === "easy" ? 60 : 
                      difficulty === "medium" ? 100 : 150;
      
      const movesPenalty = moves > totalPairs * 2 ? (moves - totalPairs * 2) * 2 : 0;
      const timePenalty = timer > totalPairs * 5 ? (timer - totalPairs * 5) : 0;
      const finalScore = Math.max(10, baseScore - movesPenalty - timePenalty);
      
      // Delay to show the completed board before ending
      setTimeout(() => {
        toast.success("Félicitations! Vous avez trouvé toutes les paires!");
        onComplete(finalScore);
      }, 1000);
    }
  }, [matchedPairs, totalPairs, gameStarted, moves, timer, onComplete, difficulty]);
  
  const shuffleArray = (array: MemoryCard[]): MemoryCard[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  const handleCardClick = (cardId: number) => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    
    // Ignore click if game is over or card is already flipped/matched
    if (gameOver || 
        flippedCards.length >= 2 || 
        flippedCards.includes(cardId) || 
        cards.find(card => card.id === cardId)?.matched) {
      return;
    }
    
    // Flip the card
    setCards(prevCards => 
      prevCards.map(card => 
        card.id === cardId ? { ...card, flipped: true } : card
      )
    );
    
    // Add card to flipped cards
    setFlippedCards(prev => [...prev, cardId]);
    
    // If this is the second card flipped
    if (flippedCards.length === 1) {
      setMoves(prevMoves => prevMoves + 1);
      
      const firstCardId = flippedCards[0];
      const firstCard = cards.find(card => card.id === firstCardId);
      const secondCard = cards.find(card => card.id === cardId);
      
      // Check for match
      if (firstCard && secondCard && firstCard.value === secondCard.value) {
        // Cards match
        setTimeout(() => {
          setMatchedPairs(prevPairs => prevPairs + 1);
          setCards(prevCards => 
            prevCards.map(card => 
              (card.id === firstCardId || card.id === cardId) 
                ? { ...card, matched: true } 
                : card
            )
          );
          setFlippedCards([]);
        }, 500);
      } else {
        // Cards don't match, flip them back
        setTimeout(() => {
          setCards(prevCards => 
            prevCards.map(card => 
              (card.id === firstCardId || card.id === cardId) 
                ? { ...card, flipped: false } 
                : card
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };
  
  const restartGame = () => {
    setShowDifficultySelection(true);
    setGameStarted(false);
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Render difficulty selection
  if (showDifficultySelection) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-medium text-center">Choisissez la difficulté</h2>
        <div className="grid grid-cols-3 gap-3">
          <Button 
            variant="outline"
            onClick={() => startGame("easy")}
            className="flex flex-col items-center p-4 h-auto"
          >
            <span className="text-lg mb-2">🟢</span>
            <span className="font-medium">Facile</span>
            <span className="text-xs text-muted-foreground mt-1">6 paires</span>
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => startGame("medium")}
            className="flex flex-col items-center p-4 h-auto border-primary"
          >
            <span className="text-lg mb-2">🟠</span>
            <span className="font-medium">Moyen</span>
            <span className="text-xs text-muted-foreground mt-1">8 paires</span>
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => startGame("hard")}
            className="flex flex-col items-center p-4 h-auto"
          >
            <span className="text-lg mb-2">🔴</span>
            <span className="font-medium">Difficile</span>
            <span className="text-xs text-muted-foreground mt-1">12 paires</span>
          </Button>
        </div>
        
        <Button variant="outline" onClick={onCancel} className="w-full">
          Quitter
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-medium">
          Paires: {matchedPairs}/{totalPairs}
        </div>
        <div className="text-sm font-medium">
          Mouvements: {moves}
        </div>
        <div className="text-sm font-medium">
          Temps: {formatTime(timer)}
        </div>
      </div>
      
      <div className={`grid ${difficulty === "easy" ? 'grid-cols-3' : difficulty === "hard" ? 'grid-cols-6' : 'grid-cols-4'} gap-2`}>
        {cards.map(card => (
          <div 
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`aspect-square flex items-center justify-center text-2xl cursor-pointer rounded-md transition-all transform 
              ${card.flipped || card.matched ? 'bg-primary/10 rotate-0' : 'bg-primary rotate-y-180'} 
              ${card.matched ? 'bg-green-100 dark:bg-green-900/30' : ''}
              hover:scale-105`}
          >
            {(card.flipped || card.matched) && card.value}
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={restartGame}>
          Changer de difficulté
        </Button>
        
        <Button variant="outline" onClick={onCancel}>
          Quitter
        </Button>
      </div>
    </div>
  );
};

export default MemoryGame;
