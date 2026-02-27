import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Search, WifiOff, Activity, Clock, Smartphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Sessions() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = trpc.admin.getActiveSessions.useQuery({ search }, { refetchInterval: 15_000 });
  const kickSession = trpc.admin.kickSession.useMutation({ onSuccess: () => refetch() });

  const sessions = data?.sessions ?? [];

  return (
    <div className="bo-main animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Sessions actives</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {sessions.length} session{sessions.length > 1 ? 's' : ''} en cours — Actualisation auto toutes les 15s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-600">En direct</span>
        </div>
      </div>

      <div className="bo-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input className="bo-input" style={{ paddingLeft: '2.25rem' }} placeholder="Rechercher par MAC, téléphone, site..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bo-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--muted)' }}>
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Chargement...
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity size={40} style={{ color: 'var(--muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--muted)' }}>Aucune session active</p>
          </div>
        ) : (
          <table className="bo-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Site</th>
                <th>Forfait</th>
                <th>Adresse MAC</th>
                <th>Connecté depuis</th>
                <th>Expire dans</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} style={{ color: 'var(--pc-primary)' }} />
                      <span className="font-semibold">{s.phone ?? s.userId}</span>
                    </div>
                  </td>
                  <td><span className="font-medium">{s.siteName}</span></td>
                  <td><span className="badge badge-info">{s.planName}</span></td>
                  <td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.mac}</code></td>
                  <td>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(s.startedAt), { locale: fr, addSuffix: true })}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${s.expiresIn > 0 ? 'badge-success' : 'badge-danger'}`}>
                      {s.expiresIn > 0 ? `${Math.floor(s.expiresIn / 60)}h ${s.expiresIn % 60}m` : 'Expiré'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-danger"
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        if (confirm(`Déconnecter ${s.phone ?? s.mac} ?`)) {
                          kickSession.mutate({ sessionId: s.id });
                        }
                      }}
                      disabled={kickSession.isPending}
                    >
                      <WifiOff size={13} /> Déconnecter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
