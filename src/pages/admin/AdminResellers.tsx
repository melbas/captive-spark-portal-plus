import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentSite } from '@/context/SiteContext';
import { exportCSV } from '@/lib/report/exportCSV';
import HelpTip from '@/components/admin/HelpTip';

interface ResellerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_rate: number | null;
  is_active: boolean | null;
}

export default function AdminResellers() {
  const qc = useQueryClient();
  const { role, canEdit } = useCurrentSite();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', commission_rate: '15' });

  // Les revendeurs ne sont pas scopés par site : c'est un niveau de tenant
  // au-dessus (un revendeur possède plusieurs sites). Réservé super_admin ;
  // un reseller ne voit que sa propre ligne via la RLS backend.
  const { data: resellers, isLoading } = useQuery({
    queryKey: ['admin-resellers'],
    queryFn: async () => {
      const { data } = await supabase.from('resellers').select('*').order('created_at', { ascending: false });
      return (data || []) as ResellerRow[];
    },
  });

  // Sites par revendeur (FK sites.reseller_id) + transactions par site →
  // totaux revenus agrégés côté client.
  const { data: sites } = useQuery({
    queryKey: ['admin-reseller-sites'],
    queryFn: async () => {
      const { data } = await supabase.from('sites').select('id, reseller_id, name, portal_slug, location, is_active');
      return data || [];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ['admin-reseller-transactions'],
    queryFn: async () => {
      const { data } = await supabase.from('transactions').select('site_id, amount_fcfa, commission_fcfa');
      return data || [];
    },
  });

  const { revenueByReseller, sitesByReseller, transactionsBySite } = useMemo(() => {
    const amountBySite = new Map<string, number>();
    const txBySite = new Map<string, number>();
    for (const t of transactions || []) {
      if (!t.site_id) continue;
      amountBySite.set(t.site_id, (amountBySite.get(t.site_id) || 0) + (t.amount_fcfa || 0));
      txBySite.set(t.site_id, (txBySite.get(t.site_id) || 0) + 1);
    }
    const revenueByReseller = new Map<string, number>();
    const sitesByReseller = new Map<string, number>();
    const transactionsBySite = new Map<string, { amount: number; count: number }>();
    for (const s of sites || []) {
      if (!s.reseller_id) continue;
      sitesByReseller.set(s.reseller_id, (sitesByReseller.get(s.reseller_id) || 0) + 1);
      const amount = amountBySite.get(s.id) || 0;
      revenueByReseller.set(s.reseller_id, (revenueByReseller.get(s.reseller_id) || 0) + amount);
      if (amountBySite.has(s.id)) {
        transactionsBySite.set(s.id, { amount, count: txBySite.get(s.id) || 0 });
      }
    }
    return { revenueByReseller, sitesByReseller, transactionsBySite };
  }, [sites, transactions]);

  const rowsForExport = useMemo(
    () =>
      (resellers || []).map((r) => ({
        nom: r.name,
        email: r.email || '',
        telephone: r.phone || '',
        commission: `${r.commission_rate ?? 0}%`,
        nb_sites: sitesByReseller.get(r.id) || 0,
        revenus_fcfa: revenueByReseller.get(r.id) || 0,
        statut: r.is_active ? 'Actif' : 'Inactif',
      })),
    [resellers, revenueByReseller, sitesByReseller],
  );

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('resellers').insert({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        commission_rate: parseFloat(form.commission_rate) || 15,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resellers'] });
      setOpen(false);
      setForm({ name: '', email: '', phone: '', commission_rate: '15' });
      toast.success('Revendeur créé');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">Revendeurs</h1>
          {role === 'reseller' && (
            <span className="text-sm text-muted-foreground">Votre compte revendeur</span>
          )}
          {!canEdit && (
            <span className="text-sm text-muted-foreground">Lecture seule pour votre rôle.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportCSV(rowsForExport, 'revendeurs')} disabled={rowsForExport.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
          {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button style={{ background: 'var(--brand-gradient)' }} className="text-white"><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau revendeur</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+221 XX XXX XX XX" /></div>
              <div><Label>Commission (%)</Label><Input type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} /></div>
              <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending} className="w-full" style={{ background: 'var(--brand-gradient)' }}>
                {create.isPending ? 'Création…' : 'Créer le revendeur'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
        </div>
      </div>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Nb sites</TableHead>
                <TableHead>Revenus</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : (resellers || []).length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun revendeur</TableCell></TableRow>
              ) : (resellers || []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link to={`/admin/resellers/${r.id}`} className="hover:underline">{r.name}</Link>
                  </TableCell>
                  <TableCell>{r.email || '—'}</TableCell>
                  <TableCell>{r.phone || '—'}</TableCell>
                  <TableCell>{r.commission_rate}%</TableCell>
                  <TableCell>{sitesByReseller.get(r.id) || 0}</TableCell>
                  <TableCell className="font-semibold">{(revenueByReseller.get(r.id) || 0).toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Actif' : 'Inactif'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
