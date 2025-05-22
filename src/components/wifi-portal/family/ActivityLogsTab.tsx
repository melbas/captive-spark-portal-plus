
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "../../LanguageContext";

interface ActivityLog {
  id: string;
  user_name?: string;
  action: string;
  timestamp: string;
}

interface ActivityLogsTabProps {
  activityLogs: ActivityLog[];
}

const ActivityLogsTab: React.FC<ActivityLogsTabProps> = ({ activityLogs }) => {
  const { t } = useLanguage();
  
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <Badge variant="outline" className="bg-green-100">Connexion</Badge>;
      case 'logout':
        return <Badge variant="outline" className="bg-gray-100">Déconnexion</Badge>;
      case 'join':
        return <Badge variant="outline" className="bg-blue-100">A rejoint</Badge>;
      case 'remove_member':
        return <Badge variant="outline" className="bg-red-100">Membre retiré</Badge>;
      case 'suspend_member':
        return <Badge variant="outline" className="bg-yellow-100">Membre suspendu</Badge>;
      case 'reactivate_member':
        return <Badge variant="outline" className="bg-green-100">Membre réactivé</Badge>;
      default:
        return <Badge variant="outline">Action</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">{t("recentActivity")}</h3>
      
      <ScrollArea className="h-[500px] w-full pr-4">
        {activityLogs.length === 0 ? (
          <Card className="bg-muted/20">
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground">{t("noActivityLogs")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 pb-4 border-b">
                <div className="mt-1">
                  {getActivityIcon(log.action)}
                </div>
                <div>
                  <div className="font-medium">{log.user_name || t("system")}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleDateString()} à {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-sm mt-1">
                    {log.action === 'join' && "A rejoint la famille"}
                    {log.action === 'remove_member' && "Membre retiré de la famille"}
                    {log.action === 'suspend_member' && "Membre suspendu"}
                    {log.action === 'reactivate_member' && "Membre réactivé"}
                    {log.action === 'login' && "S'est connecté au WiFi"}
                    {log.action === 'logout' && "S'est déconnecté du WiFi"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ActivityLogsTab;
