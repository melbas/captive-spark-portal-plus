import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Search, ShieldCheck, User, Settings, CreditCard, Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ACTION_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  auth: User,
  payment: CreditCard,
  hardware: Wifi,
  admin: Settings,
  security: ShieldCheck,
};

const ACTION_COLORS: Record<string, string> = {
  auth: '#5B4DFF',
  payment: '#10B981',
  hardware: '#F59E0B',
  admin: '#8B5CF6',
  security: '#EF4444',
};

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { data, isLoading } = trpc.admin.getAuditLogs.useQuery({ search, category });
  const logs = data?.logs ?? [];

  return (
    <div className="bo-main animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Logs d'audit</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Traçabilité complète de toutes les actions critiques du système
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} style={{ color: 'var(--pc-primary)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--pc-primary)' }}>Audit actif</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="bo-card mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input className="bo-input" style={{ paddingLeft: '2.25rem' }} placeholder="Rechercher dans les logs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="bo-input" style={{ width: 'auto' }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Toutes les catégories</option>
          <option value="auth">Authentification</option>
          <option value="payment">Paiement</option>
          <option value="hardware">Matériel</option>
          <option value="admin">Administration</option>
          <option value="security">Sécurité</option>
        </select>
      </div>

      {/* Logs */}
      <div className="bo-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--muted)' }}>
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Chargement...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheck size={40} style={{ color: 'var(--muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--muted)' }}>Aucun log trouvé</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
            {logs.map(log => {
              const Icon = ACTION_ICONS[log.category] ?? ShieldCheck;
              const color = ACTION_COLORS[log.category] ?? '#64748B';
              return (
                <div key={log.id} className="flex items-start gap-4 py-3 hover:bg-gray-50 transition-colors px-2 rounded-lg">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${color}15` }}
                  >
                    <Icon size={15} color={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge`} style={{ background: `${color}15`, color }}>
                        {log.category}
                      </span>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{log.action}</p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{log.details}</p>
                    {log.metadata && (
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block max-w-full truncate">
                        {JSON.stringify(log.metadata)}
                      </code>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                      {format(new Date(log.createdAt), 'dd/MM HH:mm:ss', { locale: fr })}
                    </p>
                    {log.actorEmail && (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{log.actorEmail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
