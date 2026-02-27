import { Clock, Wifi, Star, Zap } from 'lucide-react';
import type { AuthState, SelectedPlan } from '../../pages/CaptivePortal';

interface Plan {
  id: string;
  name: string;
  durationMin: number;
  priceFcfa: number;
  speedDownMb: number | null;
  speedUpMb: number | null;
  dataLimitMb: number | null;
  maxDevices: number | null;
  isPopular: boolean | null;
}

interface Props {
  plans: Plan[];
  auth: AuthState;
  primaryColor: string;
  onSelect: (plan: SelectedPlan) => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.round(minutes / 1440)} jour${minutes >= 2880 ? 's' : ''}`;
  if (minutes < 43200) return `${Math.round(minutes / 10080)} semaine${minutes >= 20160 ? 's' : ''}`;
  return `${Math.round(minutes / 43200)} mois`;
}

function formatSpeed(mb: number | null): string {
  if (!mb) return '—';
  return mb >= 1000 ? `${mb / 1000} Gbps` : `${mb} Mbps`;
}

const LOYALTY_LEVELS: Record<string, { label: string; color: string }> = {
  basic:    { label: 'Basic',    color: '#94A3B8' },
  bronze:   { label: 'Bronze',   color: '#CD7F32' },
  silver:   { label: 'Silver',   color: '#C0C0C0' },
  gold:     { label: 'Gold',     color: '#FFD700' },
  platinum: { label: 'Platinum', color: '#0369A1' },
};

export function StepPlans({ plans, auth, primaryColor, onSelect }: Props) {
  const level = LOYALTY_LEVELS[auth.loyaltyLevel] ?? LOYALTY_LEVELS.basic!;

  // Forfaits par défaut si la DB est vide (mode démo)
  const displayPlans = plans.length > 0 ? plans : [
    { id: 'demo-1', name: '1 Jour', durationMin: 1440,  priceFcfa: 300,   speedDownMb: 10, speedUpMb: 5, dataLimitMb: null, maxDevices: 1, isPopular: false },
    { id: 'demo-2', name: '3 Jours', durationMin: 4320, priceFcfa: 500,   speedDownMb: 10, speedUpMb: 5, dataLimitMb: null, maxDevices: 1, isPopular: true  },
    { id: 'demo-3', name: '1 Semaine', durationMin: 10080, priceFcfa: 1000, speedDownMb: 20, speedUpMb: 10, dataLimitMb: null, maxDevices: 2, isPopular: false },
    { id: 'demo-4', name: '1 Mois', durationMin: 43200, priceFcfa: 3000,  speedDownMb: 20, speedUpMb: 10, dataLimitMb: null, maxDevices: 3, isPopular: false },
  ];

  return (
    <div className="flex flex-col gap-4 pt-4 pc-animate-slide-up">
      {/* En-tête avec niveau fidélité */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--pc-text)' }}>Choisissez votre forfait</h2>
          <p className="text-sm" style={{ color: 'var(--pc-muted)' }}>Connexion immédiate après paiement</p>
        </div>
        <div
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: `${level.color}20`, color: level.color }}
        >
          <Star size={12} fill="currentColor" />
          {level.label}
        </div>
      </div>

      {/* Points de fidélité */}
      {auth.loyaltyPts > 0 && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: `${primaryColor}10`, border: `1px solid ${primaryColor}30` }}
        >
          <Zap size={16} style={{ color: primaryColor }} />
          <p className="text-sm font-semibold" style={{ color: primaryColor }}>
            {auth.loyaltyPts} points de fidélité accumulés
          </p>
        </div>
      )}

      {/* Liste des forfaits */}
      <div className="flex flex-col gap-3">
        {displayPlans.map(plan => (
          <button
            key={plan.id}
            className="w-full text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            onClick={() => onSelect({
              id: plan.id,
              name: plan.name,
              durationMin: plan.durationMin,
              priceFcfa: plan.priceFcfa,
            })}
          >
            <div
              className="relative rounded-2xl p-4 border-2 transition-all"
              style={{
                borderColor: plan.isPopular ? primaryColor : 'var(--pc-border)',
                background: plan.isPopular ? `${primaryColor}08` : 'var(--pc-surface)',
                boxShadow: plan.isPopular ? `0 4px 16px ${primaryColor}25` : 'var(--pc-shadow-sm)',
              }}
            >
              {/* Badge populaire */}
              {plan.isPopular && (
                <div
                  className="absolute -top-3 left-4 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, #FF4D6A)` }}
                >
                  ⭐ Populaire
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} style={{ color: primaryColor }} />
                    <span className="font-black text-lg" style={{ color: 'var(--pc-text)' }}>{plan.name}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--pc-muted)' }}>
                      ({formatDuration(plan.durationMin)})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--pc-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Wifi size={12} />
                      ↓{formatSpeed(plan.speedDownMb)} ↑{formatSpeed(plan.speedUpMb)}
                    </span>
                    {plan.dataLimitMb && (
                      <span>{(plan.dataLimitMb / 1024).toFixed(1)} Go</span>
                    )}
                    {!plan.dataLimitMb && <span>Données illimitées</span>}
                    {plan.maxDevices && plan.maxDevices > 1 && (
                      <span>{plan.maxDevices} appareils</span>
                    )}
                  </div>
                </div>

                <div className="text-right ml-4">
                  <p className="text-2xl font-black" style={{ color: primaryColor }}>
                    {plan.priceFcfa.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--pc-muted)' }}>FCFA</p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
