import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MapPin, Wifi, CreditCard,
  Ticket, UserCheck, BarChart2, FileText, Settings, LogOut,
  Puzzle, Wallet, Menu, Lock, Globe, Megaphone, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCurrentSite } from '@/context/SiteContext';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { navItemsForRole } from '@/lib/admin/roles';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/admin/sites', icon: MapPin, label: 'Sites' },
  { to: '/admin/forge', icon: Wand2, label: 'Forge' },
  { to: '/admin/modules', icon: Puzzle, label: 'Modules du parcours' },
  { to: '/admin/plans', icon: Wallet, label: 'Forfaits' },
  { to: '/admin/sessions', icon: Wifi, label: 'Sessions' },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/vouchers', icon: Ticket, label: 'Vouchers' },
  { to: '/admin/transactions', icon: CreditCard, label: 'Transactions' },
  { to: '/admin/analytics', icon: BarChart2, label: 'Analyses' },
  { to: '/admin/ads', icon: Megaphone, label: 'Publicités' },
  { to: '/admin/resellers', icon: UserCheck, label: 'Revendeurs' },
  { to: '/admin/logs', icon: FileText, label: 'Journal' },
  { to: '/admin/settings', icon: Settings, label: 'Paramètres' },
];

const CRUMB_LABELS: Record<string, string> = {
  dashboard: 'Accueil', sites: 'Sites', modules: 'Modules du parcours',
  plans: 'Forfaits', sessions: 'Sessions', users: 'Utilisateurs',
  vouchers: 'Vouchers', transactions: 'Transactions', analytics: 'Analyses',
  ads: 'Publicités',
  resellers: 'Revendeurs', logs: 'Journal', settings: 'Paramètres',
  login: 'Connexion',
};

function SiteSelector({ className }: { className?: string }) {
  const { sites, currentSite, setCurrentSiteId, locked, loading } = useCurrentSite();
  if (loading) return <span className="text-xs text-muted-foreground">Sites…</span>;
  if (!currentSite) {
    return <span className="text-xs text-muted-foreground">Aucun site</span>;
  }
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
      <Select
        value={currentSite.id}
        onValueChange={setCurrentSiteId}
        disabled={locked}
      >
        <SelectTrigger className="w-[220px] h-9 rounded-xl border-border bg-white">
          <SelectValue placeholder="Site courant" />
        </SelectTrigger>
        <SelectContent>
          {sites.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}{!s.is_active ? ' (inactif)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAdminAuth();
  const allowed = navItemsForRole(role ?? 'viewer', NAV_ITEMS);
  return (
    <nav className="space-y-1">
      {allowed.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-brand-primary/20 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const segments = location.pathname.split('/').filter(Boolean);
  const pageLabel = CRUMB_LABELS[segments[segments.length - 1]] ?? segments[segments.length - 1];

  return (
    <div className="flex min-h-screen bg-surface-light">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-[280px] bg-surface-dark text-white flex-col shrink-0">
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

        <div className="px-4 mb-3"><NavLinks /></div>

        <div className="mt-auto p-4 space-y-3 border-t border-white/10">
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

      {/* Drawer — mobile : ouvert depuis le hamburger du header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border flex items-center gap-3 px-4 lg:px-6 shrink-0">
          {/* Hamburger mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-surface-dark text-white border-white/10 p-0">
              <SheetHeader className="p-6 pb-2">
                <SheetTitle className="text-white">Menu</SheetTitle>
              </SheetHeader>
              <div className="px-4"><NavLinks onNavigate={undefined} /></div>
            </SheetContent>
          </Sheet>

          <SiteSelector className="shrink-0" />

          <div className="ml-auto">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    {pageLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
