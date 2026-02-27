import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MapPin, Wifi, CreditCard,
  Ticket, UserCheck, BarChart2, FileText, Settings, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate } from 'react-router-dom';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/resellers', icon: UserCheck, label: 'Revendeurs' },
  { to: '/admin/sites', icon: MapPin, label: 'Sites' },
  { to: '/admin/sessions', icon: Wifi, label: 'Sessions' },
  { to: '/admin/transactions', icon: CreditCard, label: 'Transactions' },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/vouchers', icon: Ticket, label: 'Vouchers' },
  { to: '/admin/logs', icon: FileText, label: 'Logs' },
  { to: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/admin/settings', icon: Settings, label: 'Paramètres' },
];

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAdminAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-surface-light">
      <aside className="w-[280px] bg-surface-dark text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-extrabold text-lg"
            style={{ background: 'var(--brand-gradient)' }}>
            PC
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">PremiumConnect</h1>
            <p className="text-xs text-gray-400">Back-office</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-brand-primary/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 space-y-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-full bg-brand-primary/30 flex items-center justify-center text-xs font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <p className="text-xs text-gray-300 truncate flex-1">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
          <p className="text-xs text-gray-500 text-center">WIFI-Sénégal — tous droits réservés</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border flex items-center px-6 shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Administration</h2>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
