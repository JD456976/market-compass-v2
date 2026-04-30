import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Loader2, Eye, Ban, UserCheck, Mail, Calendar, Building2, Shield, Trash2, UserPlus, X } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  brokerage: string | null;
  is_suspended: boolean | null;
  beta_access_active: boolean;
  beta_access_expires_at: string | null;
  beta_access_source: string | null;
  last_active_at: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

export function AdminUsersPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [togglingBeta, setTogglingBeta] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').not('beta_access_source', 'eq', 'admin_deleted').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      setProfiles(profilesRes.data || []);
      setRoles((rolesRes.data as UserRole[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error loading users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles;
    const term = searchTerm.toLowerCase();
    return profiles.filter(p =>
      (p.full_name?.toLowerCase().includes(term)) ||
      (p.email?.toLowerCase().includes(term)) ||
      (p.brokerage?.toLowerCase().includes(term))
    );
  }, [profiles, searchTerm]);

  const getRolesForUser = (userId: string) =>
    roles.filter(r => r.user_id === userId).map(r => r.role);

  const handleSuspend = async (profile: Profile) => {
    const newSuspended = !profile.is_suspended;
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: newSuspended, suspended_at: newSuspended ? new Date().toISOString() : null })
      .eq('id', profile.id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: newSuspended ? 'User suspended' : 'User reactivated' });
      fetchData();
      setSelectedUser(null);
    }
  };

  // ── Grant duration modal state ──────────────────────────────────────────────
  const [grantTarget, setGrantTarget] = useState<Profile | null>(null);
  const [grantDays, setGrantDays] = useState(30);
  const [grantCustom, setGrantCustom] = useState('');
  const [grantUseCustom, setGrantUseCustom] = useState(false);
  const [granting, setGranting] = useState(false);

  const GRANT_OPTS = [
    { label: '7d', days: 7 }, { label: '14d', days: 14 }, { label: '30d', days: 30 },
    { label: '60d', days: 60 }, { label: '90d', days: 90 },
  ];

  const [extendFromCurrent, setExtendFromCurrent] = useState(false);
  const effectiveDays = grantUseCustom ? (parseInt(grantCustom) || 0) : grantDays;

  const handleGrantAccess = async () => {
    if (!grantTarget || effectiveDays < 1) return;
    // If extending from current expiry and user has future expiry, add days to that
    const base = extendFromCurrent && grantTarget.beta_access_active && grantTarget.beta_access_expires_at
      ? new Date(Math.max(Date.now(), new Date(grantTarget.beta_access_expires_at).getTime()))
      : new Date();
    const expires = new Date(base);
    expires.setDate(expires.getDate() + effectiveDays);
    setGranting(true);
    const { error } = await supabase.from('profiles').update({
      beta_access_active: true,
      beta_access_source: 'admin_grant',
      beta_access_expires_at: expires.toISOString(),
    }).eq('id', grantTarget.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Access granted — ${effectiveDays} days`, description: `Expires ${expires.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}` });
      fetchData();
      setGrantTarget(null);
      setSelectedUser(null);
    }
    setGranting(false);
  };

  const handleToggleBeta = async (profile: Profile) => {
    if (!profile.beta_access_active) {
      // Open grant modal instead of immediate toggle
      setGrantTarget(profile);
      setGrantDays(30);
      setGrantCustom('');
      setGrantUseCustom(false);
      setExtendFromCurrent(profile.beta_access_active && !!profile.beta_access_expires_at && new Date(profile.beta_access_expires_at) > new Date());
      return;
    }
    // Revoking
    setTogglingBeta(profile.id);
    const { error } = await supabase.from('profiles').update({
      beta_access_active: false,
      beta_access_source: 'admin_revoked',
    }).eq('id', profile.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Access revoked' });
      fetchData();
      if (selectedUser?.id === profile.id) setSelectedUser(null);
    }
    setTogglingBeta(null);
  };

  // ── Invite User ─────────────────────────────────────────────────────────────
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDays, setInviteDays] = useState(30);
  const [inviteAlsoDP, setInviteAlsoDP] = useState(true);
  const [inviting, setInviting] = useState(false);

  const handleInviteUser = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Enter a valid email address', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      // Route through Netlify serverless function (handles Supabase admin invite)
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: inviteName.trim() || undefined, days: inviteDays }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Invite failed');

      // Optionally also invite to Deal Pilot
      let dpResult = '';
      if (inviteAlsoDP) {
        try {
          const dpRes = await fetch('https://deal-pilot-app.netlify.app/api/invite-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: inviteName.trim() || undefined, days: inviteDays }),
          });
          const dpData = await dpRes.json();
          dpResult = dpData.ok ? ' + Deal Pilot ✓' : ' (Deal Pilot invite failed — try manually)';
        } catch {
          dpResult = ' (Deal Pilot invite failed — try manually)';
        }
      }

      toast({
        title: 'Invite sent',
        description: `${email} will receive a sign-in link. Access granted for ${inviteDays} days.${dpResult}`,
      });
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      fetchData();
    } catch (e: any) {
      toast({ title: 'Invite failed', description: e.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  // ── Delete User ──────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ userId: deleteTarget.user_id, profileId: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Delete failed');
      // Optimistically remove from UI immediately — don't wait for re-fetch
      setProfiles(prev => prev.filter(p => p.user_id !== deleteTarget.user_id));
      setDeleteTarget(null);
      setSelectedUser(null);
      toast({ title: 'User deleted', description: `${deleteTarget.email} has been permanently removed.` });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({profiles.length})
            </CardTitle>
            <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
              <UserPlus className="h-4 w-4" /> Invite User
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or brokerage..."
              className="pl-9 h-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Brokerage</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Beta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => {
                    const userRoles = getRolesForUser(profile.user_id);
                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.full_name || '-'}</TableCell>
                        <TableCell className="text-sm">{profile.email || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{profile.brokerage || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {userRoles.map(r => (
                              <Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={profile.beta_access_active}
                            onCheckedChange={() => handleToggleBeta(profile)}
                            disabled={togglingBeta === profile.id}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={profile.is_suspended ? 'destructive' : 'outline'} className="text-xs">
                            {profile.is_suspended ? 'Suspended' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(profile.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(profile)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(profile)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{selectedUser.full_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{selectedUser.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Brokerage:</span>
                  <span className="font-medium">{selectedUser.brokerage || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">{format(new Date(selectedUser.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={selectedUser.is_suspended ? 'destructive' : 'outline'}>
                  {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Roles:</span>
                {getRolesForUser(selectedUser.user_id).map(r => (
                  <Badge key={r} variant="secondary">{r}</Badge>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Beta Access</p>
                    {selectedUser.beta_access_active && selectedUser.beta_access_expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expires {format(new Date(selectedUser.beta_access_expires_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={selectedUser.beta_access_active}
                  onCheckedChange={() => handleToggleBeta(selectedUser)}
                  disabled={togglingBeta === selectedUser.id}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant={selectedUser.is_suspended ? 'default' : 'destructive'}
                  size="sm"
                  onClick={() => handleSuspend(selectedUser)}
                >
                  {selectedUser.is_suspended ? (
                    <><UserCheck className="h-4 w-4 mr-1" /> Reactivate</>
                  ) : (
                    <><Ban className="h-4 w-4 mr-1" /> Suspend</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive ml-auto"
                  onClick={() => { setDeleteTarget(selectedUser); setSelectedUser(null); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Grant Duration Modal */}
      {grantTarget && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Grant Beta Access</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">{grantTarget.email}</p>
              </div>
              <button onClick={() => setGrantTarget(null)} className="text-muted-foreground hover:text-foreground p-0.5">
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Access Duration</p>
              <div className="grid grid-cols-5 gap-1.5">
                {GRANT_OPTS.map(o => (
                  <button key={o.days} onClick={() => { setGrantDays(o.days); setGrantUseCustom(false); }}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${!grantUseCustom && grantDays === o.days ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setGrantUseCustom(true)}
                className={`w-full py-2 rounded-lg text-xs font-semibold border transition-colors ${grantUseCustom ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                Custom
              </button>
              {grantUseCustom && (
                <div className="flex items-center gap-2">
                  <Input type="number" min="1" max="365" value={grantCustom}
                    onChange={e => setGrantCustom(e.target.value.replace(/\D/g, ''))}
                    placeholder="Days" className="w-24 bg-muted/30 text-sm" autoFocus />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              )}
              {/* Extend-from-current toggle — only show if user already has future access */}
              {grantTarget.beta_access_active && grantTarget.beta_access_expires_at && new Date(grantTarget.beta_access_expires_at) > new Date() && (
                <button
                  onClick={() => setExtendFromCurrent(v => !v)}
                  className={`w-full py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-between px-3 ${extendFromCurrent ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  <span>Extend from current expiry</span>
                  <span className="font-mono text-[10px]">{new Date(grantTarget.beta_access_expires_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                </button>
              )}
              {effectiveDays > 0 && (() => {
                const base = extendFromCurrent && grantTarget.beta_access_active && grantTarget.beta_access_expires_at && new Date(grantTarget.beta_access_expires_at) > new Date()
                  ? new Date(grantTarget.beta_access_expires_at)
                  : new Date();
                const newExpiry = new Date(base);
                newExpiry.setDate(newExpiry.getDate() + effectiveDays);
                return (
                  <p className="text-xs text-muted-foreground">
                    New expiry <span className="font-medium text-foreground">
                      {newExpiry.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                    </span>
                  </p>
                );
              })()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGrantTarget(null)} className="flex-1" disabled={granting}>Cancel</Button>
              <Button onClick={handleGrantAccess} className="flex-1" disabled={granting || effectiveDays < 1}>
                {granting ? 'Saving…' : 'Grant Access'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Invite User Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Invite User</h3>
                <p className="text-xs text-muted-foreground mt-0.5">They'll receive a sign-in link via email.</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email Address *</label>
                <Input
                  type="email"
                  placeholder="tester@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Name <span className="normal-case text-muted-foreground/60">(optional)</span></label>
                <Input
                  placeholder="First Last or Company"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInviteUser()}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Access Duration</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[7, 14, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => setInviteDays(d)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${inviteDays === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Access expires <span className="font-medium text-foreground">
                  {new Date(Date.now() + inviteDays * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </p>
              {/* Deal Pilot cross-invite */}
              <button
                onClick={() => setInviteAlsoDP(v => !v)}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-between ${inviteAlsoDP ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-400' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                <span>Also invite to Deal Pilot</span>
                <span className={`h-4 w-4 rounded border-2 flex items-center justify-center ${inviteAlsoDP ? 'bg-blue-500 border-blue-500' : 'border-muted-foreground'}`}>
                  {inviteAlsoDP && <span className="text-white text-[10px] leading-none">✓</span>}
                </span>
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowInvite(false)} className="flex-1" disabled={inviting}>Cancel</Button>
              <Button onClick={handleInviteUser} className="flex-1 gap-1.5" disabled={inviting || !inviteEmail.trim()}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {inviting ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-destructive/30 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Delete User Permanently</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This removes <span className="font-medium text-foreground">{deleteTarget.email}</span> from all systems. They will lose all access immediately. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1" disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteUser} className="flex-1 gap-1.5" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Deleting…' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
