import { Wifi, Shield, Zap } from 'lucide-react';
import type { PortalParams } from '../../pages/CaptivePortal';

interface Props {
  site: { name: string; welcomeMsg?: string | null; primaryColor: string; type?: string | null; location?: string | null };
  portalParams: PortalParams;
  onNext: () => void;
}

export function StepWelcome({ site, portalParams, onNext }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 pt-6 pc-animate-slide-up">
      {/* Hero WiFi icon */}
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg"
        style={{ background: `linear-gradient(135deg, ${site.primaryColor}, #FF4D6A)` }}
      >
        <Wifi size={48} color="white" strokeWidth={2.5} />
      </div>

      {/* Titre */}
      <div className="text-center">
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--pc-text)' }}>
          Bienvenue chez
        </h1>
        <h2 className="text-3xl font-black pc-gradient-text">{site.name}</h2>
        {site.location && (
          <p className="text-sm mt-1" style={{ color: 'var(--pc-muted)' }}>📍 {site.location}</p>
        )}
      </div>

      {/* Message de bienvenue */}
      <div className="pc-card p-4 w-full text-center">
        <p className="font-medium" style={{ color: 'var(--pc-text)' }}>
          {site.welcomeMsg ?? 'Connectez-vous pour accéder à Internet rapidement et en toute sécurité.'}
        </p>
      </div>

      {/* Avantages */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {[
          { icon: Zap, label: 'Rapide', desc: 'Connexion HD' },
          { icon: Shield, label: 'Sécurisé', desc: 'Chiffré SSL' },
          { icon: Wifi, label: 'Stable', desc: 'Signal fort' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="pc-card p-3 text-center">
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ background: `${site.primaryColor}18` }}
            >
              <Icon size={20} style={{ color: site.primaryColor }} />
            </div>
            <p className="text-xs font-bold" style={{ color: 'var(--pc-text)' }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--pc-muted)' }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Mode démo info */}
      {portalParams.demoMode && (
        <div className="w-full p-3 rounded-xl bg-yellow-50 border border-yellow-200">
          <p className="text-xs text-yellow-700 text-center font-medium">
            ⚠️ Mode démonstration — Aucune connexion réseau réelle ne sera établie
          </p>
        </div>
      )}

      {/* CTA */}
      <button className="pc-btn-primary" onClick={onNext}>
        Se connecter au WiFi →
      </button>
    </div>
  );
}
