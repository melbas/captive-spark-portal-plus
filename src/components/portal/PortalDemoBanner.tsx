import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function PortalDemoBanner() {
  return (
    <div className="bg-status-warning text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <AlertTriangle className="h-4 w-4" />
      MODE DÉMO — Session non connectée au réseau
    </div>
  );
}
