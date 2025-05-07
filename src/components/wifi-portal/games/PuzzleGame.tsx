
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PuzzleGameProps {
  onComplete: (score: number) => void;
  onCancel: () => void;
}

interface PuzzleTile {
  id: number;
  currentPos: number;
  correctPos: number;
  value: string;
}

const PuzzleGame: React.FC<PuzzleGameProps> = ({ onComplete, onCancel }) => {
  const [tiles, setTiles] = useState<PuzzleTile[]>([]);
  const [emptyPos, setEmptyPos] = useState<number>(8); // Position of the empty tile (0-8)
  const [moves, setMoves] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gridSize, setGridSize] = useState<number>(3); // 3x3 grid
  
  // Initialize game
  useEffect(() => {
    initGame();
  }, []);
  
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
  
  // Check for win condition
  useEffect(() => {
    if (tiles.length > 0 && gameStarted) {
      const isWin = tiles.every(tile => tile.currentPos === tile.correctPos);
      
      if (isWin) {
        setGameOver(true);
        // Calculate score based on moves and time
        const baseScore = 100;
        const movesPenalty = Math.max(0, moves - 20) * 1;
        const timePenalty = Math.max(0, timer - 60) * 0.5;
        const finalScore = Math.max(10, Math.round(baseScore - movesPenalty - timePenalty));
        
        setTimeout(() => {
          toast.success("Félicitations! Vous avez complété le puzzle!");
          onComplete(finalScore);
        }, 1000);
      }
    }
  }, [tiles, gameStarted, moves, timer, onComplete]);
  
  const initGame = () => {
    const tileCount = gridSize * gridSize;
    
    // Create ordered tiles
    let newTiles: PuzzleTile[] = [];
    for (let i = 0; i < tileCount - 1; i++) {
      newTiles.push({
        id: i,
        currentPos: i,
        correctPos: i,
        value: (i + 1).toString()
      });
    }
    
    // Shuffle tiles multiple times for better randomization
    let shuffledTiles = [...newTiles];
    let currentEmptyPos = tileCount - 1;
    
    // Make 100 random valid moves to ensure the puzzle is solvable
    for (let i = 0; i < 100; i++) {
      const possibleMoves = getValidMoves(currentEmptyPos);
      if (possibleMoves.length > 0) {
        const randomMoveIndex = Math.floor(Math.random() * possibleMoves.length);
        const tileToMove = possibleMoves[randomMoveIndex];
        
        // Find the tile at this position
        const tileIndex = shuffledTiles.findIndex(t => t.currentPos === tileToMove);
        if (tileIndex !== -1) {
          shuffledTiles[tileIndex].currentPos = currentEmptyPos;
          currentEmptyPos = tileToMove;
        }
      }
    }
    
    setTiles(shuffledTiles);
    setEmptyPos(currentEmptyPos);
    setMoves(0);
    setTimer(0);
    setGameOver(false);
    setGameStarted(false);
  };
  
  const getValidMoves = (emptyPosition: number): number[] => {
    const validMoves = [];
    const row = Math.floor(emptyPosition / gridSize);
    const col = emptyPosition % gridSize;
    
    // Check up
    if (row > 0) {
      validMoves.push(emptyPosition - gridSize);
    }
    
    // Check down
    if (row < gridSize - 1) {
      validMoves.push(emptyPosition + gridSize);
    }
    
    // Check left
    if (col > 0) {
      validMoves.push(emptyPosition - 1);
    }
    
    // Check right
    if (col < gridSize - 1) {
      validMoves.push(emptyPosition + 1);
    }
    
    return validMoves;
  };
  
  const handleTileClick = (tilePos: number) => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    
    if (gameOver) {
      return;
    }
    
    // Check if this is a valid move
    const validMoves = getValidMoves(emptyPos);
    if (validMoves.includes(tilePos)) {
      // Find the tile at this position
      const tileIndex = tiles.findIndex(t => t.currentPos === tilePos);
      
      if (tileIndex !== -1) {
        // Move the tile to the empty position
        const updatedTiles = [...tiles];
        updatedTiles[tileIndex].currentPos = emptyPos;
        
        setTiles(updatedTiles);
        setEmptyPos(tilePos);
        setMoves(moves + 1);
      }
    }
  };
  
  const restartGame = () => {
    initGame();
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Generate the grid of tiles
  const renderGrid = () => {
    const grid = [];
    
    for (let row = 0; row < gridSize; row++) {
      const rowTiles = [];
      for (let col = 0; col < gridSize; col++) {
        const position = row * gridSize + col;
        
        if (position === emptyPos) {
          // Empty tile
          rowTiles.push(
            <div 
              key={position} 
              className="aspect-square bg-muted/20"
            />
          );
        } else {
          // Find the tile at this position
          const tile = tiles.find(t => t.currentPos === position);
          
          if (tile) {
            rowTiles.push(
              <div 
                key={position}
                onClick={() => handleTileClick(position)}
                className={`aspect-square bg-primary/20 flex items-center justify-center 
                  text-2xl font-bold cursor-pointer hover:bg-primary/30 transition-all
                  ${tile.currentPos === tile.correctPos ? 'text-green-600' : ''}`}
              >
                {tile.value}
              </div>
            );
          }
        }
      }
      grid.push(
        <div key={row} className="grid grid-cols-3 gap-1">
          {rowTiles}
        </div>
      );
    }
    
    return grid;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-medium">
          Mouvements: {moves}
        </div>
        <div className="text-sm font-medium">
          Temps: {formatTime(timer)}
        </div>
      </div>
      
      <div className="grid gap-1 max-w-md mx-auto">
        {renderGrid()}
      </div>
      
      <p className="text-sm text-center text-muted-foreground">
        Cliquez sur les tuiles adjacentes à l'espace vide pour les déplacer.
      </p>
      
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={restartGame}>
          Recommencer
        </Button>
        
        <Button variant="outline" onClick={onCancel}>
          Quitter
        </Button>
      </div>
    </div>
  );
};

export default PuzzleGame;
