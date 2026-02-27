import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AdminVouchers() {
  const { data: vouchers, isLoading } = useQuery({
    queryKey: ['admin-vouchers'],
    queryFn: async () => {
      const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Vouchers</h1>
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
                  <TableCell className="text-sm">{v.expires_at ? new Date(v.expires_at).toLocaleDateString('fr-FR') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
