import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3, Users, FileText, Eye } from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  totalReports: number;
  totalViews: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  sellerReports: number;
  buyerReports: number;
  sharedReports: number;
  totalClients: number;
  pendingInvites: number;
  acceptedInvites: number;
}

export function AdminAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [profilesRes, sessionsRes, viewsRes, weekRes, monthRes, clientsRes, invitesRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('sessions').select('session_type, share_link_created'),
          supabase.from('shared_report_views').select('id', { count: 'exact', head: true }),
          supabase.from('sessions').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
          supabase.from('sessions').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
          supabase.from('agent_clients').select('id', { count: 'exact', head: true }),
          supabase.from('client_invitations').select('id, status'),
        ]);

        const sessions = sessionsRes.data || [];
        const invites = invitesRes.data || [];
        
        setData({
          totalUsers: profilesRes.count || 0,
          totalReports: sessions.length,
          totalViews: viewsRes.count || 0,
          reportsThisWeek: weekRes.count || 0,
          reportsThisMonth: monthRes.count || 0,
          sellerReports: sessions.filter(s => s.session_type === 'Seller').length,
          buyerReports: sessions.filter(s => s.session_type === 'Buyer').length,
          sharedReports: sessions.filter(s => s.share_link_created).length,
          totalClients: clientsRes.count || 0,
          pendingInvites: invites.filter(i => i.status === 'pending').length,
          acceptedInvites: invites.filter(i => i.status === 'accepted').length,
        });
      } catch (error) {
        console.error('Analytics error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Card><CardContent className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></CardContent></Card>
    );
  }

  if (!data) return null;

  const metrics = [
    { label: 'Total Users', value: data.totalUsers, icon: Users, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Total Reports', value: data.totalReports, icon: FileText, color: 'bg-primary/10 text-primary' },
    { label: 'Report Views', value: data.totalViews, icon: Eye, color: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Reports This Week', value: data.reportsThisWeek, icon: BarChart3, color: 'bg-amber-500/10 text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${m.color}`}>
                  <m.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">{data.sellerReports}</p>
              <p className="text-sm text-muted-foreground">Seller Reports</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{data.buyerReports}</p>
              <p className="text-sm text-muted-foreground">Buyer Reports</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">{data.sharedReports}</p>
              <p className="text-sm text-muted-foreground">Shared</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{data.reportsThisMonth}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{data.totalClients}</p>
              <p className="text-sm text-muted-foreground">Active Clients</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-600">{data.pendingInvites}</p>
              <p className="text-sm text-muted-foreground">Pending Invites</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
