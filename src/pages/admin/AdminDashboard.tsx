import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, Users, CreditCard, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color, sub }: { title: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <Card className="rounded-2xl shadow-[var(--shadow-card)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-extrabold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: color + '15', color }}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    refetchInterval: 30000,
    queryFn: async () => {
      const [sessions, users, transactions, atRisk] = await Promise.all([
        supabase.from('wifi_sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('wifi_users').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount_fcfa').eq('status', 'completed'),
        supabase.from('wifi_users').select('id', { count: 'exact', head: true }).gte('churn_risk', 0.6),
      ]);

      const totalRevenue = (transactions.data || []).reduce((s, t) => s + (t.amount_fcfa || 0), 0);

      return {
        activeSessions: sessions.count || 0,
        totalUsers: users.count || 0,
        revenue: totalRevenue,
        atRiskUsers: atRisk.count || 0,
      };
    },
  });

  const s = stats || { activeSessions: 0, totalUsers: 0, revenue: 0, atRiskUsers: 0 };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Sessions actives" value={s.activeSessions} icon={Wifi} color="#5B4DFF" />
        <StatCard title="Utilisateurs WiFi" value={s.totalUsers} icon={Users} color="#10B981" />
        <StatCard title="Revenus (FCFA)" value={s.revenue.toLocaleString('fr-FR')} icon={CreditCard} color="#F59E0B" />
        <StatCard title="À risque de churn" value={s.atRiskUsers} icon={AlertTriangle} color="#EF4444" sub="churn_risk ≥ 60%" />
      </div>
    </div>
  );
}
