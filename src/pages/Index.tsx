import { useState } from 'react';
import { AlertTriangle, LayoutList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, FolderOpen, ChevronRight, TrendingUp, User, FileText, Send, Database, BookOpen, UserPlus, Sparkles, Zap, Eye } from 'lucide-react';
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

  // Progressive disclosure: has the user created at least one report?
  const hasCreatedReport = !loadError && (drafts.length > 0 || allShared.length > 0);
  const totalReports = drafts.length + shared.length;

  return (
    <div className="bg-background min-h-screen" role="main" aria-label="Market Compass Home">
      {/* Agent Onboarding Modal */}
      <AgentOnboarding />
      {/* All Reports Drawer */}
      <AllReportsDrawer open={allReportsOpen} onClose={() => setAllReportsOpen(false)} />

      {/* Hero Section */}
      <div className="hero-gradient text-foreground relative overflow-hidden">
        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
          <motion.div 
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <AppLogo size="lg" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-tight text-foreground">
              Market <span className="text-gradient">Compass</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Agent decision-support tool for navigating Seller and Buyer scenarios 
              with confidence and clarity.
            </p>
          </motion.div>
        </div>
        
        {/* Gold accent line */}
        <div className="gold-line w-full" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Main Actions */}
        <motion.div 
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Quick Report CTA */}
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <Link to="/quick-report" className="block">
              <Card className="cursor-pointer group border-primary/20 hover:border-primary/40 bg-primary/5">
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

          <motion.div variants={fadeInUp}>
            <Link to="/seller" className="block h-full">
              <Card className="h-full cursor-pointer group hover:border-primary/40">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 border border-primary/10">
                    <Building2 className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Seller Report</CardTitle>
                  <CardDescription className="text-base">
                    Analyze listing strategy, pricing, and sale likelihood across timeframes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="lg">
                    Start Seller Analysis
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Link to="/buyer" className="block h-full">
              <Card className="h-full cursor-pointer group hover:border-primary/40">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 border border-primary/10">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Buyer Report</CardTitle>
                  <CardDescription className="text-base">
                    Evaluate offer competitiveness, acceptance likelihood, and risk tradeoffs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="lg">
                    Start Buyer Analysis
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Touring Brief CTA */}
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <Link to="/touring" className="block">
              <Card className="cursor-pointer group border-border/40 hover:border-primary/30">
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

        {/* Load error banner */}
        {loadError && (
          <motion.div
            className="max-w-4xl mx-auto mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Could not load your reports</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Please check your connection and try refreshing the page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Post-onboarding CTA for first-time users */}
        {!loadError && !hasCreatedReport && (
          <motion.div
            className="max-w-4xl mx-auto mb-12 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
              <CardContent className="py-6">
                <p className="text-sm font-medium text-foreground mb-1">
                  👋 Ready to get started?
                </p>
                <p className="text-xs text-muted-foreground">
                  Choose a Seller or Buyer report above to create your first analysis. It only takes a few minutes.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Professional Plan Entry Point */}
        {!isProfessionalUser && !proBannerDismissed && (
          <motion.div
            className="max-w-4xl mx-auto mb-8 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Link to="/subscription" className="block">
              <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent hover:from-primary/10 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="p-2.5 rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">Unlock your competitive advantage</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unlimited reports • Scenario modeling • Branded exports
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 border-primary/30 text-primary hover:bg-primary/10">
                    View Professional Plan
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setProBannerDismissed(true);
                localStorage.setItem('pro_banner_dismissed', 'true');
              }}
              className="absolute top-1 right-1 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </motion.div>
        )}

        {/* Your Reports */}
        <motion.div 
          className="max-w-4xl mx-auto mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground">Your Reports</h3>
            <button
              onClick={() => setAllReportsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <LayoutList className="h-3.5 w-3.5" />
              All Reports
              {totalReports > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{totalReports}</Badge>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/drafts" className="block">
              <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                <span className="flex items-center w-full">
                  <FolderOpen className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Draft Analyses</span>
                  {drafts.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">{drafts.length}</Badge>
                  )}
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
                  {shared.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">{shared.length}</Badge>
                  )}
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

        {/* Market & Settings — hidden until first report for progressive disclosure */}
        {hasCreatedReport && (
          <motion.div 
            className="max-w-4xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Market & Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/market-intelligence" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full">
                    <TrendingUp className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Market Intelligence</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Scenarios & location profiles</span>
                </Button>
              </Link>
              <Link to="/market-data" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full">
                    <Database className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Market Data</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Area-level pricing and trend profiles</span>
                </Button>
              </Link>
              <Link to="/agent-profile" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Agent Profile</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Your branding and contact info</span>
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Help & Info */}
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Help & Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/methodology" className="block">
              <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                <span className="flex items-center w-full">
                  <BookOpen className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Data & Methodology</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal pl-6">How scores and likelihoods are calculated</span>
              </Button>
            </Link>
            <OnboardingTrigger />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="gold-line w-full" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" />
              <span className="font-serif font-semibold text-foreground/80">Market Compass</span>
            </div>
            <p className="text-xs text-center max-w-md">
              Uses public market trend research and transaction logic. 
              Does not use MLS data or provide valuations.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span className="text-border">·</span>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <span className="text-border">·</span>
              <a href="mailto:support@market-compass.com" className="hover:text-primary transition-colors">Contact</a>
            </div>
            <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Market Compass. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
