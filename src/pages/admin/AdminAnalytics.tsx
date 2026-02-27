import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">MRR — Monthly Recurring Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Graphique en cours d'intégration…</p></CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">ARPU — Revenu moyen par utilisateur</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Graphique en cours d'intégration…</p></CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Churn Rate mensuel</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Graphique en cours d'intégration…</p></CardContent>
        </Card>
        <Card className="rounded-2xl shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Répartition méthodes de paiement</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Graphique en cours d'intégration…</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
