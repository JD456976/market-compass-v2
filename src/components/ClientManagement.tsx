import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Mail, Clock, CheckCircle2, XCircle, Copy, Users, Trash2 } from 'lucide-react';

interface Invitation {
  id: string;
  client_email: string;
  client_first_name: string | null;
  client_last_name: string | null;
  status: string;
  invite_token: string;
  created_at: string;
  accepted_at: string | null;
}

interface AgentClient {
  id: string;
  client_user_id: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export function ClientManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sending, setSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [clients, setClients] = useState<AgentClient[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setLoaded(true);
      return;
    }

    const [invRes, clientRes] = await Promise.all([
      supabase
        .from('client_invitations')
        .select('*')
        .eq('agent_user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('agent_clients')
        .select('*')
        .eq('agent_user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (invRes.data) setInvitations(invRes.data as Invitation[]);

    if (clientRes.data && clientRes.data.length > 0) {
      const clientIds = clientRes.data.map(c => c.client_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', clientIds);

      const enriched = clientRes.data.map(c => ({
        ...c,
        profile: profiles?.find(p => p.user_id === c.client_user_id) || undefined,
      }));
      setClients(enriched as AgentClient[]);
    } else {
      setClients([]);
    }

    setLoaded(true);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({ title: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    setSending(true);

    const insertData: any = {
      agent_user_id: user.id,
      client_email: trimmedEmail,
    };
    if (firstName.trim()) insertData.client_first_name = firstName.trim();
    if (lastName.trim()) insertData.client_last_name = lastName.trim();

    const { error } = await supabase
      .from('client_invitations')
      .insert(insertData)
      .select()
      .single();

    setSending(false);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'This client has already been invited', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to create invitation', description: error.message, variant: 'destructive' });
      }
      return;
    }

    setEmail('');
    setFirstName('');
    setLastName('');
    setShowInviteForm(false);
    toast({ title: 'Invitation created' });
    loadData();
  };

  const copyInviteLink = (token: string, inv: Invitation) => {
    const params = new URLSearchParams({ token });
    if (inv.client_first_name) params.set('fn', inv.client_first_name);
    if (inv.client_last_name) params.set('ln', inv.client_last_name);
    const link = `${window.location.origin}/invite?${params.toString()}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Invite link copied to clipboard' });
  };

  const revokeInvite = async (id: string) => {
    await supabase
      .from('client_invitations')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', id);
    toast({ title: 'Invitation revoked' });
    loadData();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-300"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasAnyData = clients.length > 0 || invitations.length > 0;

  return (
    <div className="space-y-6">
      {/* Empty State */}
      {loaded && !hasAnyData && !showInviteForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No current clients</p>
            <Button onClick={() => setShowInviteForm(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Your First Client
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invite Form */}
      {(showInviteForm || hasAnyData) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Client
            </CardTitle>
            <CardDescription>
              Enter the client's name and email to generate an invitation link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    type="text"
                    placeholder="Smith"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={sending}>
                  <Mail className="h-4 w-4 mr-2" />
                  {sending ? 'Sending…' : 'Send Invite'}
                </Button>
                {!hasAnyData && (
                  <Button type="button" variant="ghost" onClick={() => setShowInviteForm(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active Clients */}
      {clients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Clients
              <Badge variant="secondary" className="ml-auto">{clients.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clients.map(client => (
                <div key={client.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{client.profile?.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground">{client.profile?.email}</p>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {[inv.client_first_name, inv.client_last_name].filter(Boolean).join(' ') || inv.client_email}
                    </p>
                    {(inv.client_first_name || inv.client_last_name) && (
                      <p className="text-xs text-muted-foreground truncate">{inv.client_email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Sent {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {statusBadge(inv.status)}
                    {inv.status === 'pending' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => copyInviteLink(inv.invite_token, inv)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revokeInvite(inv.id)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
