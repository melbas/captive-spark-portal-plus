import React from 'react';
import type { PortalConfig } from '@/types/premiumconnect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface Props {
  config: PortalConfig;
  onConnect: () => void;
}

export default function PortalWelcome({ config, onConnect }: Props) {
  const { t } = useLanguage();

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-[var(--shadow-card)] animate-fade-in">
      <CardContent className="flex flex-col items-center p-8 text-center">
        {config.logoUrl ? (
          <img
            src={config.logoUrl}
            alt={config.siteName}
            className="h-16 w-auto mb-6 object-contain"
          />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center mb-6">
            <Wifi className="h-8 w-8 text-white" />
          </div>
        )}

        <h1 className="text-2xl font-extrabold text-foreground mb-2">
          {config.siteName}
        </h1>

        <p className="text-muted-foreground mb-8">
          {config.welcomeMsg}
        </p>

        <Button
          onClick={onConnect}
          className="w-full h-12 rounded-xl text-base font-semibold text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Wifi className="h-5 w-5 mr-2" />
          {t('connectToWifi')}
        </Button>
      </CardContent>
    </Card>
  );
}
