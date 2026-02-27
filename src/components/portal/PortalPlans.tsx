import React from 'react';
import type { WifiPlan } from '@/types/premiumconnect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wifi, Clock, Users, Zap } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface Props {
  plans: WifiPlan[];
  onSelect: (planId: string) => void;
  onBack: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}j`;
}

export default function PortalPlans({ plans, onSelect, onBack }: Props) {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold text-foreground">{t('selectedPackage') || 'Choisir un forfait'}</h2>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`rounded-2xl shadow-[var(--shadow-card)] cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
              plan.isPopular ? 'ring-2 ring-brand-primary' : ''
            }`}
            onClick={() => onSelect(plan.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    {plan.isPopular && (
                      <Badge className="bg-brand-primary text-white text-xs">{t('mostPopular')}</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(plan.durationMin)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      {plan.speedDownMb}/{plan.speedUpMb} Mbps
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {plan.maxDevices}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-extrabold text-brand-primary">
                    {plan.priceFcfa.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs text-muted-foreground">FCFA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun forfait disponible pour ce site.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
