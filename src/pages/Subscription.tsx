import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, FileText, BarChart3, Share2, Sparkles, Users, Building2,
  PenTool, User, Palette, TrendingUp, Activity, RefreshCw, ChevronRight,
  Layers, MessageSquare, Compass, CheckCircle2, AlertCircle, Clock, Eye,
  UserPlus, Mail, Copy, XCircle, Settings
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { ScenarioCompareSheet } from '@/components/ScenarioCompareSheet';
import { BuyerInputs, SellerInputs } from '@/types';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { useSessions } from '@/hooks/useSessions';
import { loadAgentProfile, AgentProfile } from '@/lib/agentProfile';
import { FREE_TIER_LIMITS } from '@/lib/featureGating';
import { formatLocation } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ReportMessages } from '@/components/report/ReportMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InviteShareDialog } from '@/components/InviteShareDialog';

interface ClientMessage {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  report_id: string;
  read_by_agent_at: string | null;
  client_name?: string;
  session_type?: string;
  share_token?: string | null;
}

interface PendingScenario {
  id: string;
  report_id: string;
  title: string | null;
  note_to_agent: string | null;
  reviewed_status: string | null;
  submitted_at: string | null;
  created_at: string;
  client_name?: string;
  scenario_payload: BuyerInputs | SellerInputs;
}

interface AnalyticsData {
  totalViews: number;
  uniqueViewers: number;
  feedbackCount: number;
  messageCount: number;
  scenarioCount: number;
  viewsByReport: { report_id: string; client_name: string; views: number }[];
}

interface ClientInvitation {
  id: string;
  client_email: string;
  client_first_name: string | null;
  client_last_name: string | null;
  status: string;
  invite_token: string;
  created_at: string;
}

interface LinkedClient {
  id: string;
  client_user_id: string;
  profile?: { full_name: string | null; email: string | null };
}

