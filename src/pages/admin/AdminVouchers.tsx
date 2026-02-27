import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminVouchers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ batch_name: '', count: '10' });

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ['admin-vouchers'],
    queryFn: async () => {
      const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const count = Math.min(parseInt(form.count) || 10, 100);
      const codes = Array.from({ length: count }, () => ({
        code: genCode(),
        batch_name: form.batch_name || null,
        profile_id: '00000000-0000-0000-0000-000000000000',
        valid_to: new Date(Date.now() + 90 * 86400000).toISOString(),
      }));
      const { error } = await supabase.from('vouchers').insert(codes);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      setOpen(false);
      setForm({ batch_name: '', count: '10' });
      toast.success('Vouchers générés');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Vouchers</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: 'var(--brand-gradient)' }} className="text-white"><Plus className="h-4 w-4 mr-2" />Générer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Générer des vouchers</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom du batch</Label><Input value={form.batch_name} onChange={e => setForm(f => ({ ...f, batch_name: e.target.value }))} placeholder="Promo Février" /></div>
              <div><Label>Nombre (max 100)</Label><Input type="number" value={form.count} onChange={e => setForm(f => ({ ...f, count: e.target.value }))} /></div>
              <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="w-full" style={{ background: 'var(--brand-gradient)' }}>
                {generate.isPending ? 'Génération…' : 'Générer les vouchers'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Utilisé</TableHead>
                <TableHead>Expiration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : (vouchers || []).length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun voucher</TableCell></TableRow>
              ) : (vouchers || []).map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-semibold tracking-wider">{v.code}</TableCell>
                  <TableCell>{v.batch_name || '—'}</TableCell>
                  <TableCell><Badge variant={v.is_used ? 'secondary' : 'default'}>{v.is_used ? 'Utilisé' : 'Disponible'}</Badge></TableCell>
                  <TableCell className="text-sm">{v.expires_at ? new Date(v.expires_at).toLocaleDateString('fr-FR') : v.valid_to ? new Date(v.valid_to).toLocaleDateString('fr-FR') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
