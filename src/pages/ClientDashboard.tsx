import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, MessageSquare, Layers, Clock, ExternalLink, GitCompare, LogOut, Info } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { Checkbox } from '@/components/ui/checkbox';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { EmptyClientReports } from '@/components/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NotificationPrePrompt } from '@/components/NotificationPrePrompt';
import { ClientOnboarding, ClientOnboardingTrigger } from '@/components/ClientOnboarding';
import { motion } from 'framer-motion';

interface ClientReport {
  report_id: string;
  share_token: string;
  client_name: string;
  session_type: string;
  location: string;
  last_viewed: string;
  unread_messages: number;
  scenario_count: number;
  pending_reviews: number;
}

export default function ClientDashboard() {
  const [reports, setReports] = useState<ClientReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clientName, setClientName] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const claimSessionId = searchParams.get('claim') || '';
  const { user, signOut } = useAuth();
  const { isClient } = useUserRole();

  const viewerId = user?.id || localStorage.getItem('mc_viewer_id') || '';

  // Claim shared report on mount if claim param exists
  useEffect(() => {
    if (!user || !claimSessionId) return;
    const claimAndRefresh = async () => {
      try {
        await supabase.rpc('claim_shared_reports', {
          p_user_id: user.id,
          p_email: user.email || '',
          p_session_id: claimSessionId,
        });
        fetchAllClientReports();
      } catch (err) {
        console.error('Failed to claim report:', err);
      }
    };
    claimAndRefresh();
  }, [user, claimSessionId]);

  // Fetch client name from profile
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('full_name').eq('user_id', user.id).single().then(({ data }) => {
      if (data?.full_name) setClientName(data.full_name);
    });
  }, [user]);

  const reportIds = useMemo(() => reports.map(r => r.report_id), [reports]);
  const { showPrePrompt, confirmPermission, dismissPrePrompt } = usePushNotifications('client', reportIds);

  useEffect(() => {
    if (user) {
      fetchAllClientReports();
    } else {
      setLoading(false);
    }
  }, [user, isClient]);

  const fetchAllClientReports = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch via agent_clients links (invitation-based)
      const { data: agentLinks } = await supabase
        .from('agent_clients')
        .select('agent_user_id')
        .eq('client_user_id', user.id);

      const agentIds = agentLinks?.map(l => l.agent_user_id) || [];

      // Fetch sessions linked via agent_clients
      let agentSessions: any[] = [];
      if (agentIds.length > 0) {
        const { data } = await supabase
          .from('sessions')
          .select('id, client_name, session_type, location, share_token, updated_at')
          .in('owner_user_id', agentIds)
          .eq('share_link_created', true)
          .eq('share_token_revoked', false);
        agentSessions = data || [];
      }

      // Also fetch sessions claimed directly by this user
      const { data: claimedSessions } = await supabase
        .from('sessions')
        .select('id, client_name, session_type, location, share_token, updated_at')
        .eq('claimed_by_user_id', user.id)
        .eq('share_link_created', true)
        .eq('share_token_revoked', false);

      // Merge and deduplicate
      const allSessions = new Map<string, any>();
      for (const s of [...agentSessions, ...(claimedSessions || [])]) {
        if (!allSessions.has(s.id)) allSessions.set(s.id, s);
      }
      const sessions = Array.from(allSessions.values());

      if (sessions.length === 0) { setLoading(false); return; }

      const rIds = sessions.map(s => s.id);
      const [{ data: messages }, { data: scenarios }] = await Promise.all([
        supabase.from('report_messages').select('report_id, read_by_client_at').in('report_id', rIds).eq('sender_role', 'agent'),
        supabase.from('report_scenarios').select('report_id, reviewed_status').in('report_id', rIds).eq('created_by_role', 'client'),
      ]);

      setReports(sessions.map(s => ({
        report_id: s.id,
        share_token: s.share_token || '',
        client_name: s.client_name,
        session_type: s.session_type,
        location: s.location,
        last_viewed: s.updated_at,
        unread_messages: messages?.filter(m => m.report_id === s.id && !m.read_by_client_at).length || 0,
        scenario_count: scenarios?.filter(sc => sc.report_id === s.id).length || 0,
        pending_reviews: scenarios?.filter(sc => sc.report_id === s.id && sc.reviewed_status === 'pending').length || 0,
      })).sort((a, b) => new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime()));
    } catch (err) {
      console.error('Failed to load client reports:', err);
    } finally { setLoading(false); }
  };


  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const totalUnread = reports.reduce((acc, r) => acc + r.unread_messages, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Client Onboarding */}
      <ClientOnboarding />

      {/* Premium Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-8">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="p-3 rounded-xl bg-accent/20 backdrop-blur-sm">
              <AppLogo size="sm" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-sans font-bold">
                {clientName ? `Welcome, ${clientName.split(' ')[0]}` : 'My Reports'}
              </h1>
              <p className="text-sm text-primary-foreground/70">
                {user ? 'Property analyses shared with you' : 'Reports shared by your agent'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="[&_button]:text-primary-foreground/80 [&_button:hover]:text-primary-foreground">
                <NotificationBell role="client" viewerId={user?.id || viewerId || undefined} />
              </div>
              {user && (
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-primary-foreground/70 hover:text-primary-foreground">
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </div>
        <div className="relative h-8 -mb-1">
          <svg className="absolute bottom-0 w-full h-8" preserveAspectRatio="none" viewBox="0 0 1440 32">
            <path fill="hsl(var(--background))" d="M0,16L120,18.7C240,21,480,27,720,26.7C960,27,1200,21,1320,18.7L1440,16L1440,32L1320,32C1200,32,960,32,720,32C480,32,240,32,120,32L0,32Z" />
          </svg>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 -mt-2">
        {/* Quick Stats */}
        {reports.length > 0 && (
          <motion.div 
            className="grid grid-cols-3 gap-3 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <FileText className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-sans font-bold">{reports.length}</p>
                <p className="text-[10px] text-muted-foreground">Reports</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <MessageSquare className="h-4 w-4 mx-auto mb-1 text-accent" />
                <p className="text-2xl font-sans font-bold">{totalUnread}</p>
                <p className="text-[10px] text-muted-foreground">Unread</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Layers className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-sans font-bold">{reports.reduce((acc, r) => acc + r.scenario_count, 0)}</p>
                <p className="text-[10px] text-muted-foreground">Scenarios</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center gap-2 mb-4">
          {reports.length >= 2 && (
            <>
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setCompareMode(!compareMode); setSelectedIds([]); }}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                {compareMode ? 'Cancel' : 'Compare'}
              </Button>
              {compareMode && selectedIds.length >= 2 && (
                <Button size="sm" onClick={() => navigate(`/my-reports/compare?ids=${selectedIds.join(',')}`)}>
                  Compare {selectedIds.length}
                </Button>
              )}
              {compareMode && <span className="text-xs text-muted-foreground">{selectedIds.length}/3</span>}
            </>
          )}
          <div className="ml-auto">
            <ClientOnboardingTrigger />
          </div>
        </div>

        {loading ? (
          <SkeletonList count={3} showBadge />
        ) : reports.length === 0 ? (
          <EmptyClientReports />
        ) : (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {reports.map((report, i) => (
              <motion.div
                key={report.report_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-200 ${
                    compareMode && selectedIds.includes(report.report_id) 
                      ? 'border-accent ring-1 ring-accent/30 shadow-md' 
                      : 'hover:border-accent/40 hover:shadow-sm'
                  }`}
                  onClick={() => {
                    if (compareMode) {
                      setSelectedIds(prev => {
                        if (prev.includes(report.report_id)) return prev.filter(x => x !== report.report_id);
                        if (prev.length >= 3) return [...prev.slice(1), report.report_id];
                        return [...prev, report.report_id];
                      });
                    } else {
                      navigate(`/share/${report.report_id}`);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {compareMode && (
                        <Checkbox
                          checked={selectedIds.includes(report.report_id)}
                          className="mt-1 shrink-0"
                          onCheckedChange={() => {
                            setSelectedIds(prev => {
                              if (prev.includes(report.report_id)) return prev.filter(x => x !== report.report_id);
                              if (prev.length >= 3) return [...prev.slice(1), report.report_id];
                              return [...prev, report.report_id];
                            });
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-sans font-semibold truncate">{report.client_name}</h3>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {report.session_type === 'buyer' ? 'Buyer' : 'Seller'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{report.location}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {report.last_viewed ? format(new Date(report.last_viewed), 'MMM d, yyyy') : '—'}
                          </span>
                          {report.scenario_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {report.scenario_count} scenario{report.scenario_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {report.unread_messages > 0 && (
                          <Badge className="bg-accent text-accent-foreground text-[10px]">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {report.unread_messages}
                          </Badge>
                        )}
                        {report.pending_reviews > 0 && (
                          <Badge variant="outline" className="text-[10px] border-accent/50 text-accent">
                            Pending
                          </Badge>
                        )}
                        {!compareMode && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      <NotificationPrePrompt open={showPrePrompt} onConfirm={confirmPermission} onDismiss={dismissPrePrompt} role="client" />
    </div>
  );
}
