import React, { useState, useEffect } from 'react';
import type { WifiPlan } from '@/types/premiumconnect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ExternalLink, Timer } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface Props {
  plan: WifiPlan;
  redirectUrl: string;
}

export default function PortalAccess({ plan, redirectUrl }: Props) {
  const { t } = useLanguage();
  const [remainingSeconds, setRemainingSeconds] = useState(plan.durationMin * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-[var(--shadow-card)] animate-fade-in">
      <CardContent className="flex flex-col items-center p-8 text-center">
        {/* Success animation */}
        <div className="h-20 w-20 rounded-full bg-status-success/10 flex items-center justify-center mb-6 animate-bounce-in">
          <CheckCircle2 className="h-12 w-12 text-status-success" />
        </div>

        <h2 className="text-2xl font-extrabold text-foreground mb-2">
          {t('accessGranted')}
        </h2>

        <p className="text-muted-foreground mb-6">
          {plan.name} — {plan.speedDownMb}/{plan.speedUpMb} Mbps
        </p>

        {/* Timer */}
        <div className="rounded-xl bg-muted p-5 w-full mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Timer className="h-5 w-5 text-brand-primary" />
            <span className="text-sm font-medium text-muted-foreground">{t('remaining')}</span>
          </div>
          <p className="text-4xl font-extrabold text-foreground font-mono tabular-nums">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
        </div>

        {/* Navigate button */}
        <Button
          onClick={() => { window.location.href = redirectUrl; }}
          className="w-full h-12 rounded-xl text-base font-semibold text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          Commencer à naviguer
        </Button>
      </CardContent>
    </Card>
  );
}
