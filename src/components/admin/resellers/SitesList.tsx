/**
 * Liste des sites rattachés à un revendeur, avec le revenu agrégé par site
 * (somme de transactions.amount_fcfa par site). Réutilise RevenueStats-like
 * agrégation côté client ; props pures pour testabilité.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface SiteWithRevenue {
  id: string;
  name: string;
  portal_slug: string;
  location: string | null;
  is_active: boolean | null;
  revenue: number;
}

interface SitesListProps {
  sites: SiteWithRevenue[];
}

export default function SitesList({ sites }: SitesListProps) {
  return (
    <Card className="rounded-2xl shadow-[var(--shadow-card)]">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Revenus</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Aucun site rattaché
                </TableCell>
              </TableRow>
            ) : (
              sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link to={`/admin/sites/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.location || '—'}</TableCell>
                  <TableCell className="font-semibold">{s.revenue.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell>{s.is_active ? 'Actif' : 'Inactif'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
