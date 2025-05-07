
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Award, Timer, Brain, Trophy } from "lucide-react";
import { MiniGameData, GameType, UserData } from "./types";
import MemoryGame from "./games/MemoryGame";
import QuizGame from "./games/QuizGame";
import PuzzleGame from "./games/PuzzleGame";
import TapGame from "./games/TapGame";

interface MiniGamesHubProps {
  userData: UserData;
  onBack: () => void;
  onGameComplete: (gameData: MiniGameData, score: number) => void;
}

const MiniGamesHub = ({ userData, onBack, onGameComplete }: MiniGamesHubProps) => {
  const [selectedGame, setSelectedGame] = useState<MiniGameData | null>(null);
  const [activeTab, setActiveTab] = useState("available");

  // Sample games - in a real implementation, these would come from the database
  const availableGames: MiniGameData[] = [
    {
      id: "memory-game",
      name: "Jeu de Mémoire",
      type: GameType.MEMORY,
      description: "Retrouvez les paires de cartes identiques",
      rewardMinutes: 10,
      rewardPoints: 25
    },
    {
      id: "quiz-game",
      name: "Quiz de Culture Générale",
      type: GameType.QUIZ,
      description: "Testez vos connaissances générales",
      rewardMinutes: 15,
      rewardPoints: 35
    },
    {
      id: "puzzle-game",
      name: "Puzzle Glissant",
      type: GameType.PUZZLE,
      description: "Reconstituez l'image en déplaçant les pièces",
      rewardMinutes: 20,
      rewardPoints: 40
    },
    {
      id: "tap-game",
      name: "Tap Challenge",
      type: GameType.TAP,
      description: "Tapez sur les étoiles le plus vite possible",
      rewardMinutes: 5,
      rewardPoints: 15
    }
  ];

  const handleStartGame = (game: MiniGameData) => {
    setSelectedGame(game);
  };

  const handleCompleteGame = (score: number) => {
    if (selectedGame) {
      onGameComplete(selectedGame, score);
      setSelectedGame(null);
    }
  };

  const handleCancelGame = () => {
    setSelectedGame(null);
  };

  const renderGame = () => {
    if (!selectedGame) return null;

    switch (selectedGame.type) {
      case GameType.MEMORY:
        return <MemoryGame onComplete={handleCompleteGame} onCancel={handleCancelGame} />;
      case GameType.QUIZ:
        return <QuizGame onComplete={handleCompleteGame} onCancel={handleCancelGame} />;
      case GameType.PUZZLE:
        return <PuzzleGame onComplete={handleCompleteGame} onCancel={handleCancelGame} />;
      case GameType.TAP:
        return <TapGame onComplete={handleCompleteGame} onCancel={handleCancelGame} />;
      default:
        return null;
    }
  };

  if (selectedGame) {
    return (
      <Card className="w-full max-w-2xl mx-auto glass-card animate-fade-in">
        <CardHeader className="relative">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-2 top-2"
            onClick={handleCancelGame}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <CardTitle className="text-2xl font-bold text-center mt-4">
            {selectedGame.name}
          </CardTitle>
          <CardDescription className="text-center">
            {selectedGame.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderGame()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto glass-card animate-fade-in">
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-2 top-2"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <CardTitle className="text-2xl font-bold text-center mt-4">
          <Trophy className="h-6 w-6 inline-block mr-2" /> 
          Centre de Jeux
        </CardTitle>
        <CardDescription className="text-center">
          Jouez à des jeux et gagnez du temps WiFi et des points
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="text-sm font-medium">Vos points</p>
            <p className="text-2xl font-bold text-primary">{userData.points || 0}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Temps WiFi</p>
            <p className="text-2xl font-bold text-primary">{userData.timeRemainingMinutes || 0} min</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Jeux Disponibles</TabsTrigger>
            <TabsTrigger value="rewards">Récompenses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="available">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {availableGames.map(game => (
                <Card key={game.id} className="overflow-hidden hover:border-primary transition-all">
                  <CardContent className="p-0">
                    <div className="p-4 space-y-2">
                      <h3 className="font-medium flex items-center">
                        {game.type === GameType.MEMORY && <Brain className="h-4 w-4 mr-2 text-primary" />}
                        {game.type === GameType.QUIZ && <Award className="h-4 w-4 mr-2 text-primary" />}
                        {game.type === GameType.PUZZLE && <Trophy className="h-4 w-4 mr-2 text-primary" />}
                        {game.type === GameType.TAP && <Timer className="h-4 w-4 mr-2 text-primary" />}
                        {game.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{game.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span className="flex items-center">
                          <Timer className="h-3 w-3 mr-1" /> {game.rewardMinutes} minutes
                        </span>
                        <span className="flex items-center">
                          <Award className="h-3 w-3 mr-1" /> {game.rewardPoints} points
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t p-3 bg-background/50">
                      <Button 
                        className="w-full" 
                        onClick={() => handleStartGame(game)}
                      >
                        Jouer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="rewards">
            <div className="p-4 space-y-4">
              <h3 className="font-medium">Comment gagner des récompenses</h3>
              <p className="text-sm text-muted-foreground">
                Jouez à nos mini-jeux pour gagner du temps WiFi supplémentaire et des points de fidélité. 
                Plus vous jouez, plus vous gagnez!
              </p>
              
              <div className="space-y-3 mt-4">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <h4 className="font-medium">Jeu de Mémoire</h4>
                  <p className="text-sm text-muted-foreground">
                    Gagnez jusqu'à 10 minutes et 25 points en retrouvant toutes les paires de cartes
                  </p>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-lg">
                  <h4 className="font-medium">Quiz de Culture Générale</h4>
                  <p className="text-sm text-muted-foreground">
                    Gagnez jusqu'à 15 minutes et 35 points en répondant correctement aux questions
                  </p>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-lg">
                  <h4 className="font-medium">Puzzle Glissant</h4>
                  <p className="text-sm text-muted-foreground">
                    Gagnez jusqu'à 20 minutes et 40 points en complétant le puzzle
                  </p>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-lg">
                  <h4 className="font-medium">Tap Challenge</h4>
                  <p className="text-sm text-muted-foreground">
                    Gagnez jusqu'à 5 minutes et 15 points en tapant sur les étoiles
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MiniGamesHub;
