import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Paramètres</h1>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">Configuration globale</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Paramètres en cours de développement…</p></CardContent>
      </Card>
    </div>
  );
}
