import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LOYALTY_CONFIG } from '@/types/premiumconnect';
import type { LoyaltyLevel, AISegment } from '@/types/premiumconnect';

const segmentColors: Record<string, string> = {
  new_user: 'bg-blue-100 text-blue-700',
  loyal_customer: 'bg-green-100 text-green-700',
  price_sensitive: 'bg-yellow-100 text-yellow-700',
  weekend_user: 'bg-purple-100 text-purple-700',
  high_value: 'bg-emerald-100 text-emerald-700',
  at_risk: 'bg-orange-100 text-orange-700',
  churner: 'bg-red-100 text-red-700',
};

export default function AdminUsers() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('wifi_users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Utilisateurs WiFi</h1>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identifiant</TableHead>
                <TableHead>Fidélité</TableHead>
                <TableHead>Segment IA</TableHead>
                <TableHead>Churn Risk</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : (users || []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun utilisateur</TableCell></TableRow>
              ) : (users || []).map((u) => {
                const churn = Number(u.churn_risk || 0);
                const churnPct = Math.round(churn * 100);
                const churnColor = churn < 0.3 ? 'bg-green-500' : churn < 0.6 ? 'bg-yellow-500' : churn < 0.8 ? 'bg-orange-500' : 'bg-red-500';
                const level = (u.loyalty_level || 'basic') as LoyaltyLevel;
                const loyaltyInfo = LOYALTY_CONFIG[level];
                const segment = (u.ai_segment || 'new_user') as string;

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.phone || u.email || u.name || '—'}</TableCell>
                    <TableCell>
                      <span className="text-sm" style={{ color: loyaltyInfo?.color }}>
                        {loyaltyInfo?.badge} {loyaltyInfo?.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${segmentColors[segment] || ''}`}>
                        {segment.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${churnColor}`} style={{ width: `${churnPct}%` }} />
                        </div>
                        <span className="text-xs font-mono">{churnPct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{u.loyalty_pts || 0}</TableCell>
                    <TableCell>
                      {u.is_blocked ? (
                        <Badge variant="destructive">⚠️ Bloqué</Badge>
                      ) : (
                        <Badge variant="default">Actif</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
