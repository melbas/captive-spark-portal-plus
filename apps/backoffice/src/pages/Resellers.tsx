import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Plus, Search, Copy, CheckCircle, XCircle, Building2, Wifi, CreditCard, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Resellers() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', commissionRate: 10 });
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.admin.getResellers.useQuery({ search });
  const createReseller = trpc.admin.createReseller.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ name: '', email: '', phone: '', commissionRate: 10 }); } });
  const toggleReseller = trpc.admin.toggleReseller.useMutation({ onSuccess: () => refetch() });

  const resellers = data?.resellers ?? [];

  const copyLink = (slug: string) => {
    const url = `${window.location.origin.replace('5174', '5173')}/portal/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bo-main animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Revendeurs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Gérez vos revendeurs et leurs accès au réseau PremiumConnect
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nouveau revendeur
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div className="bo-card mb-6 animate-fade-in">
          <h3 className="font-black text-base mb-4" style={{ color: 'var(--text)' }}>Créer un revendeur</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="bo-label">Nom de l'entreprise *</label>
              <input className="bo-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: TechNet Sénégal" />
            </div>
            <div>
              <label className="bo-label">Email *</label>
              <input className="bo-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@technet.sn" />
            </div>
            <div>
              <label className="bo-label">Téléphone</label>
              <input className="bo-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+221 77 000 00 00" />
            </div>
            <div>
              <label className="bo-label">Commission (%)</label>
              <input className="bo-input" type="number" min={0} max={50} value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              className="btn-primary"
              onClick={() => createReseller.mutate(form)}
              disabled={createReseller.isPending || !form.name || !form.email}
            >
              {createReseller.isPending ? 'Création...' : 'Créer le revendeur'}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="bo-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            className="bo-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Rechercher un revendeur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bo-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--muted)' }}>
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Chargement...
          </div>
        ) : resellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 size={40} style={{ color: 'var(--muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--muted)' }}>Aucun revendeur trouvé</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Créer le premier revendeur
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Revendeur</th>
                  <th>Sites</th>
                  <th>Revenus (30j)</th>
                  <th>Commission</th>
                  <th>Statut</th>
                  <th>Lien portail</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #5B4DFF, #FF4D6A)' }}
                        >
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{r.name}</p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Wifi size={14} style={{ color: 'var(--pc-primary)' }} />
                        <span className="font-semibold">{r.sitesCount ?? 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <CreditCard size={14} style={{ color: 'var(--kpi-revenue)' }} />
                        <span className="font-bold" style={{ color: 'var(--kpi-revenue)' }}>
                          {((r.revenueFcfa ?? 0) / 1000).toFixed(0)}K FCFA
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{r.commissionRate}%</span>
                    </td>
                    <td>
                      <span className={`badge ${r.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {r.isActive ? '● Actif' : '● Inactif'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                        style={{
                          background: copied === r.slug ? '#DCFCE7' : '#F1F5F9',
                          color: copied === r.slug ? '#16A34A' : 'var(--muted)',
                        }}
                        onClick={() => copyLink(r.slug)}
                        title={`/portal/${r.slug}`}
                      >
                        {copied === r.slug ? <CheckCircle size={13} /> : <Copy size={13} />}
                        {copied === r.slug ? 'Copié !' : 'Copier le lien'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <a href={`/resellers/${r.id}`} className="btn-secondary" style={{ padding: '0.375rem 0.75rem' }}>
                          <Eye size={13} /> Voir
                        </a>
                        <button
                          className={r.isActive ? 'btn-danger' : 'btn-secondary'}
                          style={{ padding: '0.375rem 0.75rem' }}
                          onClick={() => toggleReseller.mutate({ id: r.id, isActive: !r.isActive })}
                        >
                          {r.isActive ? <XCircle size={13} /> : <CheckCircle size={13} />}
                          {r.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
