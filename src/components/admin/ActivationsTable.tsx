import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Smartphone } from 'lucide-react';
import { format } from 'date-fns';

export interface BetaActivation {
  id: string;
  email: string;
  activated_at: string;
  device_id: string;
  activation_source: string;
  code_id: string | null;
}

interface ActivationsTableProps {
  activations: BetaActivation[];
}

export function ActivationsTable({ activations }: ActivationsTableProps) {
  if (activations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Activations
          </CardTitle>
          <CardDescription>No activations yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Activations ({activations.length})
        </CardTitle>
        <CardDescription>All devices that have been granted access</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Device ID</TableHead>
                <TableHead>Activated At</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activations.map((activation) => (
                <TableRow key={activation.id}>
                  <TableCell className="font-medium">
                    <span className="truncate max-w-[200px] inline-block">
                      {activation.email}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {activation.device_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(activation.activated_at), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={activation.activation_source === 'admin_bypass' ? 'secondary' : 'outline'}>
                      {activation.activation_source === 'admin_bypass' ? 'Admin' : 'Code'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
