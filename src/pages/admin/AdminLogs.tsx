import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('pc_audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Logs d'audit</h1>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : (logs || []).length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun log</TableCell></TableRow>
              ) : (logs || []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.action}</TableCell>
                  <TableCell className="text-sm">{l.entity_type || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{l.ip_address || '—'}</TableCell>
                  <TableCell className="text-sm">{l.created_at ? formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: fr }) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
