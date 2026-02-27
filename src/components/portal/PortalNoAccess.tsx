import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { WifiOff } from 'lucide-react';

export default function PortalNoAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light px-4">
      <Card className="w-full max-w-md rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <WifiOff className="h-16 w-16 text-status-error mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Accès WiFi requis</h2>
          <p className="text-muted-foreground">
            Connectez-vous au réseau WiFi de l'établissement pour accéder à ce portail.
          </p>
        </CardContent>
      </Card>
      <footer className="fixed bottom-4 text-center text-sm text-muted-foreground w-full">
        WIFI-Sénégal — tous droits réservés
      </footer>
    </div>
  );
}
