import { useState, useCallback } from 'react';
import { AlertTriangle, LayoutList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Building2, FolderOpen, ChevronRight, TrendingUp, User, FileText, Send, Database, BookOpen, UserPlus, Sparkles, Zap, Eye, Activity, Search, BarChart2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLogo } from '@/components/AppLogo';
import { AgentOnboarding, OnboardingTrigger } from '@/components/AgentOnboarding';
import { AllReportsDrawer } from '@/components/AllReportsDrawer';
import { useDraftSessions, useSharedSessions } from '@/hooks/useSessions';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfessionalAccess } from '@/hooks/useProfessionalAccess';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// ─── Pulse Score Widget ───────────────────────────────────────────────────────

function getPulseLabel(score: number) {
  if (score >= 80) return { label: 'Hot Market', color: 'text-green-400', bg: 'bg-green-400' };
  if (score >= 60) return { label: 'Warm Market', color: 'text-primary', bg: 'bg-primary' };
  if (score >= 40) return { label: 'Balanced', color: 'text-blue-400', bg: 'bg-blue-400' };
  if (score >= 20) return { label: 'Cool Market', color: 'text-sky-400', bg: 'bg-sky-400' };
  return { label: 'Cold Market', color: 'text-slate-400', bg: 'bg-slate-400' };
}

