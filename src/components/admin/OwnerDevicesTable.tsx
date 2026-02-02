import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Ban, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

export interface OwnerDevice {
  id: string;
  device_id: string;
  admin_email: string;
  created_at: string;
  revoked_at: string | null;
}

interface OwnerDevicesTableProps {
  devices: OwnerDevice[];
  onRefresh: () => void;
}

export function OwnerDevicesTable({ devices, onRefresh }: OwnerDevicesTableProps) {
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRevoke = async (deviceId: string) => {
    setIsRevoking(deviceId);
    try {
      const { data, error } = await supabase.rpc('revoke_owner_device', {
        p_device_id: deviceId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        toast({
          title: 'Device revoked',
          description: 'Owner device access has been revoked.',
        });
        onRefresh();
      } else {
        throw new Error(result.error || 'Failed to revoke device');
      }
    } catch (error) {
      console.error('Revoke error:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke device.',
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(null);
    }
  };

  const shortenDeviceId = (id: string) => {
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Owner Devices
        </CardTitle>
        <CardDescription>
          Devices with automatic admin access bypass
        </CardDescription>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No owner devices registered yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device ID</TableHead>
                <TableHead>Admin Email</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-xs">
                    {shortenDeviceId(device.device_id)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {device.admin_email}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(device.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {device.revoked_at ? (
                      <Badge variant="destructive" className="text-xs">Revoked</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!device.revoked_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(device.device_id)}
                        disabled={isRevoking === device.device_id}
                        className="h-8 px-2 text-destructive hover:text-destructive"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
