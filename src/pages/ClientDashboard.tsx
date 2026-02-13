import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, MessageSquare, Layers, Clock, ExternalLink, ArrowLeft, Shield, GitCompare, LogOut } from 'lucide-react';
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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isClient } = useUserRole();

  const viewerId = user?.id || localStorage.getItem('mc_viewer_id') || '';

  const reportIds = useMemo(() => reports.map(r => r.report_id), [reports]);
  usePushNotifications('client', reportIds);

  useEffect(() => {
    if (user && isClient) {
      fetchAuthenticatedClientReports();
    } else if (viewerId) {
      fetchClientReports();
    } else {
      setLoading(false);
    }
  }, [user, isClient, viewerId]);

  // Authenticated client: fetch reports from agent_clients relationship
  const fetchAuthenticatedClientReports = async () => {
    if (!user) return;
    try {
      // Get agent IDs linked to this client
      const { data: agentLinks } = await supabase
        .from('agent_clients')
        .select('agent_user_id')
        .eq('client_user_id', user.id);

      if (!agentLinks || agentLinks.length === 0) {
        setLoading(false);
        return;
      }

      const agentIds = agentLinks.map(l => l.agent_user_id);

      // Fetch shared sessions owned by these agents
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, client_name, session_type, location, share_token, updated_at')
        .in('owner_user_id', agentIds)
        .eq('share_link_created', true)
        .eq('share_token_revoked', false)
        .order('updated_at', { ascending: false });

      if (!sessions || sessions.length === 0) {
        setLoading(false);
        return;
      }

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
      })));
    } catch (err) {
      console.error('Failed to load authenticated client reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientReports = async () => {
    try {
      const { data: views } = await supabase
        .from('shared_report_views')
        .select('report_id, share_token, viewed_at')
        .eq('viewer_id', viewerId)
        .order('viewed_at', { ascending: false });

      if (!views || views.length === 0) {
        setLoading(false);
        return;
      }

      const uniqueReports = new Map<string, { report_id: string; share_token: string; last_viewed: string }>();
      for (const v of views) {
        if (!uniqueReports.has(v.report_id)) {
          uniqueReports.set(v.report_id, {
            report_id: v.report_id,
            share_token: v.share_token,
            last_viewed: v.viewed_at,
          });
        }
      }

      const rIds = Array.from(uniqueReports.keys());

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, client_name, session_type, location, share_token')
        .in('id', rIds)
        .eq('share_link_created', true)
        .eq('share_token_revoked', false);

      if (!sessions) {
        setLoading(false);
        return;
      }

      const [{ data: messages }, { data: scenarios }] = await Promise.all([
        supabase.from('report_messages').select('report_id, read_by_client_at').in('report_id', rIds).eq('sender_role', 'agent'),
        supabase.from('report_scenarios').select('report_id, reviewed_status').in('report_id', rIds).eq('created_by_role', 'client'),
      ]);

      setReports(sessions.map(s => {
        const viewInfo = uniqueReports.get(s.id);
        return {
          report_id: s.id,
          share_token: s.share_token || viewInfo?.share_token || '',
          client_name: s.client_name,
          session_type: s.session_type,
          location: s.location,
          last_viewed: viewInfo?.last_viewed || '',
          unread_messages: messages?.filter(m => m.report_id === s.id && !m.read_by_client_at).length || 0,
          scenario_count: scenarios?.filter(sc => sc.report_id === s.id).length || 0,
          pending_reviews: scenarios?.filter(sc => sc.report_id === s.id && sc.reviewed_status === 'pending').length || 0,
        };
      }));
    } catch (err) {
      console.error('Failed to load client reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold">My Reports</h1>
            <p className="text-sm text-muted-foreground">
              {user ? `Reports shared with you` : 'Reports shared with you by your agent'}
            </p>
          </div>
          <NotificationBell role="client" viewerId={user?.id || viewerId || undefined} />
          {user && (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Compare Button */}
        {reports.length >= 2 && (
          <div className="mb-4 flex items-center gap-2">
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedIds([]);
              }}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {compareMode ? 'Cancel' : 'Compare Properties'}
            </Button>
            {compareMode && selectedIds.length >= 2 && (
              <Button
                size="sm"
                onClick={() => navigate(`/my-reports/compare?ids=${selectedIds.join(',')}`)}
              >
                Compare {selectedIds.length} Reports
              </Button>
            )}
            {compareMode && (
              <span className="text-xs text-muted-foreground">{selectedIds.length}/3 selected</span>
            )}
          </div>
        )}

        {loading ? (
          <SkeletonList count={3} showBadge />
        ) : reports.length === 0 ? (
          <EmptyClientReports />
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <Card
                key={report.report_id}
                className={`cursor-pointer transition-colors ${
                  compareMode && selectedIds.includes(report.report_id) 
                    ? 'border-accent ring-1 ring-accent/30' 
                    : 'hover:border-accent/40'
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
                        <h3 className="font-serif font-semibold truncate">{report.client_name}</h3>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}