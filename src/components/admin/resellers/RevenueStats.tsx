/**
 * Cartes de statistiques revenus pour un revendeur : total des revenus
 * (amount_fcfa), total des commissions (commission_fcfa), net revendeur
 * et nombre de transactions. Props pures → testable sans backend.
 */
import { Card, CardContent } from '@/components/ui/card';

export interface ResellerTransactionLike {
  amount_fcfa: number | null;
  commission_fcfa: number | null;
}

interface RevenueStatsProps {
  transactions: ResellerTransactionLike[];
}

export default function RevenueStats({ transactions }: RevenueStatsProps) {
  const sum = (pick: (t: ResellerTransactionLike) => number | null) =>
    transactions.reduce((acc, t) => acc + (pick(t) || 0), 0);

  const revenue = sum((t) => t.amount_fcfa);
  const commission = sum((t) => t.commission_fcfa);
  const net = revenue - commission;

  const stats = [
    { id: 'stat-revenue', label: 'Revenus totaux', value: revenue },
    { id: 'stat-commission', label: 'Commissions', value: commission },
    { id: 'stat-net', label: 'Net revendeur', value: net },
    { id: 'stat-count', label: 'Transactions', value: transactions.length },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.id} className="rounded-2xl shadow-[var(--shadow-card)]" data-testid={s.id}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-extrabold">{s.value.toLocaleString('fr-FR')}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
