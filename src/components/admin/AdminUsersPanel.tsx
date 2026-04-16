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
import { Users, Search, Loader2, Eye, Ban, UserCheck, Mail, Calendar, Building2, Shield } from 'lucide-react';
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
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
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

  const effectiveDays = grantUseCustom ? (parseInt(grantCustom) || 0) : grantDays;

  const handleGrantAccess = async () => {
    if (!grantTarget || effectiveDays < 1) return;
    const expires = new Date();
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(profile)}>
                            <Eye className="h-4 w-4" />
                          </Button>
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>

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
              {effectiveDays > 0 && (
                <p className="text-xs text-muted-foreground">
                  Expires <span className="font-medium text-foreground">
                    {new Date(Date.now() + effectiveDays * 86400000).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                  </span>
                </p>
              )}
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
  );
}