function PulseScoreWidget() {
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; cityState: string; leadType: string } | null>(null);
  const [error, setError] = useState('');

  const lookup = useCallback(async () => {
    const cleaned = zip.replace(/\s/g, '');
    if (!/^\d{5}$/.test(cleaned)) {
      setError('Enter a valid 5-digit ZIP code');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `You are a real estate market analyst. Given ZIP code ${cleaned}, return a JSON object (no markdown, no backticks) with these exact keys:
{
  "score": <integer 0-100 representing market opportunity score>,
  "cityState": "<City, ST>",
  "leadType": "<"buyer" | "seller" | "transitional">",
  "summary": "<one sentence market summary>"
}
Base your score on your knowledge of that ZIP's typical market conditions (inventory levels, days on market, price trends). Score above 65 = seller's market, 35-65 = balanced, below 35 = buyer's market.`
          }],
        }),
      });
      const raw = await response.json();
      const text = raw.content?.[0]?.text ?? '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      const score = parsed?.score ?? null;
      if (score == null) throw new Error('No score returned');
      setResult({
        score: Math.round(score),
        cityState: parsed.cityState ?? cleaned,
        leadType: parsed.leadType ?? 'transitional',
      });
    } catch (e: any) {
      setError('Could not fetch market data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [zip]);

  const pulse = result ? getPulseLabel(result.score) : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Left: Input */}
          <div className="flex-1 p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Pulse Score</span>
              <Badge variant="secondary" className="text-[10px]">Industry First</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Instant 0–100 market health score for any ZIP. One number that tells you if it's a buyer's, seller's, or balanced market — powered by live federal data.
            </p>
            <div className="flex gap-2">
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                onKeyDown={(e) => e.key === 'Enter' && lookup()}
                placeholder="ZIP code"
                className="max-w-[140px] font-mono"
                maxLength={5}
              />
              <Button size="sm" onClick={lookup} disabled={loading || zip.length < 5}>
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Checking
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Check</span>
                )}
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Right: Score display */}
          <div className="sm:w-48 flex items-center justify-center p-5 bg-muted/30" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
            {result && pulse ? (
              <div className="text-center space-y-2">
                <div className={`text-5xl font-bold font-mono tabular-nums ${pulse.color}`}>
                  {result.score}
                </div>
                <div className="space-y-1">
                  <p className={`text-xs font-semibold ${pulse.color}`}>{pulse.label}</p>
                  <p className="text-[10px] text-muted-foreground">{result.cityState}</p>
                </div>
                {/* Mini bar */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${pulse.bg}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <Link to="/lead-finder" className="text-[10px] text-primary hover:underline">
                  Full analysis →
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl font-bold font-mono text-muted-foreground/20">—</div>
                <p className="text-[10px] text-muted-foreground mt-1">Enter a ZIP</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Index Page ───────────────────────────────────────────────────────────────

const Index = () => {
  const { sessions: drafts, error: draftsError } = useDraftSessions();
  const { activeSessions: shared, sessions: allShared, error: sharedError } = useSharedSessions();
  const { user } = useAuth();
  const { isAgent } = useUserRole();
  const { isProfessionalUser } = useProfessionalAccess();
  const [proBannerDismissed, setProBannerDismissed] = useState(
    () => localStorage.getItem('pro_banner_dismissed') === 'true'
  );
  const [allReportsOpen, setAllReportsOpen] = useState(false);
  const loadError = draftsError || sharedError;

  const hasCreatedReport = !loadError && (drafts.length > 0 || allShared.length > 0);
  const totalReports = drafts.length + shared.length;

  return (
    <div className="bg-background min-h-screen" role="main" aria-label="Market Compass Home">
      <AgentOnboarding />
      <AllReportsDrawer open={allReportsOpen} onClose={() => setAllReportsOpen(false)} />

      {/* Compact Hero — 140px max, no waves */}
      <div className="border-b border-border" style={{ background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)' }}>
        <div className="container mx-auto px-4 py-6 md:py-8" style={{ maxHeight: '140px' }}>
          <motion.div 
            className="flex items-center gap-3 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,168,83,0.15)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            </div>
            <div>
              <h1 className="text-[22px] font-sans font-semibold" style={{ color: '#F1F5F9' }}>
                Market Compass
              </h1>
              <p className="text-[13px]" style={{ color: '#94A3B8' }}>
                Agent decision-support for Seller &amp; Buyer scenarios
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8" style={{ backgroundColor: '#0F172A' }}>
        {/* Neighborhood Pulse Card */}
        <motion.div
          className="max-w-4xl mx-auto mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="rounded-xl p-5 flex items-center gap-5" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderLeftColor: '#D4A853', borderLeftWidth: '4px' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(212,168,83,0.15)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Neighborhood Pulse Score</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Enter a ZIP below to get a live 0–100 market health score based on inventory, DOM, and pricing trends</p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Quick Report */}
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <Link to="/quick-report" className="block">
              <Card className="cursor-pointer group bg-primary/5 hover:bg-primary/8" style={{ borderColor: 'hsl(38 72% 58% / 0.2)' }}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2.5 rounded-full bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">Quick Report</p>
                    <p className="text-xs text-muted-foreground">Address + price → instant analysis in 30 seconds</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Pulse Score Widget */}
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <PulseScoreWidget />
          </motion.div>

          {/* Quick CMA shortcut */}
          <motion.div variants={fadeInUp}>
            <Link to="/quick-cma" className="block h-full">
              <Card className="h-full cursor-pointer group">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2.5 rounded-full bg-primary/10">
                    <BarChart2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">Quick CMA</p>
                    <p className="text-xs text-muted-foreground">AI-powered comp analysis in seconds</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Client Report shortcut */}
          <motion.div variants={fadeInUp}>
            <Link to="/client-report" className="block h-full">
              <Card className="h-full cursor-pointer group">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2.5 rounded-full bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">Client Report</p>
                    <p className="text-xs text-muted-foreground">Branded market briefing for any client</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>


          <motion.div variants={fadeInUp}>
            <Link to="/seller" className="block h-full">
              <Card className="h-full cursor-pointer group">
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300" style={{ borderColor: 'hsl(38 72% 58% / 0.1)', borderWidth: 1 }}>
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg font-sans font-semibold">Seller Report</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Analyze listing strategy, pricing & sale likelihood
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4 px-5">
                  <Button className="w-full accent-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity" size="sm">
                    Start Seller Analysis
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Buyer */}
          <motion.div variants={fadeInUp}>
            <Link to="/buyer" className="block h-full">
              <Card className="h-full cursor-pointer group">
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300" style={{ borderColor: 'hsl(38 72% 58% / 0.1)', borderWidth: 1 }}>
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg font-sans font-semibold">Buyer Report</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Evaluate offer competitiveness & risk tradeoffs
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4 px-5">
                  <Button className="w-full accent-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity" size="sm">
                    Start Buyer Analysis
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Touring Brief */}
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <Link to="/touring" className="block">
              <Card className="cursor-pointer group">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2.5 rounded-full bg-secondary">
                    <Eye className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">Touring Brief</p>
                    <p className="text-xs text-muted-foreground">Pre-showing property intelligence — import a listing and share with your client before they tour</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {/* Load error */}
        {loadError && (
          <motion.div className="max-w-4xl mx-auto mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-destructive/5" style={{ borderColor: 'hsl(0 72% 51% / 0.2)' }}>
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Could not load your reports</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Please check your connection and try refreshing the page.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* First-time CTA */}
        {!loadError && !hasCreatedReport && (
          <motion.div className="max-w-4xl mx-auto mb-12 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-dashed border-2 bg-primary/5" style={{ borderColor: 'hsl(38 72% 58% / 0.15)' }}>
              <CardContent className="py-6">
                <p className="text-sm font-medium text-foreground mb-1">👋 Ready to get started?</p>
                <p className="text-xs text-muted-foreground">Choose a Seller or Buyer report above to create your first analysis.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pro banner */}
        {!isProfessionalUser && !proBannerDismissed && (
          <motion.div className="max-w-4xl mx-auto mb-8 relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Link to="/subscription" className="block">
              <Card className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent hover:from-primary/10 transition-colors cursor-pointer" style={{ borderColor: 'hsl(38 72% 58% / 0.15)' }}>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="p-2.5 rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">Unlock your competitive advantage</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Unlimited reports • Scenario modeling • Branded exports</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 text-primary hover:bg-primary/10" style={{ borderColor: 'hsl(38 72% 58% / 0.2)' }}>
                    View Professional Plan
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProBannerDismissed(true); localStorage.setItem('pro_banner_dismissed', 'true'); }}
              className="absolute top-1 right-1 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </motion.div>
        )}

        {/* Your Reports */}
        <motion.div className="max-w-4xl mx-auto mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground">Your Reports</h3>
            <button onClick={() => setAllReportsOpen(true)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
              <LayoutList className="h-3.5 w-3.5" />
              All Reports
              {totalReports > 0 && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{totalReports}</Badge>}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/drafts" className="block">
              <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                <span className="flex items-center w-full">
                  <FolderOpen className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Draft Analyses</span>
                  {drafts.length > 0 && <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">{drafts.length}</Badge>}
                </span>
                <span className="text-[10px] text-muted-foreground font-normal pl-6">In-progress reports not yet shared</span>
              </Button>
            </Link>
            <Link to="/templates" className="block">
              <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                <span className="flex items-center w-full">
                  <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Templates</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal pl-6">Reusable presets for common scenarios</span>
              </Button>
            </Link>
            <Link to="/shared-reports" className="block">
              <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                <span className="flex items-center w-full">
                  <Send className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Shared Reports</span>
                  {shared.length > 0 && <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">{shared.length}</Badge>}
                </span>
                <span className="text-[10px] text-muted-foreground font-normal pl-6">Reports sent to clients</span>
              </Button>
            </Link>
            {user && isAgent && (
              <Link to="/clients" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full">
                    <UserPlus className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Client Management</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Manage and invite your clients</span>
                </Button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Market & Settings */}
        {hasCreatedReport && (
          <motion.div className="max-w-4xl mx-auto mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <h3 className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Market & Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/market-intelligence" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full"><TrendingUp className="mr-2 h-4 w-4 flex-shrink-0" /><span className="truncate">Market Intelligence</span></span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Scenarios & location profiles</span>
                </Button>
              </Link>
              <Link to="/market-data" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full"><Database className="mr-2 h-4 w-4 flex-shrink-0" /><span className="truncate">Market Data</span></span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Area-level pricing and trend profiles</span>
                </Button>
              </Link>
              <Link to="/agent-profile" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full"><User className="mr-2 h-4 w-4 flex-shrink-0" /><span className="truncate">Agent Profile</span></span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Your branding and contact info</span>
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Help & Info */}
        <motion.div className="max-w-4xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <h3 className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Help & Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/methodology" className="block">
              <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                <span className="flex items-center w-full"><BookOpen className="mr-2 h-4 w-4 flex-shrink-0" /><span className="truncate">Data & Methodology</span></span>
                <span className="text-[10px] text-muted-foreground font-normal pl-6">How scores and likelihoods are calculated</span>
              </Button>
            </Link>
            <OnboardingTrigger />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-16" style={{ borderTop: '1px solid hsl(0 0% 100% / 0.08)' }}>
        <div className="gold-line w-full" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" />
              <span className="font-sans font-semibold text-foreground/80">Market Compass</span>
            </div>
            <p className="text-xs text-center max-w-md">
              Uses public market trend research and transaction logic. Does not use MLS data or provide valuations.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span className="opacity-30">·</span>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <span className="opacity-30">·</span>
              <a href="mailto:support@market-compass.com" className="hover:text-primary transition-colors">Contact</a>
            </div>
            <p className="text-xs text-muted-foreground/50">© {new Date().getFullYear()} Market Compass. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
