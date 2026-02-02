import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Ban, RotateCcw, Loader2, Check, X, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { BetaDevice } from './AdminDashboard';
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

interface DevicesTableProps {
  devices: BetaDevice[];
  onRefresh: () => void;
}

export function DevicesTable({ devices, onRefresh }: DevicesTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const { toast } = useToast();

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('beta_authorized_devices')
        .update({ is_revoked: true, revoked_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Device revoked', description: 'The device access has been revoked.' });
      onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to revoke device.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setRevokeConfirm(null);
    }
  };

  const handleReinstate = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('beta_authorized_devices')
        .update({ is_revoked: false, revoked_at: null })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Device reinstated', description: 'The device access has been restored.' });
      onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reinstate device.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLabelEdit = (device: BetaDevice) => {
    setEditingLabel(device.id);
    setNewLabel(device.label || '');
  };

  const handleLabelSave = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('beta_authorized_devices')
        .update({ label: newLabel.trim() || null })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Label updated' });
      onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update label.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setEditingLabel(null);
    }
  };

  if (devices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No authorized devices yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Authorized Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Issued To</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Via Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      {editingLabel === device.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            className="h-8 w-32"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleLabelSave(device.id)}
                            disabled={actionLoading === device.id}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingLabel(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{device.label || '—'}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleLabelEdit(device)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{device.code?.issued_to || '—'}</TableCell>
                    <TableCell>
                      {format(new Date(device.activated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {device.code?.code ? (
                        <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                          {device.code.code}
                        </code>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {device.is_revoked ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {device.is_revoked ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReinstate(device.id)}
                            disabled={actionLoading === device.id}
                            title="Reinstate device"
                          >
                            {actionLoading === device.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRevokeConfirm(device.id)}
                            disabled={actionLoading === device.id}
                            title="Revoke device"
                          >
                            {actionLoading === device.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                        )}
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
            <AlertDialogTitle>Revoke Device Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately block this device from accessing the app. You can reinstate access later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeConfirm && handleRevoke(revokeConfirm)}>
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
