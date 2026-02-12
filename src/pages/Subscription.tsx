import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  FileText,
  BarChart3,
  Share2,
  Sparkles,
  Users,
  Building2,
  PenTool,
  User,
  Palette,
  TrendingUp,
  Activity,
  Clock,
  RefreshCw,
  ChevronRight,
  Layers,
  ExternalLink
} from 'lucide-react';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { useSessions } from '@/hooks/useSessions';
import { loadAgentProfile, AgentProfile } from '@/lib/agentProfile';
import { FREE_TIER_LIMITS } from '@/lib/featureGating';
import { formatLocation } from '@/lib/utils';

export default function Subscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessions } = useSessions();
  const [isRestoring, setIsRestoring] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  
  const session = getBetaAccessSession();
  const hasBetaAccess = !!session;

  useEffect(() => {
    setProfile(loadAgentProfile());
  }, []);

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({
      title: 'No purchases found',
      description: 'Subscriptions will be available after the beta period.',
    });
    setIsRestoring(false);
  };

  // Compute stats
  const totalReports = sessions.length;
  const draftCount = sessions.filter(s => !s.share_link_created && !s.pdf_exported).length;
  const sharedCount = sessions.filter(s => s.share_link_created || s.pdf_exported).length;
  const buyerCount = sessions.filter(s => s.session_type === 'Buyer').length;
  const sellerCount = sessions.filter(s => s.session_type === 'Seller').length;
  const recentSessions = [...sessions].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  ).slice(0, 5);

  // Current month report count
  const thisMonth = new Date();
  const monthReports = sessions.filter(s => {
    const d = new Date(s.created_at);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  }).length;

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
            <div className="flex items-center gap-3">
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
                      ? 'All professional features unlocked during beta. Thank you for testing!'
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

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" />
                  Recent Activity
                </CardTitle>
                <Link to="/drafts">
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRestorePurchases}
            disabled={isRestoring}
          >
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
    </div>
  );
}
