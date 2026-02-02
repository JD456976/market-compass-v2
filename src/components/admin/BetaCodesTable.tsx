import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ban, Copy, KeyRound } from 'lucide-react';
import { format } from 'date-fns';

export interface BetaCode {
  id: string;
  email: string;
  issued_to: string | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  used_at: string | null;
  created_by_admin_email: string;
}

interface BetaCodesTableProps {
  codes: BetaCode[];
  onRefresh: () => void;
}

type CodeStatus = 'active' | 'used' | 'revoked' | 'expired';

function getCodeStatus(code: BetaCode): CodeStatus {
  if (code.revoked_at) return 'revoked';
  if (code.used_at) return 'used';
  if (code.expires_at && new Date(code.expires_at) < new Date()) return 'expired';
  return 'active';
}

function StatusBadge({ status }: { status: CodeStatus }) {
  const variants: Record<CodeStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    active: { variant: 'default', label: 'Active' },
    used: { variant: 'secondary', label: 'Used' },
    revoked: { variant: 'destructive', label: 'Revoked' },
    expired: { variant: 'outline', label: 'Expired' },
  };
  
  const { variant, label } = variants[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function BetaCodesTable({ codes, onRefresh }: BetaCodesTableProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRevoke = async (codeId: string) => {
    setRevokingId(codeId);
    
    try {
      const { error } = await supabase
        .from('beta_codes')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', codeId);

      if (error) {
        toast({
          title: 'Failed to revoke',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Code revoked',
        description: 'The access code has been revoked.',
      });
      
      onRefresh();
    } catch (err) {
      console.error('Revoke error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast({
        title: 'Copied',
        description: 'Email copied to clipboard.',
      });
    } catch (err) {
      // Fallback for mobile
    }
  };

  if (codes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Issued Codes
          </CardTitle>
          <CardDescription>No codes have been issued yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Issued Codes ({codes.length})
        </CardTitle>
        <CardDescription>All beta access codes issued by administrators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Issued To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => {
                const status = getCodeStatus(code);
                return (
                  <TableRow key={code.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[200px]">{code.email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleCopyEmail(code.email)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{code.issued_to || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(code.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {code.expires_at 
                        ? format(new Date(code.expires_at), 'MMM d, yyyy')
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(code.id)}
                          disabled={revokingId === code.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {revokingId === code.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-1" />
                              Revoke
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
