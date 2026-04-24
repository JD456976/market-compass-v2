/**
 * AdminBetaCodesPanel — full beta code management for admin dashboard.
 * Replaces the old IssueCodePanel + BetaCodesTable with a comprehensive UI.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, Ban, Copy, Check, RefreshCw, Download, Search,
  KeyRound, Users, Clock, CheckCircle2, XCircle, History,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BetaAccessCode {
  id: string;
  code: string;
  issued_to: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  expires_at: string | null;
  max_uses: number;
  uses_count: number;
  revoked_at: string | null;
  redemptions: Array<{ user_id: string; redeemed_at: string }>;
}

type CodeStatus = 'active' | 'used' | 'revoked' | 'expired' | 'partial';

function getStatus(code: BetaAccessCode): CodeStatus {
  if (code.revoked_at) return 'revoked';
  if (code.expires_at && new Date(code.expires_at) < new Date()) return 'expired';
  if (code.uses_count >= code.max_uses) return 'used';
  if (code.uses_count > 0) return 'partial';
  return 'active';
}

const STATUS_BADGE: Record<CodeStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active:   { label: 'Active',   variant: 'default' },
  partial:  { label: 'Partial',  variant: 'secondary' },
  used:     { label: 'Used',     variant: 'secondary' },
  revoked:  { label: 'Revoked',  variant: 'destructive' },
  expired:  { label: 'Expired',  variant: 'outline' },
};

// Generate human-friendly code like MC-A3F9K2
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 6; i++) body += chars[Math.floor(Math.random() * chars.length)];
  return `MC-${body}`;
}

function calcExpiresAt(option: string): string | null {
  if (option === 'none') return null;
  const d = new Date();
  if (option === '7d')   { d.setDate(d.getDate() + 7);   return d.toISOString(); }
  if (option === '14d')  { d.setDate(d.getDate() + 14);  return d.toISOString(); }
  if (option === '30d')  { d.setDate(d.getDate() + 30);  return d.toISOString(); }
  if (option === '90d')  { d.setDate(d.getDate() + 90);  return d.toISOString(); }
  return null;
}

export function AdminBetaCodesPanel() {
  const [codes, setCodes] = useState<BetaAccessCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const { toast } = useToast();

  // Create form state
  const [form, setForm] = useState({
    code: generateCode(),
    issuedTo: '',
    email: '',
    notes: '',
    expiration: '30d', // default 30 days — change here to alter default
    maxUses: '1',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_beta_access_codes');
      if (error) throw error;
      setCodes((data as any[]) ?? []);
    } catch (err: any) {
      toast({ title: 'Failed to load codes', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.issuedTo.trim() || !form.code.trim() || !form.email.trim()) {
      toast({ title: 'Missing fields', description: 'Code, Issued To, and Email are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_beta_access_code', {
        p_code: form.code.trim().toUpperCase(),
        p_issued_to: form.issuedTo.trim(),
        p_email: form.email.trim() || null,
        p_notes: form.notes.trim() || null,
        p_expires_at: calcExpiresAt(form.expiration),
        p_max_uses: parseInt(form.maxUses, 10) || 1,
      });

      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? 'Unknown error');

      setJustCreated(form.code.trim().toUpperCase());
      setForm(f => ({ ...f, code: generateCode(), issuedTo: '', email: '', notes: '', expiration: '30d', maxUses: '1' }));
      fetchCodes();
    } catch (err: any) {
      toast({ title: 'Failed to create code', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      const { data, error } = await supabase.rpc('revoke_beta_access_code', { p_code_id: id });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error);
      toast({ title: 'Code revoked' });
      fetchCodes();
    } catch (err: any) {
      toast({ title: 'Failed to revoke', description: err.message, variant: 'destructive' });
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportCSV = () => {
    const header = 'Code,Issued To,Email,Created,Expires,Max Uses,Uses,Status,Notes';
    const rows = filtered.map(c => [
      c.code, c.issued_to, c.email ?? '',
      format(parseISO(c.created_at), 'yyyy-MM-dd'),
      c.expires_at ? format(parseISO(c.expires_at), 'yyyy-MM-dd') : 'Never',
      c.max_uses, c.uses_count, getStatus(c), c.notes ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'beta-codes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = codes.filter(c => {
    const q = search.toLowerCase();
    return !q || c.code.toLowerCase().includes(q) || c.issued_to.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q);
  });

  const stats = {
    active: codes.filter(c => getStatus(c) === 'active').length,
    used: codes.filter(c => ['used', 'partial'].includes(getStatus(c))).length,
    revoked: codes.filter(c => getStatus(c) === 'revoked').length,
    expired: codes.filter(c => getStatus(c) === 'expired').length,
    totalRedemptions: codes.reduce((sum, c) => sum + c.uses_count, 0),
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: CheckCircle2, label: 'Active', value: stats.active, color: 'text-emerald-600' },
          { icon: Users, label: 'Used', value: stats.used, color: 'text-blue-600' },
          { icon: Ban, label: 'Revoked', value: stats.revoked, color: 'text-destructive' },
          { icon: Clock, label: 'Expired', value: stats.expired, color: 'text-muted-foreground' },
          { icon: History, label: 'Redemptions', value: stats.totalRedemptions, color: 'text-primary' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color} shrink-0`} />
                <div>
                  <p className="text-xl font-semibold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search codes, names, emails…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setShowCreate(v => !v); setJustCreated(null); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Issue Code
        </Button>
        <Button variant="outline" size="sm" onClick={fetchCodes} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Issue New Beta Code
            </CardTitle>
            <CardDescription>Default expiration is 30 days — change in IssueCodePanel or below.</CardDescription>
          </CardHeader>
          <CardContent>
            {justCreated ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Share this code — shown once only</p>
                  <p className="text-2xl font-mono font-bold tracking-widest select-all">{justCreated}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleCopy(justCreated)} variant="outline" className="flex-1">
                    {copied === justCreated ? <><Check className="h-4 w-4 mr-1" />Copied!</> : <><Copy className="h-4 w-4 mr-1" />Copy</>}
                  </Button>
                  <Button onClick={() => setJustCreated(null)} className="flex-1">Issue Another</Button>
                </div>
                <p className="text-xs text-destructive text-center font-medium">⚠️ This code won't be shown again.</p>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="bc-code">Code</Label>
                    <div className="flex gap-2">
                      <Input id="bc-code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="font-mono" required />
                      <Button type="button" variant="outline" size="icon" onClick={() => setForm(f => ({ ...f, code: generateCode() }))} title="Regenerate">↻</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bc-issued">Issued To *</Label>
                    <Input id="bc-issued" placeholder="Name or Company" value={form.issuedTo} onChange={e => setForm(f => ({ ...f, issuedTo: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bc-email">Email Address *</Label>
                    <Input id="bc-email" type="email" placeholder="name@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bc-exp">Expiration</Label>
                    <Select value={form.expiration} onValueChange={v => setForm(f => ({ ...f, expiration: v }))}>
                      <SelectTrigger id="bc-exp"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">7 days</SelectItem>
                        <SelectItem value="14d">14 days</SelectItem>
                        <SelectItem value="30d">30 days (default)</SelectItem>
                        <SelectItem value="90d">90 days</SelectItem>
                        <SelectItem value="none">No expiration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bc-max">Max Uses</Label>
                    <Input id="bc-max" type="number" min="1" max="100" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bc-notes">Notes (internal)</Label>
                    <Input id="bc-notes" placeholder="Optional internal note" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={isCreating} className="flex-1">
                    {isCreating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Creating…</> : 'Generate Code'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Codes Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Issued Codes ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No codes found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Issued To</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(code => {
                    const status = getStatus(code);
                    const { label, variant } = STATUS_BADGE[status];
                    return (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1">
                            {code.code}
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(code.code)}>
                              {copied === code.code ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{code.issued_to}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{code.email ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {code.expires_at ? format(parseISO(code.expires_at), 'MMM d, yyyy') : 'Never'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {code.uses_count}/{code.max_uses}
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant}>{label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {status === 'active' || status === 'partial' ? (
                            <Button
                              variant="ghost" size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRevoke(code.id)}
                              disabled={revoking === code.id}
                            >
                              {revoking === code.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ban className="h-3 w-3 mr-1" />Revoke</>}
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redemption History */}
      {codes.some(c => c.uses_count > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Redemption History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Issued To</TableHead>
                    <TableHead>Redeemed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.flatMap(c =>
                    c.redemptions.map((r, i) => (
                      <TableRow key={`${c.id}-${i}`}>
                        <TableCell className="font-mono text-sm">{c.code}</TableCell>
                        <TableCell className="text-sm">{c.issued_to}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(r.redeemed_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
