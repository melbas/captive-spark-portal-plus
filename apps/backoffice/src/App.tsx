import { Switch, Route, Redirect } from 'wouter';
import { Sidebar } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Resellers from './pages/Resellers';
import Sites from './pages/Sites';
import Sessions from './pages/Sessions';
import Transactions from './pages/Transactions';
import AuditLogs from './pages/AuditLogs';
import { trpc } from './lib/trpc';
import { Bell, Menu } from 'lucide-react';
import { useState } from 'react';

function BackOfficeLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: me } = trpc.admin.getMe.useQuery();
  const logout = trpc.admin.logout.useMutation({
    onSuccess: () => { window.location.href = '/login'; },
  });

  return (
    <div className="bo-layout">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-90 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`bo-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          role={me?.role ?? 'admin'}
          userName={me?.name ?? 'Admin'}
          onLogout={() => logout.mutate()}
        />
      </div>

      <div className="bo-content">
        {/* Topbar */}
        <header className="bo-topbar">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg"
              style={{ background: 'var(--content-bg)' }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--text)' }}>PremiumConnect</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Back-Office Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg" style={{ background: 'var(--content-bg)' }}>
              <Bell size={18} style={{ color: 'var(--muted)' }} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #5B4DFF, #FF4D6A)' }}
            >
              {(me?.name ?? 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Contenu */}
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BackOfficeLayout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/resellers" component={Resellers} />
        <Route path="/sites" component={Sites} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/audit-logs" component={AuditLogs} />
        <Route>
          <div className="bo-main flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-4xl font-black mb-2" style={{ color: 'var(--text)' }}>404</p>
              <p style={{ color: 'var(--muted)' }}>Page non trouvée</p>
              <a href="/dashboard" className="btn-primary mt-4 inline-flex">Retour au tableau de bord</a>
            </div>
          </div>
        </Route>
      </Switch>
    </BackOfficeLayout>
  );
}
