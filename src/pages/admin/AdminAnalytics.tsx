import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#5B4DFF', '#FF4D6A', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

export default function AdminAnalytics() {
  const { data } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const [txRes, usersRes, sessionsRes] = await Promise.all([
        supabase.from('transactions').select('amount_fcfa, method, created_at, status').eq('status', 'completed'),
        supabase.from('wifi_users').select('churn_risk, ai_segment, loyalty_pts, created_at'),
        supabase.from('wifi_sessions').select('started_at, status'),
      ]);
      return {
        transactions: txRes.data || [],
        users: usersRes.data || [],
        sessions: sessionsRes.data || [],
      };
    },
  });

  const transactions = data?.transactions || [];
  const users = data?.users || [];
  const sessions = data?.sessions || [];

  // MRR by month
  const mrrByMonth: Record<string, number> = {};
  transactions.forEach((t) => {
    const month = (t.created_at || '').slice(0, 7);
    if (month) mrrByMonth[month] = (mrrByMonth[month] || 0) + (t.amount_fcfa || 0);
  });
  const mrrData = Object.entries(mrrByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, mrr]) => ({ month, mrr }));

  // ARPU
  const totalRevenue = transactions.reduce((s, t) => s + (t.amount_fcfa || 0), 0);
  const totalUsers = users.length || 1;
  const arpu = Math.round(totalRevenue / totalUsers);

  // Churn rate
  const atRisk = users.filter((u) => Number(u.churn_risk || 0) >= 0.6).length;
  const churnRate = totalUsers > 0 ? ((atRisk / totalUsers) * 100).toFixed(1) : '0';

  // Payment methods pie
  const methodCounts: Record<string, number> = {};
  transactions.forEach((t) => {
    const m = t.method || 'autre';
    methodCounts[m] = (methodCounts[m] || 0) + 1;
  });
  const pieData = Object.entries(methodCounts).map(([name, value]) => ({ name, value }));

  // Segment distribution
  const segCounts: Record<string, number> = {};
  users.forEach((u) => {
    const seg = (u.ai_segment as string) || 'new_user';
    segCounts[seg] = (segCounts[seg] || 0) + 1;
  });
  const segData = Object.entries(segCounts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  // Connections last 7 days
  const last7: Record<string, number> = {};
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    last7[d.toISOString().slice(0, 10)] = 0;
  }
  sessions.forEach((s) => {
    const day = (s.started_at || '').slice(0, 10);
    if (day in last7) last7[day]++;
  });
  const connectionData = Object.entries(last7).map(([date, count]) => ({
    date: date.slice(5),
    connexions: count,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Analytics</h1>

      {/* KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">ARPU</p>
            <p className="text-2xl font-extrabold">{arpu.toLocaleString('fr-FR')} FCFA</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Churn Rate</p>
            <p className="text-2xl font-extrabold">{churnRate}%</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Revenus totaux</p>
            <p className="text-2xl font-extrabold">{totalRevenue.toLocaleString('fr-FR')} FCFA</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Area Chart */}
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">MRR — Évolution mensuelle</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B4DFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5B4DFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} FCFA`} />
                <Area type="monotone" dataKey="mrr" stroke="#5B4DFF" fill="url(#mrrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Connexions 7 jours */}
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Connexions — 7 derniers jours</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={connectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="connexions" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition paiements */}
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Répartition méthodes de paiement</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune transaction</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Segments IA */}
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Segments IA — Répartition utilisateurs</CardTitle></CardHeader>
          <CardContent>
            {segData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun utilisateur</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={segData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#5B4DFF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
