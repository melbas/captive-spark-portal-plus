import React, { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const { user, isAdmin, loading, signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (user && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      // onAuthStateChange will handle redirect
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-[var(--shadow-card)]">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl" style={{ background: 'var(--brand-gradient)' }}>
            PC
          </div>
          <CardTitle className="text-xl font-extrabold">PremiumConnect Admin</CardTitle>
          <p className="text-sm text-muted-foreground">Connectez-vous au back-office</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@wifi-senegal.com" />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full text-white" style={{ background: 'var(--brand-gradient)' }}>
              <Lock className="h-4 w-4 mr-2" />
              {submitting ? 'Connexion…' : 'Se connecter'}
            </Button>
            {user && !isAdmin && (
              <p className="text-sm text-destructive text-center mt-2">
                Ce compte n'a pas les droits administrateur.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
      <p className="fixed bottom-4 text-xs text-muted-foreground">WIFI-Sénégal — tous droits réservés</p>
    </div>
  );
}
