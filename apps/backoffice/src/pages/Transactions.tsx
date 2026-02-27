import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Search, Download, CreditCard, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Complété', cls: 'badge-success' },
  pending:   { label: 'En attente', cls: 'badge-warning' },
  failed:    { label: 'Échoué', cls: 'badge-danger' },
  refunded:  { label: 'Remboursé', cls: 'badge-neutral' },
};

const METHOD_LABELS: Record<string, string> = {
  wave: '🌊 Wave',
  orange_money: '🟠 Orange Money',
  free_money: '🔴 Free Money',
};

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');

  const { data, isLoading } = trpc.admin.getTransactions.useQuery({ search, status, method });
  const transactions = data?.transactions ?? [];
  const summary = data?.summary ?? { total: 0, completed: 0, pending: 0, failed: 0, totalFcfa: 0 };

  return (
    <div className="bo-main animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Transactions</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Historique complet des paiements</p>
        </div>
        <button className="btn-secondary">
          <Download size={15} /> Exporter CSV
        </button>
      </div>

      {/* KPIs transactions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total transactions', value: summary.total.toLocaleString('fr-FR'), color: 'var(--pc-primary)', icon: CreditCard },
          { label: 'Complétées', value: summary.completed.toLocaleString('fr-FR'), color: 'var(--kpi-revenue)', icon: TrendingUp },
          { label: 'En attente', value: summary.pending.toLocaleString('fr-FR'), color: '#F59E0B', icon: CreditCard },
          { label: 'Revenus totaux', value: `${(summary.totalFcfa / 1000).toFixed(0)}K FCFA`, color: 'var(--kpi-revenue)', icon: TrendingUp },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
              <kpi.icon size={18} color={kpi.color} />
            </div>
            <p className="text-xl font-black" style={{ color: 'var(--text)' }}>{kpi.value}</p>
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bo-card mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input className="bo-input" style={{ paddingLeft: '2.25rem' }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="bo-input" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="completed">Complété</option>
          <option value="pending">En attente</option>
          <option value="failed">Échoué</option>
        </select>
        <select className="bo-input" style={{ width: 'auto' }} value={method} onChange={e => setMethod(e.target.value)}>
          <option value="">Toutes les méthodes</option>
          <option value="wave">Wave</option>
          <option value="orange_money">Orange Money</option>
          <option value="free_money">Free Money</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bo-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--muted)' }}>
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Chargement...
          </div>
        ) : (
          <table className="bo-table">
            <thead>
              <tr>
                <th>ID Transaction</th>
                <th>Utilisateur</th>
                <th>Site</th>
                <th>Forfait</th>
                <th>Montant</th>
                <th>Méthode</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--muted)' }}>Aucune transaction trouvée</td></tr>
              ) : transactions.map(tx => {
                const st = STATUS_LABELS[tx.status] ?? { label: tx.status, cls: 'badge-neutral' };
                return (
                  <tr key={tx.id}>
                    <td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{tx.id.slice(0, 8)}...</code></td>
                    <td><span className="font-semibold">{tx.phone ?? tx.userId}</span></td>
                    <td>{tx.siteName}</td>
                    <td><span className="badge badge-info">{tx.planName}</span></td>
                    <td><span className="font-black" style={{ color: 'var(--kpi-revenue)' }}>{tx.amountFcfa.toLocaleString('fr-FR')} FCFA</span></td>
                    <td>{METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td className="text-xs" style={{ color: 'var(--muted)' }}>
                      {format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
