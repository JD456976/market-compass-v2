import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Compass, Users, Building2, FolderOpen, ChevronRight, TrendingUp, User, FileText, Send, Database, BookOpen, UserPlus, Upload, Sparkles } from 'lucide-react';
import { AgentOnboarding, OnboardingTrigger } from '@/components/AgentOnboarding';
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
  const { sessions: drafts } = useDraftSessions();
  const { activeSessions: shared, sessions: allShared } = useSharedSessions();
  const { user } = useAuth();
  const { isAgent } = useUserRole();
  const { isProfessionalUser } = useProfessionalAccess();
  const [proBannerDismissed, setProBannerDismissed] = useState(
    () => sessionStorage.getItem('pro_banner_dismissed') === 'true'
  );

  // Progressive disclosure: has the user created at least one report?
  const hasCreatedReport = drafts.length > 0 || allShared.length > 0;

  return (
    <div className="bg-background" role="main" aria-label="Market Compass Home">
      {/* Agent Onboarding Modal */}
      <AgentOnboarding />

      {/* Hero Section */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <motion.div 
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-accent/20 backdrop-blur-sm">
                <Compass className="h-8 w-8 text-accent" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-tight">
              Market Compass
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Agent decision-support tool for navigating Seller and Buyer scenarios 
              with confidence and clarity.
            </p>
          </motion.div>
        </div>
        
        {/* Decorative wave */}
        <div className="relative h-16 -mb-1">
          <svg className="absolute bottom-0 w-full h-16" preserveAspectRatio="none" viewBox="0 0 1440 74">
            <path 
              fill="hsl(var(--background))" 
              d="M0,32L60,37.3C120,43,240,53,360,53.3C480,53,600,43,720,42.7C840,43,960,53,1080,58.7C1200,64,1320,64,1380,64L1440,64L1440,74L1380,74C1320,74,1200,74,1080,74C960,74,840,74,720,74C600,74,480,74,360,74C240,74,120,74,60,74L0,74Z"
            />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 -mt-8">
        {/* Main Actions */}
        <motion.div 
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUp}>
            <Link to="/seller" className="block h-full">
              <Card className="h-full cursor-pointer group border-2 border-transparent hover:border-accent/30">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                    <Building2 className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Seller Report</CardTitle>
                  <CardDescription className="text-base">
                    Analyze listing strategy, pricing, and sale likelihood across timeframes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors" size="lg">
                    Start Seller Analysis
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Link to="/buyer" className="block h-full">
              <Card className="h-full cursor-pointer group border-2 border-transparent hover:border-accent/30">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Buyer Report</CardTitle>
                  <CardDescription className="text-base">
                    Evaluate offer competitiveness, acceptance likelihood, and risk tradeoffs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors" size="lg">
                    Start Buyer Analysis
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {/* Post-onboarding CTA for first-time users */}
        {!hasCreatedReport && (
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
              <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-transparent hover:from-accent/10 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="p-2.5 rounded-full bg-accent/10">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Unlock your competitive advantage</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unlimited reports • Scenario modeling • Branded exports
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 border-accent/30 text-accent hover:bg-accent/10">
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
                sessionStorage.setItem('pro_banner_dismissed', 'true');
              }}
              className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
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
          <h3 className="text-sm font-sans font-medium text-muted-foreground mb-3 px-1">Your Reports</h3>
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
            {user && isAgent && (
              <Link to="/documents" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full">
                    <Upload className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Property Documents</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Upload and review MLS sheets</span>
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
            <h3 className="text-sm font-sans font-medium text-muted-foreground mb-3 px-1">Market & Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/market-scenarios" className="block">
                <Button variant="outline" size="lg" className="w-full justify-start flex-col items-start h-auto py-3 gap-0.5">
                  <span className="flex items-center w-full">
                    <TrendingUp className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Market Scenarios</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal pl-6">Define local market conditions</span>
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
          <h3 className="text-sm font-sans font-medium text-muted-foreground mb-3 px-1">Help & Info</h3>
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
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4" />
              <span>Market Compass</span>
            </div>
            <p className="text-xs text-center max-w-md">
              Uses public market trend research and transaction logic. 
              Does not use MLS data or provide valuations.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <span>·</span>
              <a href="mailto:support@market-compass.com" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-xs">© {new Date().getFullYear()} Market Compass. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
