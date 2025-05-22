
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { statisticsService, GameStatistic } from "@/services/wifi/statistics-service";
import { GAME_CATEGORIES, GameCategory } from "../types/game-categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Award, User, Clock, Target } from "lucide-react";

interface GameAnalyticsProps {
  dateRange: string;
}

const GameAnalytics: React.FC<GameAnalyticsProps> = ({ dateRange }) => {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const [selectedView, setSelectedView] = useState<string>("overview");
  const [gameStats, setGameStats] = useState<GameStatistic[]>([]);
  const [userSegmentStats, setUserSegmentStats] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);

  // Chargement simulé des données
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const stats = await statisticsService.getGameStatistics(
          selectedCategory !== "all" ? selectedCategory : undefined
        );
        setGameStats(stats);
        
        const segmentStats = await statisticsService.getUserSegmentStatistics();
        setUserSegmentStats(segmentStats);
      } catch (error) {
        console.error("Error loading game analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCategory, dateRange]);
  
  // Données pour les graphiques
  const categoryData = Object.values(GameCategory).map(category => {
    const categoryGames = gameStats.filter(game => game.game_category === category);
    const totalSessions = categoryGames.reduce((sum, game) => sum + game.sessions_count, 0);
    const avgScore = categoryGames.length 
      ? categoryGames.reduce((sum, game) => sum + game.average_score, 0) / categoryGames.length 
      : 0;
    const avgDuration = categoryGames.length 
      ? categoryGames.reduce((sum, game) => sum + game.average_duration_seconds, 0) / categoryGames.length 
      : 0;
    
    return {
      category,
      name: GAME_CATEGORIES.find(c => c.id === category)?.name || category,
      sessions: totalSessions,
      avgScore: Math.round(avgScore),
      avgDuration: Math.round(avgDuration / 60), // Convertir en minutes
      completionRate: categoryGames.length 
        ? categoryGames.reduce((sum, game) => sum + game.completion_rate, 0) / categoryGames.length 
        : 0
    };
  });
  
  // Couleurs pour les graphiques
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  // Tableau de synthèse des statistiques
  const overallEngagement = gameStats.reduce(
    (acc, game) => {
      acc.totalSessions += game.sessions_count;
      acc.totalTime += game.sessions_count * game.average_duration_seconds;
      acc.games += 1;
      return acc;
    },
    { totalSessions: 0, totalTime: 0, games: 0 }
  );
  
  const avgScore = gameStats.length 
    ? gameStats.reduce((sum, game) => sum + game.average_score, 0) / gameStats.length 
    : 0;

  const avgCompletionRate = gameStats.length 
    ? gameStats.reduce((sum, game) => sum + game.completion_rate, 0) / gameStats.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold">Analytique des Jeux</h2>
        
        <div className="flex items-center gap-4">
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as GameCategory | "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {GAME_CATEGORIES.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Gamepad2 className="h-8 w-8 text-primary mb-2" />
            <h3 className="text-2xl font-bold">{overallEngagement.totalSessions}</h3>
            <p className="text-sm text-muted-foreground">Sessions de jeu</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Award className="h-8 w-8 text-primary mb-2" />
            <h3 className="text-2xl font-bold">{Math.round(avgScore)}/100</h3>
            <p className="text-sm text-muted-foreground">Score moyen</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Clock className="h-8 w-8 text-primary mb-2" />
            <h3 className="text-2xl font-bold">{Math.round(overallEngagement.totalTime / 60 / overallEngagement.totalSessions) || 0} min</h3>
            <p className="text-sm text-muted-foreground">Durée moyenne</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Target className="h-8 w-8 text-primary mb-2" />
            <h3 className="text-2xl font-bold">{Math.round(avgCompletionRate * 100)}%</h3>
            <p className="text-sm text-muted-foreground">Taux de complétion</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedView} onValueChange={setSelectedView}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="categories">Par catégorie</TabsTrigger>
          <TabsTrigger value="segments">Par segment</TabsTrigger>
          <TabsTrigger value="games">Par jeu</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des sessions par catégorie</CardTitle>
              <CardDescription>
                Nombre total de sessions de jeu: {overallEngagement.totalSessions}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="sessions"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Score moyen par catégorie</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgScore" name="Score moyen" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Durée moyenne de session (min)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgDuration" name="Durée moyenne (min)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          {GAME_CATEGORIES.map(category => (
            <Card key={category.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    {category.name}
                  </CardTitle>
                  <Badge variant="outline">{categoryData.find(c => c.category === category.id)?.sessions || 0} sessions</Badge>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded">
                    <span className="text-sm text-muted-foreground">Score moyen</span>
                    <span className="text-2xl font-bold">
                      {categoryData.find(c => c.category === category.id)?.avgScore || 0}/100
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded">
                    <span className="text-sm text-muted-foreground">Durée moyenne</span>
                    <span className="text-2xl font-bold">
                      {categoryData.find(c => c.category === category.id)?.avgDuration || 0} min
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded">
                    <span className="text-sm text-muted-foreground">Taux de complétion</span>
                    <span className="text-2xl font-bold">
                      {Math.round((categoryData.find(c => c.category === category.id)?.completionRate || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement par segment utilisateur</CardTitle>
              <CardDescription>Comparaison des métriques entre segments d'utilisateurs</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={userSegmentStats.map(segment => ({
                    ...segment,
                    name: segment.segment_id === 'new_users' ? 'Nouveaux' 
                      : segment.segment_id === 'frequent_users' ? 'Fréquents'
                      : segment.segment_id === 'gamers' ? 'Joueurs'
                      : 'Prospects'
                  }))}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 50, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="average_games_played" 
                    name="Nb jeux par utilisateur" 
                    fill="#8884d8" 
                    radius={[0, 4, 4, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userSegmentStats.map(segment => {
              const segmentId = segment.segment_id;
              const name = segmentId === 'new_users' ? 'Nouveaux utilisateurs' 
                : segmentId === 'frequent_users' ? 'Utilisateurs fréquents'
                : segmentId === 'gamers' ? 'Joueurs assidus'
                : 'Prospects';
              
              return (
                <Card key={segmentId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-base">
                        <User className="h-4 w-4 mr-2" />
                        {name}
                      </CardTitle>
                      <Badge variant="outline">{segment.users_count} utilisateurs</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Durée moyenne de session</span>
                        <span className="font-medium">{segment.average_session_duration} min</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Taux de conversion</span>
                        <span className="font-medium">{Math.round(segment.conversion_rate * 100)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Jeux joués par utilisateur</span>
                        <span className="font-medium">{segment.average_games_played}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="games" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Jeu</th>
                  <th className="text-left py-2">Catégorie</th>
                  <th className="text-right py-2">Sessions</th>
                  <th className="text-right py-2">Score moyen</th>
                  <th className="text-right py-2">Durée moyenne</th>
                  <th className="text-right py-2">Complétion</th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map((game) => (
                  <tr key={game.game_id} className="border-b hover:bg-muted/30">
                    <td className="py-2">
                      {game.game_id === "memory-game" ? "Jeu de Mémoire" 
                        : game.game_id === "quiz-game" ? "Quiz Culture Générale" 
                        : game.game_id === "puzzle-game" ? "Puzzle Glissant" 
                        : "Tap Challenge"}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline" className="font-normal">
                        {GAME_CATEGORIES.find(c => c.id === game.game_category)?.name || "Autre"}
                      </Badge>
                    </td>
                    <td className="text-right py-2">
                      {game.sessions_count}
                    </td>
                    <td className="text-right py-2">
                      {game.average_score}/100
                    </td>
                    <td className="text-right py-2">
                      {Math.round(game.average_duration_seconds / 60)} min
                    </td>
                    <td className="text-right py-2">
                      {Math.round(game.completion_rate * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GameAnalytics;
