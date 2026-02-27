import { trpc } from '../lib/trpc';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, Users, Wifi, CreditCard, Activity,
  AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#5B4DFF', '#FF4D6A', '#10B981', '#F59E0B', '#8B5CF6'];

function KpiCard({
  label, value, sub, trend, color, icon: Icon
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: number; positive: boolean };
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}) {
  return (
    <div className="kpi-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon size={20} color={color} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
            style={{
              background: trend.positive ? '#DCFCE7' : '#FEE2E2',
              color: trend.positive ? '#16A34A' : '#DC2626',
            }}
          >
            {trend.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black mt-2" style={{ color: 'var(--text)' }}>{value}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, refetch } = trpc.admin.getDashboardStats.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // Données démo si API non disponible
  const stats = data ?? {
    totalRevenueFcfa: 2_850_000,
    revenueGrowth: 12.4,
    activeUsers: 1_247,
    usersGrowth: 8.2,
    activeSessions: 89,
    sessionsGrowth: -3.1,
    totalTransactions: 4_521,
    pendingTransactions: 12,
    totalResellers: 8,
    totalSites: 23,
    churnRisk: 156,
    revenueByDay: Array.from({ length: 14 }, (_, i) => ({
      date: format(subDays(new Date(), 13 - i), 'dd/MM', { locale: fr }),
      revenue: Math.floor(80000 + Math.random() * 120000),
      sessions: Math.floor(60 + Math.random() * 80),
    })),
    revenueByMethod: [
      { name: 'Wave', value: 68 },
      { name: 'Orange Money', value: 24 },
      { name: 'Free Money', value: 8 },
    ],
    topSites: [
      { name: 'Hôtel Terrou-Bi', revenue: 420000, sessions: 312 },
      { name: 'Université UCAD', revenue: 380000, sessions: 289 },
      { name: 'Mall Dakar', revenue: 290000, sessions: 198 },
      { name: 'Aéroport AIBD', revenue: 260000, sessions: 175 },
      { name: 'Hôtel Radisson', revenue: 210000, sessions: 143 },
    ],
    recentAlerts: [
      { type: 'churn', message: '23 utilisateurs à risque de churn identifiés', time: 'Il y a 2h' },
      { type: 'payment', message: '3 transactions Wave en attente de confirmation', time: 'Il y a 4h' },
      { type: 'hardware', message: 'Site "Hôtel Palm Beach" — Contrôleur UniFi inaccessible', time: 'Il y a 6h' },
    ],
  };

  return (
    <div className="bo-main animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Tableau de bord</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Vue globale en temps réel — {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Revenus (30 jours)"
          value={`${(stats.totalRevenueFcfa / 1000).toFixed(0)}K FCFA`}
          sub={`${stats.totalTransactions.toLocaleString('fr-FR')} transactions`}
          trend={{ value: stats.revenueGrowth, positive: stats.revenueGrowth > 0 }}
          color="var(--kpi-revenue)"
          icon={CreditCard}
        />
        <KpiCard
          label="Utilisateurs actifs"
          value={stats.activeUsers.toLocaleString('fr-FR')}
          sub={`${stats.totalResellers} revendeurs`}
          trend={{ value: stats.usersGrowth, positive: stats.usersGrowth > 0 }}
          color="var(--kpi-users)"
          icon={Users}
        />
        <KpiCard
          label="Sessions actives"
          value={stats.activeSessions.toString()}
          sub={`${stats.totalSites} sites configurés`}
          trend={{ value: Math.abs(stats.sessionsGrowth), positive: stats.sessionsGrowth > 0 }}
          color="var(--kpi-sessions)"
          icon={Activity}
        />
        <KpiCard
          label="Risque de churn"
          value={stats.churnRisk.toString()}
          sub="utilisateurs identifiés"
          color="var(--kpi-churn)"
          icon={AlertTriangle}
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenus & Sessions sur 14 jours */}
        <div className="bo-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Revenus & Sessions — 14 derniers jours</h3>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Revenus</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block" /> Sessions</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.revenueByDay}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B4DFF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#5B4DFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #E2E8F0', fontFamily: 'Montserrat' }}
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? `${value.toLocaleString('fr-FR')} FCFA` : value,
                  name === 'revenue' ? 'Revenus' : 'Sessions',
                ]}
              />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#5B4DFF" strokeWidth={2} fill="url(#colorRevenue)" />
              <Area yAxisId="right" type="monotone" dataKey="sessions" stroke="#F59E0B" strokeWidth={2} fill="url(#colorSessions)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par méthode de paiement */}
        <div className="bo-card">
          <h3 className="font-black text-sm mb-4" style={{ color: 'var(--text)' }}>Paiements par méthode</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={stats.revenueByMethod}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {stats.revenueByMethod.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Sites & Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 sites */}
        <div className="bo-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Top 5 Sites</h3>
            <a href="/sites" className="text-xs font-semibold" style={{ color: 'var(--pc-primary)' }}>
              Voir tout →
            </a>
          </div>
          <div className="flex flex-col gap-3">
            {stats.topSites.map((site, i) => (
              <div key={site.name} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${COLORS[i]}, ${COLORS[(i + 1) % COLORS.length]})` }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{site.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{site.sessions} sessions</p>
                </div>
                <p className="text-sm font-black" style={{ color: 'var(--kpi-revenue)' }}>
                  {(site.revenue / 1000).toFixed(0)}K
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes récentes */}
        <div className="bo-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>Alertes récentes</h3>
            <span
              className="badge badge-warning"
            >
              {stats.recentAlerts.length} actives
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {stats.recentAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--content-bg)' }}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: alert.type === 'churn' ? '#FEE2E2' : alert.type === 'payment' ? '#FEF3C7' : '#DBEAFE',
                  }}
                >
                  <AlertTriangle
                    size={14}
                    color={alert.type === 'churn' ? '#DC2626' : alert.type === 'payment' ? '#D97706' : '#2563EB'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{alert.message}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
