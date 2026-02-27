import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Plus, Search, Copy, CheckCircle, Wifi, Settings, ExternalLink, MapPin } from 'lucide-react';

const HARDWARE_BRANDS = [
  { id: 'ubiquiti', label: 'Ubiquiti UniFi', color: '#0066CC', status: 'stable' },
  { id: 'mikrotik', label: 'MikroTik', color: '#E30613', status: 'beta' },
  { id: 'cisco', label: 'Cisco Meraki', color: '#049FD9', status: 'coming' },
  { id: 'huawei', label: 'Huawei', color: '#CF0A2C', status: 'coming' },
];

export default function Sites() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', resellerId: '', location: '', type: 'hotel',
    primaryColor: '#5B4DFF', whatsappSupport: '',
    hardwareBrand: 'ubiquiti', controllerUrl: '', controllerUser: '', controllerPass: '',
  });

  const { data, isLoading, refetch } = trpc.admin.getSites.useQuery({ search });
  const { data: resellersData } = trpc.admin.getResellers.useQuery({});
  const createSite = trpc.admin.createSite.useMutation({ onSuccess: () => { refetch(); setShowForm(false); } });

  const sites = data?.sites ?? [];
  const resellers = resellersData?.resellers ?? [];

  const copyPortalLink = (slug: string) => {
    const url = `${window.location.origin.replace('5174', '5173')}/portal/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const getHardwareStatusBadge = (brand: string) => {
    const b = HARDWARE_BRANDS.find(h => h.id === brand);
    if (!b) return null;
    const cls = b.status === 'stable' ? 'badge-success' : b.status === 'beta' ? 'badge-warning' : 'badge-neutral';
    return <span className={`badge ${cls}`}>{b.label}</span>;
  };

  return (
    <div className="bo-main animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Sites WiFi</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Chaque site génère un lien de portail captif unique configurable sur votre équipement réseau
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nouveau site
        </button>
      </div>

      {/* Formulaire création site */}
      {showForm && (
        <div className="bo-card mb-6 animate-fade-in">
          <h3 className="font-black text-base mb-4" style={{ color: 'var(--text)' }}>Créer un site</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="bo-label">Nom du site *</label>
              <input className="bo-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Hôtel Terrou-Bi" />
            </div>
            <div>
              <label className="bo-label">Revendeur *</label>
              <select className="bo-input" value={form.resellerId} onChange={e => setForm(f => ({ ...f, resellerId: e.target.value }))}>
                <option value="">Sélectionner un revendeur</option>
                {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="bo-label">Localisation</label>
              <input className="bo-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Ex: Dakar, Sénégal" />
            </div>
            <div>
              <label className="bo-label">Type d'établissement</label>
              <select className="bo-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="hotel">Hôtel</option>
                <option value="restaurant">Restaurant</option>
                <option value="campus">Campus</option>
                <option value="mall">Centre commercial</option>
                <option value="office">Bureau</option>
                <option value="public">Espace public</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="bo-label">Couleur principale</label>
              <div className="flex gap-2">
                <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                <input className="bo-input flex-1" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="bo-label">WhatsApp Support</label>
              <input className="bo-input" value={form.whatsappSupport} onChange={e => setForm(f => ({ ...f, whatsappSupport: e.target.value }))} placeholder="+221 77 000 00 00" />
            </div>
          </div>

          {/* Configuration hardware */}
          <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--content-bg)', border: '1px solid var(--border)' }}>
            <h4 className="font-black text-sm mb-3" style={{ color: 'var(--text)' }}>
              Configuration matérielle
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {HARDWARE_BRANDS.map(brand => (
                <button
                  key={brand.id}
                  type="button"
                  className="flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all"
                  style={{
                    borderColor: form.hardwareBrand === brand.id ? brand.color : 'var(--border)',
                    background: form.hardwareBrand === brand.id ? `${brand.color}10` : 'white',
                    opacity: brand.status === 'coming' ? 0.5 : 1,
                    cursor: brand.status === 'coming' ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => brand.status !== 'coming' && setForm(f => ({ ...f, hardwareBrand: brand.id }))}
                  disabled={brand.status === 'coming'}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${brand.color}20` }}>
                    <Wifi size={16} style={{ color: brand.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{brand.label}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {brand.status === 'stable' ? '✅ Stable' : brand.status === 'beta' ? '🔶 Bêta' : '🔜 Bientôt'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {form.hardwareBrand !== '' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="bo-label">URL Contrôleur *</label>
                  <input className="bo-input" value={form.controllerUrl} onChange={e => setForm(f => ({ ...f, controllerUrl: e.target.value }))} placeholder="https://192.168.1.1" />
                </div>
                <div>
                  <label className="bo-label">Utilisateur *</label>
                  <input className="bo-input" value={form.controllerUser} onChange={e => setForm(f => ({ ...f, controllerUser: e.target.value }))} placeholder="admin" />
                </div>
                <div>
                  <label className="bo-label">Mot de passe *</label>
                  <input className="bo-input" type="password" value={form.controllerPass} onChange={e => setForm(f => ({ ...f, controllerPass: e.target.value }))} placeholder="••••••••" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              className="btn-primary"
              onClick={() => createSite.mutate(form as any)}
              disabled={createSite.isPending || !form.name || !form.resellerId}
            >
              {createSite.isPending ? 'Création...' : 'Créer le site'}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="bo-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input className="bo-input" style={{ paddingLeft: '2.25rem' }} placeholder="Rechercher un site..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Grille de sites */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12" style={{ color: 'var(--muted)' }}>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          Chargement...
        </div>
      ) : sites.length === 0 ? (
        <div className="bo-card flex flex-col items-center justify-center py-16 gap-3">
          <Wifi size={40} style={{ color: 'var(--muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--muted)' }}>Aucun site configuré</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Créer le premier site</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map(site => (
            <div key={site.id} className="bo-card hover:shadow-md transition-shadow">
              {/* Header site */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black"
                    style={{ background: `linear-gradient(135deg, ${site.primaryColor ?? '#5B4DFF'}, #FF4D6A)` }}
                  >
                    {site.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-sm" style={{ color: 'var(--text)' }}>{site.name}</p>
                    {site.location && (
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <MapPin size={10} /> {site.location}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`badge ${site.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {site.isActive ? '● Actif' : '● Inactif'}
                </span>
              </div>

              {/* Stats rapides */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Sessions', value: site.activeSessions ?? 0 },
                  { label: 'Utilisateurs', value: site.totalUsers ?? 0 },
                  { label: 'Revenus', value: `${((site.revenueFcfa ?? 0) / 1000).toFixed(0)}K` },
                ].map(stat => (
                  <div key={stat.label} className="text-center p-2 rounded-lg" style={{ background: 'var(--content-bg)' }}>
                    <p className="text-sm font-black" style={{ color: 'var(--text)' }}>{stat.value}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Hardware */}
              <div className="mb-3">
                {getHardwareStatusBadge(site.hardwareBrand ?? 'ubiquiti')}
              </div>

              {/* Lien portail */}
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all"
                  style={{
                    background: copied === site.slug ? '#DCFCE7' : '#F1F5F9',
                    color: copied === site.slug ? '#16A34A' : 'var(--muted)',
                  }}
                  onClick={() => copyPortalLink(site.slug)}
                >
                  {copied === site.slug ? <CheckCircle size={13} /> : <Copy size={13} />}
                  {copied === site.slug ? 'Lien copié !' : 'Copier le lien portail'}
                </button>
                <a
                  href={`${window.location.origin.replace('5174', '5173')}/portal/${site.slug}?demo=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg"
                  style={{ background: '#EEF2FF', color: 'var(--pc-primary)' }}
                >
                  <ExternalLink size={13} /> Tester
                </a>
                <a href={`/sites/${site.id}`} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: '#F1F5F9', color: 'var(--muted)' }}>
                  <Settings size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
