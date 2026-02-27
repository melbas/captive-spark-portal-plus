import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, Building2, Wifi, CreditCard,
  BarChart3, Settings, LogOut, Package, Activity,
  FileText, ShieldCheck, Globe, ChevronRight
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: 'Vue globale',
    items: [
      { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { path: '/analytics', label: 'Analytiques', icon: BarChart3 },
    ],
  },
  {
    title: 'Réseau',
    items: [
      { path: '/resellers', label: 'Revendeurs', icon: Building2 },
      { path: '/sites', label: 'Sites WiFi', icon: Wifi },
      { path: '/plans', label: 'Forfaits', icon: Package },
    ],
  },
  {
    title: 'Utilisateurs',
    items: [
      { path: '/end-users', label: 'Utilisateurs finaux', icon: Users },
      { path: '/sessions', label: 'Sessions actives', icon: Activity },
    ],
  },
  {
    title: 'Finance',
    items: [
      { path: '/transactions', label: 'Transactions', icon: CreditCard },
      { path: '/reports', label: 'Rapports', icon: FileText },
    ],
  },
  {
    title: 'Système',
    items: [
      { path: '/audit-logs', label: 'Logs d\'audit', icon: ShieldCheck },
      { path: '/integrations', label: 'Intégrations', icon: Globe },
      { path: '/settings', label: 'Paramètres', icon: Settings },
    ],
  },
];

interface Props {
  role?: string;
  userName?: string;
  onLogout?: () => void;
}

export function Sidebar({ role = 'admin', userName = 'Admin', onLogout }: Props) {
  const [location] = useLocation();

  return (
    <aside className="bo-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #5B4DFF, #FF4D6A)' }}
        >
          PC
        </div>
        <div>
          <p className="font-black text-sm" style={{ color: 'var(--sidebar-text)' }}>PremiumConnect</p>
          <p className="text-xs" style={{ color: 'var(--sidebar-muted)' }}>Back-Office</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(section => (
          <div key={section.title}>
            <p className="nav-section">{section.title}</p>
            {section.items.map(item => {
              const isActive = location === item.path || location.startsWith(item.path + '/');
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <a className={`nav-item ${isActive ? 'active' : ''}`}>
                    <Icon size={17} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: 'var(--pc-secondary)', color: 'white' }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight size={14} style={{ opacity: 0.6 }} />}
                  </a>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Profil utilisateur */}
      <div className="border-t p-3" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div
          className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors"
          style={{ background: 'var(--sidebar-surface)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: 'linear-gradient(135deg, #5B4DFF, #FF4D6A)' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--sidebar-text)' }}>{userName}</p>
            <p className="text-xs capitalize" style={{ color: 'var(--sidebar-muted)' }}>{role}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1 rounded-lg transition-colors hover:bg-red-500/20"
            title="Déconnexion"
          >
            <LogOut size={14} style={{ color: 'var(--sidebar-muted)' }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
