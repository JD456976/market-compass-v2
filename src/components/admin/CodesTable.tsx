import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Copy, Ban, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { BetaCode } from './AdminDashboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CodesTableProps {
  codes: BetaCode[];
  onRefresh: () => void;
}

export function CodesTable({ codes, onRefresh }: CodesTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ title: 'Copied', description: 'Code copied to clipboard.' });
  };

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('beta_access_codes')
        .update({ status: 'revoked' })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Code revoked', description: 'The access code has been revoked.' });
      onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to revoke code.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setRevokeConfirm(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('beta_access_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Code deleted', description: 'The access code has been deleted.' });
      onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete code.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  const getStatusBadge = (status: BetaCode['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'used':
        return <Badge variant="secondary">Used</Badge>;
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>;
      case 'expired':
        return <Badge variant="warning">Expired</Badge>;
    }
  };

  if (codes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No access codes yet. Generate your first code above.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Access Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Issued To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {code.code}
                      </code>
                    </TableCell>
                    <TableCell>{code.issued_to || '—'}</TableCell>
                    <TableCell>{getStatusBadge(code.status)}</TableCell>
                    <TableCell>
                      {code.expires_at ? format(new Date(code.expires_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>{format(new Date(code.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {code.used_at ? format(new Date(code.used_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {code.used_by_device_id ? (
                        <code className="text-xs text-muted-foreground">
                          {code.used_by_device_id.slice(0, 8)}...
                        </code>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {code.note || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(code.code)}
                          title="Copy code"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {code.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRevokeConfirm(code.id)}
                            disabled={actionLoading === code.id}
                            title="Revoke code"
                          >
                            {actionLoading === code.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(code.id)}
                          disabled={actionLoading === code.id}
                          title="Delete code"
                          className="text-destructive hover:text-destructive"
                        >
                          {actionLoading === code.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!revokeConfirm} onOpenChange={() => setRevokeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access Code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the code from being used. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeConfirm && handleRevoke(revokeConfirm)}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Access Code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the access code. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
