/**
 * PAGE DASHBOARD — statistiques du site courant (sélecteur global).
 * Toutes les métriques sont scopées par site_id via useCurrentSite().
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, Users, CreditCard, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentSite } from '@/context/SiteContext';
import { siteQueryKey } from '@/lib/admin/queries';
import HelpTip from '@/components/admin/HelpTip';

interface DashboardStats {
  activeSessions: number;
  totalUsers: number;
  revenue: number;
  atRiskUsers: number;
}

const EMPTY: DashboardStats = { activeSessions: 0, totalUsers: 0, revenue: 0, atRiskUsers: 0 };

function StatCard({ title, value, icon: Icon, color, sub }: {
  title: string;
  value: string | number;
  icon: typeof Wifi;
  color: string;
  sub?: string;
}) {
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
  const { currentSite, loading } = useCurrentSite();
  const siteId = currentSite?.id ?? null;

  const { data: stats } = useQuery({
    queryKey: siteQueryKey('admin-dashboard', siteId),
    refetchInterval: 30000,
    enabled: !!siteId,
    queryFn: async (): Promise<DashboardStats> => {
      // Compteurs et sommes du site courant seulement ; pas de fallback global
      // (la requête est désactivée quand aucun site n'est sélectionné).
      const [sessions, users, transactions, atRisk] = await Promise.all([
        supabase.from('wifi_sessions').select('id', { count: 'exact', head: true })
          .eq('site_id', siteId as string).eq('status', 'active'),
        supabase.from('wifi_users').select('id', { count: 'exact', head: true })
          .eq('site_id', siteId as string),
        supabase.from('transactions').select('amount_fcfa').eq('status', 'completed')
          .eq('site_id', siteId as string),
        supabase.from('wifi_users').select('id', { count: 'exact', head: true })
          .eq('site_id', siteId as string).gte('churn_risk', 0.6),
      ]);

      return {
        activeSessions: sessions.count || 0,
        totalUsers: users.count || 0,
        revenue: (transactions.data || []).reduce((s, t) => s + (t.amount_fcfa || 0), 0),
        atRiskUsers: atRisk.count || 0,
      };
    },
  });

  if (loading) {
    return <p className="text-muted-foreground">Chargement du site courant…</p>;
  }

  if (!currentSite) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <HelpTip variant="banner" title="Aucun site sélectionné"
          text="Choisissez un site en haut de l’écran pour voir ses statistiques." />
      </div>
    );
  }

  const s = stats ?? EMPTY;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <span className="text-sm text-muted-foreground">Site : {currentSite.name}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Sessions actives" value={s.activeSessions} icon={Wifi} color="#5B4DFF" />
        <StatCard title="Utilisateurs WiFi" value={s.totalUsers} icon={Users} color="#10B981" />
        <StatCard title="Revenus (FCFA)" value={s.revenue.toLocaleString('fr-FR')} icon={CreditCard} color="#F59E0B" />
        <StatCard title="À risque de churn" value={s.atRiskUsers} icon={AlertTriangle} color="#EF4444" sub="churn_risk ≥ 60%" />
      </div>
    </div>
  );
}
