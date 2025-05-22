
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Award, Timer, Brain, Trophy, Gamepad2, Lightbulb, Zap } from "lucide-react";
import { MiniGameData, GameType, UserData } from "./types";
import { GameCategory, GAME_CATEGORIES, getGameCategory } from "./types/game-categories";
import { analyticsService } from "@/services/analytics-service";
import { Badge } from "@/components/ui/badge";
import MemoryGame from "./games/MemoryGame";
import QuizGame from "./games/QuizGame";
import PuzzleGame from "./games/PuzzleGame";
import TapGame from "./games/TapGame";
import ErrorBoundary from "@/components/ErrorBoundary";

interface MiniGamesHubProps {
  userData: UserData;
  onBack: () => void;
  onGameComplete: (gameData: MiniGameData, score: number) => void;
}

const MiniGamesHub = ({ userData, onBack, onGameComplete }: MiniGamesHubProps) => {
  const [selectedGame, setSelectedGame] = useState<MiniGameData | null>(null);
  const [activeTab, setActiveTab] = useState("available");
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");

  // Sample games - in a real implementation, these would come from the database
  const availableGames: MiniGameData[] = [
    {
      id: "memory-game",
      name: "Jeu de Mémoire",
      type: GameType.MEMORY,
      description: "Retrouvez les paires de cartes identiques",
      rewardMinutes: 10,
      rewardPoints: 25,
      category: GameCategory.COGNITIVE
    },
    {
      id: "quiz-game",
      name: "Quiz de Culture Générale",
      type: GameType.QUIZ,
      description: "Testez vos connaissances générales",
      rewardMinutes: 15,
      rewardPoints: 35,
      category: GameCategory.EDUCATIONAL
    },
    {
      id: "puzzle-game",
      name: "Puzzle Glissant",
      type: GameType.PUZZLE,
      description: "Reconstituez l'image en déplaçant les pièces",
      rewardMinutes: 20,
      rewardPoints: 40,
      category: GameCategory.COGNITIVE
    },
    {
      id: "tap-game",
      name: "Tap Challenge",
      type: GameType.TAP,
      description: "Tapez sur les étoiles le plus vite possible",
      rewardMinutes: 5,
      rewardPoints: 15,
      category: GameCategory.CHALLENGE
    }
  ];

  const handleStartGame = (game: MiniGameData) => {
    analyticsService.startGameSession(game.id);
    setSelectedGame(game);
  };

  const handleCompleteGame = (score: number) => {
    if (selectedGame) {
      // Calculer la durée de la session
      const timeSpent = analyticsService.getSessionDuration(selectedGame.id);
      
      // Tracker l'événement de jeu
      analyticsService.trackGameEvent({
        gameId: selectedGame.id,
        gameType: selectedGame.type,
        gameCategory: selectedGame.category || getGameCategory(selectedGame.type),
        score,
        timeSpentSeconds: timeSpent,
        completionStatus: 'completed',
        userId: userData.id
      });
      
      onGameComplete(selectedGame, score);
      setSelectedGame(null);
    }
  };

  const handleCancelGame = () => {
    if (selectedGame) {
      // Tracker l'abandon du jeu
      const timeSpent = analyticsService.getSessionDuration(selectedGame.id);
      
      analyticsService.trackGameEvent({
        gameId: selectedGame.id,
        gameType: selectedGame.type,
        gameCategory: selectedGame.category || getGameCategory(selectedGame.type),
        score: 0,
        timeSpentSeconds: timeSpent,
        completionStatus: 'abandoned',
        userId: userData.id
      });
    }
    
    setSelectedGame(null);
  };

  const renderGame = () => {
    if (!selectedGame) return null;

    return (
      <ErrorBoundary>
        {(() => {
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
              return <div>Jeu non disponible</div>;
          }
        })()}
      </ErrorBoundary>
    );
  };

  // Filtrer les jeux par catégorie
  const filteredGames = selectedCategory === "all" 
    ? availableGames 
    : availableGames.filter(game => game.category === selectedCategory);

  // Rendu d'une icône basée sur la catégorie de jeu
  const renderCategoryIcon = (category?: GameCategory) => {
    if (!category) return <Gamepad2 className="h-4 w-4 mr-2 text-primary" />;
    
    switch (category) {
      case GameCategory.EDUCATIONAL:
        return <Brain className="h-4 w-4 mr-2 text-blue-500" />;
      case GameCategory.ENTERTAINMENT:
        return <Gamepad2 className="h-4 w-4 mr-2 text-purple-500" />;
      case GameCategory.COGNITIVE:
        return <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />;
      case GameCategory.CHALLENGE:
        return <Zap className="h-4 w-4 mr-2 text-green-500" />;
      default:
        return <Trophy className="h-4 w-4 mr-2 text-primary" />;
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
            <div className="flex flex-wrap gap-2 mb-4">
              <Button 
                variant={selectedCategory === "all" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setSelectedCategory("all")}
              >
                Tous
              </Button>
              
              {GAME_CATEGORIES.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center"
                >
                  {renderCategoryIcon(category.id)}
                  {category.name}
                </Button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {filteredGames.map(game => (
                <Card key={game.id} className="overflow-hidden hover:border-primary transition-all">
                  <CardContent className="p-0">
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center">
                          {renderCategoryIcon(game.category)}
                          {game.name}
                        </h3>
                        
                        <Badge variant="outline" className="text-xs">
                          {GAME_CATEGORIES.find(c => c.id === game.category)?.name || "Jeu"}
                        </Badge>
                      </div>
                      
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
                {GAME_CATEGORIES.map(category => (
                  <div key={category.id} className={`bg-muted/30 p-3 rounded-lg border-l-4 border-${category.color}-500`}>
                    <div className="flex items-center">
                      {renderCategoryIcon(category.id)}
                      <h4 className="font-medium">{category.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MiniGamesHub;
