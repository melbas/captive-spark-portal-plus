
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, Video, Brain, Award, Calendar } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { StatisticsData, DailyStatistics, UserData } from "./types";
import GameAnalytics from "./dashboard/GameAnalytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import { statisticsService } from "@/services/wifi/statistics-service";

interface AdminDashboardProps {
  userData: UserData;
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userData, onBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d"); // 7d, 30d, 90d

  // Mock data - in a real implementation, this would come from the database
  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock daily stats
      const today = new Date();
      const dailyStats: DailyStatistics[] = [];
      
      let daysToGenerate = 7;
      if (dateRange === "30d") daysToGenerate = 30;
      if (dateRange === "90d") daysToGenerate = 90;
      
      for (let i = 0; i < daysToGenerate; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        dailyStats.unshift({
          date: date.toISOString().split('T')[0],
          connections: Math.floor(Math.random() * 50) + 10,
          videoViews: Math.floor(Math.random() * 30) + 5,
          quizCompletions: Math.floor(Math.random() * 20) + 2,
          gamesPlayed: Math.floor(Math.random() * 15) + 1,
          leadsCollected: Math.floor(Math.random() * 10)
        });
      }
      
      // Calculate totals
      const totalConnections = dailyStats.reduce((sum, day) => sum + day.connections, 0);
      const videoViews = dailyStats.reduce((sum, day) => sum + day.videoViews, 0);
      const quizCompletions = dailyStats.reduce((sum, day) => sum + day.quizCompletions, 0);
      const gamesPlayed = dailyStats.reduce((sum, day) => sum + day.gamesPlayed, 0);
      const leadsCollected = dailyStats.reduce((sum, day) => sum + day.leadsCollected, 0);
      
      const stats: StatisticsData = {
        totalConnections,
        videoViews,
        quizCompletions,
        gamesPlayed,
        leadsCollected,
        dailyStats,
        userGrowth: 12.5, // Mock growth percentage
        averageSessionDuration: 18 // Mock average session in minutes
      };
      
      setStatistics(stats);
      setLoading(false);
    };
    
    fetchStatistics();
  }, [dateRange]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const engagementData = statistics ? [
    { name: 'Vidéos', value: statistics.videoViews },
    { name: 'Quiz', value: statistics.quizCompletions },
    { name: 'Jeux', value: statistics.gamesPlayed }
  ] : [];

  if (!userData.isAdmin) {
    return (
      <Card className="w-full max-w-2xl mx-auto glass-card animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle>Accès Refusé</CardTitle>
          <CardDescription>
            Vous n'avez pas les droits d'accès au tableau de bord administrateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={onBack}>Retour</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto glass-card animate-fade-in">
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
          Tableau de Bord Administrateur
        </CardTitle>
        <CardDescription className="text-center">
          Statistiques et gestion du hotspot WiFi
        </CardDescription>
      </CardHeader>
      
      {loading ? (
        <CardContent className="flex justify-center items-center h-64">
          <div className="h-8 w-8 border-t-2 border-primary rounded-full animate-spin"></div>
        </CardContent>
      ) : (
        <>
          <div className="px-6 pb-2">
            <div className="flex justify-end space-x-2">
              <Button 
                variant={dateRange === "7d" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setDateRange("7d")}
              >
                7 jours
              </Button>
              <Button 
                variant={dateRange === "30d" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setDateRange("30d")}
              >
                30 jours
              </Button>
              <Button 
                variant={dateRange === "90d" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setDateRange("90d")}
              >
                90 jours
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="games">Jeux</TabsTrigger>
            </TabsList>
            
            <CardContent className="pt-4">
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Users className="h-8 w-8 text-primary mb-2" />
                      <h3 className="text-2xl font-bold">{statistics?.totalConnections}</h3>
                      <p className="text-sm text-muted-foreground">Connexions</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Video className="h-8 w-8 text-primary mb-2" />
                      <h3 className="text-2xl font-bold">{statistics?.videoViews}</h3>
                      <p className="text-sm text-muted-foreground">Vidéos vues</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Brain className="h-8 w-8 text-primary mb-2" />
                      <h3 className="text-2xl font-bold">{statistics?.quizCompletions}</h3>
                      <p className="text-sm text-muted-foreground">Quiz complétés</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Award className="h-8 w-8 text-primary mb-2" />
                      <h3 className="text-2xl font-bold">{statistics?.leadsCollected}</h3>
                      <p className="text-sm text-muted-foreground">Leads collectés</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Connexions quotidiennes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={statistics?.dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="connections" stroke="#8884d8" name="Connexions" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Croissance utilisateurs</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-primary">+{statistics?.userGrowth}%</p>
                        <p className="text-sm text-muted-foreground mt-2">par rapport à la période précédente</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Durée moyenne de session</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-primary">{statistics?.averageSessionDuration} min</p>
                        <p className="text-sm text-muted-foreground mt-2">temps moyen de connexion</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="engagement" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Distribution des engagements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={engagementData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {engagementData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Tendances des engagements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statistics?.dailyStats.slice(-7)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="videoViews" fill="#8884d8" name="Vidéos" />
                            <Bar dataKey="quizCompletions" fill="#82ca9d" name="Quiz" />
                            <Bar dataKey="gamesPlayed" fill="#ffc658" name="Jeux" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Statistiques d'engagement quotidiennes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Date</th>
                            <th className="text-right py-2">Vidéos</th>
                            <th className="text-right py-2">Quiz</th>
                            <th className="text-right py-2">Jeux</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statistics?.dailyStats.slice(-7).map((day, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2">
                                {new Date(day.date).toLocaleDateString()}
                              </td>
                              <td className="text-right py-2">{day.videoViews}</td>
                              <td className="text-right py-2">{day.quizCompletions}</td>
                              <td className="text-right py-2">{day.gamesPlayed}</td>
                              <td className="text-right py-2 font-medium">
                                {day.videoViews + day.quizCompletions + day.gamesPlayed}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="leads" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Collecte de leads quotidienne</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={statistics?.dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="leadsCollected" stroke="#ff7300" name="Leads collectés" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Taux de conversion</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-primary">
                          {statistics ? ((statistics.leadsCollected / statistics.totalConnections) * 100).toFixed(1) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">visiteurs convertis en leads</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total des leads collectés</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-primary">{statistics?.leadsCollected}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          dont {Math.round((statistics?.leadsCollected || 0) * 0.65)} avec emails
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Méthodes de collecte de leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Jeux', value: Math.round((statistics?.leadsCollected || 0) * 0.45) },
                              { name: 'Quiz', value: Math.round((statistics?.leadsCollected || 0) * 0.30) },
                              { name: 'Inscriptions', value: Math.round((statistics?.leadsCollected || 0) * 0.25) }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#0088FE" />
                            <Cell fill="#00C49F" />
                            <Cell fill="#FFBB28" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="games" className="space-y-4">
                <ErrorBoundary>
                  <GameAnalytics dateRange={dateRange} />
                </ErrorBoundary>
              </TabsContent>
            </CardContent>
          </Tabs>
        </>
      )}
    </Card>
  );
};

export default AdminDashboard;