export default function Subscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { sessions } = useSessions();
  const [isRestoring, setIsRestoring] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [clientMessages, setClientMessages] = useState<ClientMessage[]>([]);
  const [pendingScenarios, setPendingScenarios] = useState<PendingScenario[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [compareScenario, setCompareScenario] = useState<PendingScenario | null>(null);
  const [messageSheetReportId, setMessageSheetReportId] = useState<string | null>(null);
  const [messageSheetClientName, setMessageSheetClientName] = useState<string>('');
  
  // Client management state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [invitations, setInvitations] = useState<ClientInvitation[]>([]);
  const [linkedClients, setLinkedClients] = useState<LinkedClient[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareClientName, setShareClientName] = useState('');
  
  const session = getBetaAccessSession();
  const hasBetaAccess = !!session;

  useEffect(() => {
    setProfile(loadAgentProfile());
  }, []);

  // Fetch client management data
  useEffect(() => {
    if (!user) return;
    const loadClients = async () => {
      const [invRes, clientRes] = await Promise.all([
        supabase.from('client_invitations').select('id, client_email, client_first_name, client_last_name, status, invite_token, created_at').eq('agent_user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('agent_clients').select('id, client_user_id').eq('agent_user_id', user.id),
      ]);
      if (invRes.data) setInvitations(invRes.data);
      if (clientRes.data && clientRes.data.length > 0) {
        const cIds = clientRes.data.map(c => c.client_user_id);
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', cIds);
        setLinkedClients(clientRes.data.map(c => ({ ...c, profile: profiles?.find(p => p.user_id === c.client_user_id) || undefined })));
      }
    };
    loadClients();
  }, [user]);

  const handleInviteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Please sign in to invite clients', variant: 'destructive' });
      return;
    }
    if (!inviteEmail.trim()) return;
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { toast({ title: 'Invalid email', variant: 'destructive' }); return; }
    setSendingInvite(true);
    const insertData: any = { agent_user_id: user.id, client_email: trimmed };
    if (inviteFirstName.trim()) insertData.client_first_name = inviteFirstName.trim();
    if (inviteLastName.trim()) insertData.client_last_name = inviteLastName.trim();
    const { error } = await supabase.from('client_invitations').insert(insertData);
    setSendingInvite(false);
    if (error) { toast({ title: error.code === '23505' ? 'Already invited' : 'Failed to invite', variant: 'destructive' }); return; }
    
    // Get the newly created invite to show share dialog
    const { data: newInv } = await supabase
      .from('client_invitations')
      .select('invite_token, client_first_name, client_last_name')
      .eq('agent_user_id', user.id)
      .eq('client_email', trimmed)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const clientDisplayName = [inviteFirstName.trim(), inviteLastName.trim()].filter(Boolean).join(' ');
    
    if (newInv) {
      const params = new URLSearchParams({ token: newInv.invite_token });
      if (newInv.client_first_name) params.set('fn', newInv.client_first_name);
      if (newInv.client_last_name) params.set('ln', newInv.client_last_name);
      const link = `${window.location.origin}/invite?${params.toString()}`;
      setShareLink(link);
      setShareClientName(clientDisplayName || trimmed);
      setShareDialogOpen(true);
    }
    
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    toast({ title: 'Invitation created' });
    const { data } = await supabase.from('client_invitations').select('id, client_email, client_first_name, client_last_name, status, invite_token, created_at').eq('agent_user_id', user.id).order('created_at', { ascending: false }).limit(10);
    if (data) setInvitations(data);
  };

  const copyInviteLink = (token: string, inv: ClientInvitation) => {
    const params = new URLSearchParams({ token });
    if (inv.client_first_name) params.set('fn', inv.client_first_name);
    if (inv.client_last_name) params.set('ln', inv.client_last_name);
    navigator.clipboard.writeText(`${window.location.origin}/invite?${params.toString()}`);
    toast({ title: 'Invite link copied' });
  };

  const revokeInvite = async (id: string) => {
    await supabase.from('client_invitations').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', id);
    toast({ title: 'Invitation revoked' });
    setInvitations(prev => prev.map(i => i.id === id ? { ...i, status: 'revoked' } : i));
  };

  // Fetch recent message threads from report_messages
  useEffect(() => {
    const fetchData = async () => {
      setLoadingMessages(true);
      
      // Fetch all recent messages (both roles) to build conversation threads
      const { data: messages } = await supabase
        .from('report_messages')
        .select('id, body, sender_id, sender_role, created_at, report_id, read_by_agent_at')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch pending scenario submissions
      const { data: scenarios } = await supabase
        .from('report_scenarios')
        .select('id, report_id, title, note_to_agent, reviewed_status, submitted_at, created_at, scenario_payload')
        .eq('submitted_to_agent', true)
        .in('reviewed_status', ['pending'])
        .order('submitted_at', { ascending: false })
        .limit(10);

      // Build per-report threads: latest message + unread count from clients
      const threadMap = new Map<string, { latestMsg: typeof messages extends (infer T)[] | null ? T : never; unreadFromClient: number }>();
      if (messages) {
        for (const m of messages) {
          const existing = threadMap.get(m.report_id);
          if (!existing) {
            threadMap.set(m.report_id, {
              latestMsg: m,
              unreadFromClient: (m.sender_role === 'client' && !m.read_by_agent_at) ? 1 : 0,
            });
          } else {
            if (m.sender_role === 'client' && !m.read_by_agent_at) {
              existing.unreadFromClient++;
            }
          }
        }
      }

      // Enrich with session info
      const allReportIds = [
        ...new Set([
          ...(Array.from(threadMap.keys())),
          ...(scenarios?.map(s => s.report_id) || []),
        ])
      ];

      if (allReportIds.length > 0) {
        const { data: relatedSessions } = await supabase
          .from('sessions')
          .select('id, client_name, session_type, share_token')
          .in('id', allReportIds);

        const sessionMap = new Map(relatedSessions?.map(s => [s.id, s]) || []);

        // Build client messages list from threads
        const threadList: ClientMessage[] = [];
        for (const [reportId, thread] of threadMap) {
          const m = thread.latestMsg;
          threadList.push({
            id: m.id,
            body: m.body,
            sender_id: m.sender_role === 'agent' ? 'You' : (m.sender_id || 'Client'),
            created_at: m.created_at,
            report_id: reportId,
            read_by_agent_at: thread.unreadFromClient > 0 ? null : 'read',
            client_name: sessionMap.get(reportId)?.client_name,
            session_type: sessionMap.get(reportId)?.session_type,
            share_token: sessionMap.get(reportId)?.share_token,
          });
        }
        setClientMessages(threadList);

        if (scenarios) {
          setPendingScenarios(scenarios.map(s => ({
            ...s,
            client_name: sessionMap.get(s.report_id)?.client_name,
            scenario_payload: s.scenario_payload as unknown as BuyerInputs | SellerInputs,
          })));
        }
      }
      setLoadingMessages(false);
    };
    fetchData();
  }, []);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      const [viewsRes, feedbackRes, msgsRes, scenariosRes] = await Promise.all([
        supabase.from('shared_report_views').select('report_id, viewer_id'),
        supabase.from('report_feedback').select('id'),
        supabase.from('report_messages').select('id'),
        supabase.from('report_scenarios').select('id'),
      ]);

      const views = viewsRes.data || [];
      const uniqueViewers = new Set(views.map(v => v.viewer_id)).size;

      // Count views per report
      const viewMap = new Map<string, number>();
      views.forEach(v => viewMap.set(v.report_id, (viewMap.get(v.report_id) || 0) + 1));

      // Map to session names
      const viewsByReport = Array.from(viewMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([report_id, viewCount]) => {
          const s = sessions.find(sess => sess.id === report_id);
          return { report_id, client_name: s?.client_name || 'Unknown', views: viewCount };
        });

      setAnalytics({
        totalViews: views.length,
        uniqueViewers,
        feedbackCount: feedbackRes.data?.length || 0,
        messageCount: msgsRes.data?.length || 0,
        scenarioCount: scenariosRes.data?.length || 0,
        viewsByReport,
      });
    };
    if (sessions.length > 0) fetchAnalytics();
  }, [sessions]);

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({ title: 'No purchases found', description: 'Subscriptions will be available after the beta period.' });
    setIsRestoring(false);
  };

  const handleScenarioAction = async (scenarioId: string, action: 'accepted' | 'needs_changes') => {
    const { error } = await supabase
      .from('report_scenarios')
      .update({ reviewed_status: action, reviewed_at: new Date().toISOString() })
      .eq('id', scenarioId);

    if (!error) {
      setPendingScenarios(prev => prev.filter(s => s.id !== scenarioId));
      toast({ title: action === 'accepted' ? 'Scenario accepted' : 'Changes requested' });
    }
  };

  // Compute stats
  const totalReports = sessions.length;
  const sharedCount = sessions.filter(s => s.share_link_created || s.pdf_exported).length;
  const buyerCount = sessions.filter(s => s.session_type === 'Buyer').length;
  const sellerCount = sessions.filter(s => s.session_type === 'Seller').length;
  const recentSessions = [...sessions].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  ).slice(0, 5);

  const thisMonth = new Date();
  const monthReports = sessions.filter(s => {
    const d = new Date(s.created_at);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  }).length;

  const unreadCount = clientMessages.filter(m => !m.read_by_agent_at).length;

  const quickActions = [
    { label: 'New Seller Report', icon: Building2, to: '/seller', color: 'text-primary' },
    { label: 'New Buyer Report', icon: Users, to: '/buyer', color: 'text-primary' },
    { label: 'Agent Profile', icon: User, to: '/agent-profile', color: 'text-accent' },
    { label: 'Market Trends', icon: TrendingUp, to: '/market-trends', color: 'text-accent' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] min-w-[44px]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-accent/20">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold">Pro Dashboard</h1>
                <p className="text-sm text-primary-foreground/70">
                  {profile?.agent_name || 'Agent'} • {profile?.brokerage_name || 'Brokerage'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] min-w-[44px]" title="Account Settings">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/my-reports?preview=admin">
                <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] min-w-[44px]" title="Preview Client Dashboard">
                  <Eye className="h-5 w-5" />
                </Button>
              </Link>
              <div className="[&_button]:text-primary-foreground/80 [&_button:hover]:text-primary-foreground">
                <NotificationBell role="agent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl -mt-4 space-y-6">
        {/* Plan Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={hasBetaAccess ? 'border-accent/30' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${hasBetaAccess ? 'bg-accent/10' : 'bg-secondary'}`}>
                  <Sparkles className={`h-6 w-6 ${hasBetaAccess ? 'text-accent' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{hasBetaAccess ? 'Beta Pro Access' : 'Free Plan'}</h3>
                    <Badge variant="secondary" className={`text-xs ${hasBetaAccess ? 'bg-accent/10 text-accent-foreground' : ''}`}>
                      {hasBetaAccess ? 'Full Access' : 'Limited'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasBetaAccess 
                      ? 'All professional features unlocked during beta.'
                      : `${FREE_TIER_LIMITS.reportsPerMonth} reports/month on the free plan.`}
                  </p>
                </div>
              </div>
              {!hasBetaAccess && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reports this month</span>
                    <span className="font-medium">{monthReports} / {FREE_TIER_LIMITS.reportsPerMonth}</span>
                  </div>
                  <Progress value={(monthReports / FREE_TIER_LIMITS.reportsPerMonth) * 100} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Usage Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Reports', value: totalReports, icon: FileText },
              { label: 'Shared', value: sharedCount, icon: Share2 },
              { label: 'Buyer Reports', value: buyerCount, icon: Users },
              { label: 'Seller Reports', value: sellerCount, icon: Building2 },
            ].map((stat, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 text-center">
                  <stat.icon className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
                  <p className="text-2xl font-serif font-bold">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, i) => (
                  <Link key={i} to={action.to}>
                    <Button variant="outline" className="w-full justify-start gap-2 min-h-[44px]">
                      <action.icon className={`h-4 w-4 ${action.color}`} />
                      <span className="text-sm">{action.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Client Management */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-accent" />
                Client Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleInviteClient} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder="First name"
                    value={inviteFirstName}
                    onChange={e => setInviteFirstName(e.target.value)}
                    className="h-10"
                  />
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={inviteLastName}
                    onChange={e => setInviteLastName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="flex-1 h-10"
                    required
                  />
                  <Button type="submit" size="sm" disabled={sendingInvite} className="min-h-[40px]">
                    <Mail className="h-4 w-4 mr-1.5" />
                    Invite
                  </Button>
                </div>
              </form>

              {linkedClients.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Active Clients</p>
                  <div className="space-y-2">
                    {linkedClients.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                        <div>
                          <p className="text-sm font-medium">{c.profile?.full_name || 'Unnamed'}</p>
                          <p className="text-[10px] text-muted-foreground">{c.profile?.email}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invitations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent Invitations</p>
                  <div className="space-y-2">
                    {invitations.slice(0, 5).map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{[inv.client_first_name, inv.client_last_name].filter(Boolean).join(' ') || inv.client_email}</p>
                          <p className="text-[10px] text-muted-foreground">{(inv.client_first_name || inv.client_last_name) ? inv.client_email + ' · ' : ''}{new Date(inv.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2">
                          {inv.status === 'pending' && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300"><Clock className="h-2.5 w-2.5 mr-1" />Pending</Badge>}
                          {inv.status === 'accepted' && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Joined</Badge>}
                          {inv.status === 'revoked' && <Badge variant="outline" className="text-[10px] text-destructive"><XCircle className="h-2.5 w-2.5 mr-1" />Revoked</Badge>}
                          {inv.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                const params = new URLSearchParams({ token: inv.invite_token });
                                if (inv.client_first_name) params.set('fn', inv.client_first_name);
                                if (inv.client_last_name) params.set('ln', inv.client_last_name);
                                const link = `${window.location.origin}/invite?${params.toString()}`;
                                setShareLink(link);
                                setShareClientName([inv.client_first_name, inv.client_last_name].filter(Boolean).join(' ') || inv.client_email);
                                setShareDialogOpen(true);
                              }}><Share2 className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => revokeInvite(inv.id)}><XCircle className="h-3 w-3" /></Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link to="/clients">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View All Clients <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {clientMessages.length > 0 && (
          <motion.div id="messages-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="border-accent/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    Conversations
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="bg-accent/10 text-accent-foreground text-[10px] ml-1">
                        {unreadCount} unread
                      </Badge>
                    )}
                  </CardTitle>
                  <Link to="/shared-reports">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View All <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {clientMessages.map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => {
                        setMessageSheetReportId(msg.report_id);
                        setMessageSheetClientName(msg.client_name || 'Client');
                      }}
                      className="block w-full text-left"
                    >
                      <div className={`flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors border ${!msg.read_by_agent_at ? 'border-accent/30 bg-accent/5' : 'border-border/50'}`}>
                        <div className="p-1.5 rounded-full bg-accent/10 shrink-0 mt-0.5">
                          <MessageSquare className="h-3.5 w-3.5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{msg.client_name || 'Report'}</span>
                            {!msg.read_by_agent_at && (
                              <Badge variant="secondary" className="bg-accent/10 text-accent-foreground text-[9px] px-1.5 py-0">
                                new
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            <span className="font-medium text-foreground/70">{msg.sender_id}: </span>
                            {msg.body}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.created_at).toLocaleDateString()} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pending Scenario Reviews */}
        {pendingScenarios.length > 0 && (
          <motion.div id="scenarios-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
            <Card className="border-accent/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Compass className="h-4 w-4 text-accent" />
                  Scenario Reviews
                  <Badge variant="secondary" className="bg-accent/10 text-accent-foreground text-[10px] ml-1">
                    {pendingScenarios.length} pending
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingScenarios.map((scenario) => (
                    <div key={scenario.id} className="p-3 rounded-lg border border-accent/20 bg-accent/5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {scenario.title || 'Untitled Scenario'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {scenario.client_name || 'Client'} • {scenario.submitted_at ? new Date(scenario.submitted_at).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      {scenario.note_to_agent && (
                        <p className="text-xs text-muted-foreground italic">"{scenario.note_to_agent}"</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[36px] text-xs"
                          onClick={() => setCompareScenario(scenario)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Compare
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[36px] text-xs"
                          onClick={() => handleScenarioAction(scenario.id, 'needs_changes')}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Needs Changes
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 min-h-[36px] text-xs"
                          onClick={() => handleScenarioAction(scenario.id, 'accepted')}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" />
                  Recent Activity
                </CardTitle>
                <Link to="/shared-reports">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No reports yet. Create your first one!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className={`p-1.5 rounded-lg ${s.session_type === 'Seller' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                        {s.session_type === 'Seller' 
                          ? <Building2 className="h-3.5 w-3.5 text-primary" /> 
                          : <Users className="h-3.5 w-3.5 text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.client_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {formatLocation(s.location)} • {s.session_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(s.share_link_created || s.pdf_exported) && (
                          <Badge variant="outline" className="text-[10px] px-1.5">Shared</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(s.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics & Engagement */}
        {analytics && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  Analytics & Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Report Views', value: analytics.totalViews },
                    { label: 'Unique Viewers', value: analytics.uniqueViewers },
                    { label: 'Client Feedback', value: analytics.feedbackCount },
                  ].map((stat, i) => (
                    <div key={i} className="text-center p-2 rounded-lg bg-secondary/30">
                      <p className="text-xl font-serif font-bold">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded-lg bg-secondary/30">
                    <p className="text-lg font-serif font-bold">{analytics.messageCount}</p>
                    <p className="text-[10px] text-muted-foreground">Messages</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-secondary/30">
                    <p className="text-lg font-serif font-bold">{analytics.scenarioCount}</p>
                    <p className="text-[10px] text-muted-foreground">Scenarios Submitted</p>
                  </div>
                </div>
                {analytics.viewsByReport.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Most Viewed Reports</p>
                    <div className="space-y-1.5">
                      {analytics.viewsByReport.map((r, i) => {
                        const session = sessions.find(sess => sess.id === r.report_id);
                        const reportRoute = session?.session_type === 'Seller' ? `/seller-report/${r.report_id}` : `/buyer-report/${r.report_id}`;
                        return (
                        <div key={r.report_id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/20">
                          <span className="truncate flex-1">{r.client_name}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-muted-foreground">{r.views} view{r.views > 1 ? 's' : ''}</span>
                            <Link to={reportRoute}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pro Features Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pro Features</CardTitle>
              <CardDescription>
                {hasBetaAccess ? 'All features unlocked with your beta access.' : 'Upgrade to unlock everything.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: FileText, label: 'Unlimited Reports' },
                  { icon: PenTool, label: 'Branded Exports' },
                  { icon: Layers, label: 'Scenario Explorer' },
                  { icon: BarChart3, label: 'AI Insights' },
                  { icon: Palette, label: 'Custom Branding' },
                  { icon: Share2, label: 'Client Hub' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                    <f.icon className="h-3.5 w-3.5 text-accent" />
                    <span className="text-xs">{f.label}</span>
                    {hasBetaAccess && <span className="text-[10px] text-accent ml-auto">✓</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Restore & Legal */}
        <div className="text-center space-y-4 pt-4">
          <Button variant="outline" size="sm" onClick={handleRestorePurchases} disabled={isRestoring}>
            {isRestoring ? (
              <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Checking...</>
            ) : (
              <><RefreshCw className="h-3 w-3 mr-1" /> Restore Purchases</>
            )}
          </Button>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
      {/* Scenario Compare Sheet */}
      {compareScenario && (
        <ScenarioCompareSheet
          open={!!compareScenario}
          onOpenChange={(open) => { if (!open) setCompareScenario(null); }}
          scenarioId={compareScenario.id}
          reportId={compareScenario.report_id}
          clientName={compareScenario.client_name}
          scenarioTitle={compareScenario.title || undefined}
          noteToAgent={compareScenario.note_to_agent || undefined}
          scenarioPayload={compareScenario.scenario_payload}
          onAction={handleScenarioAction}
        />
      )}

      {/* Message Thread Sheet */}
      <Sheet open={!!messageSheetReportId} onOpenChange={(open) => { if (!open) setMessageSheetReportId(null); }}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
          <SheetHeader className="p-4 pb-2 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-accent" />
              Messages — {messageSheetClientName}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {messageSheetReportId && (
              <ReportMessages reportId={messageSheetReportId} isAgent={true} className="border-0 shadow-none" />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <InviteShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        inviteLink={shareLink}
        clientName={shareClientName}
      />
    </div>
  );
}
