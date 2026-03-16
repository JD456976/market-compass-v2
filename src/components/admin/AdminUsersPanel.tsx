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

  const handleToggleBeta = async (profile: Profile) => {
    const newActive = !profile.beta_access_active;
    setTogglingBeta(profile.id);
    
    const updateData: Record<string, any> = {
      beta_access_active: newActive,
      beta_access_source: newActive ? 'admin_grant' : profile.beta_access_source,
    };

    // When granting, set a 30-day expiry if none exists
    if (newActive && !profile.beta_access_expires_at) {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      updateData.beta_access_expires_at = expires.toISOString();
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: newActive ? 'Beta access granted' : 'Beta access revoked' });
      fetchData();
      if (selectedUser?.id === profile.id) {
        setSelectedUser({ ...profile, beta_access_active: newActive });
      }
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
  );
}
