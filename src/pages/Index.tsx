import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass, Users, Building2, FolderOpen, ChevronRight, TrendingUp, User, FileText, Send, Database, BookOpen } from 'lucide-react';
import { AgentOnboarding, OnboardingTrigger } from '@/components/AgentOnboarding';

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
  return (
    <div className="min-h-screen bg-background">
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

        {/* Secondary Links - Session Management */}
        <motion.div 
          className="max-w-4xl mx-auto mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Session Management</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/drafts">
              <Button variant="outline" size="lg" className="min-w-[160px]">
                <FolderOpen className="mr-2 h-4 w-4" />
                Draft Analyses
              </Button>
            </Link>
            <Link to="/templates">
              <Button variant="outline" size="lg" className="min-w-[160px]">
                <FileText className="mr-2 h-4 w-4" />
                Templates
              </Button>
            </Link>
            <Link to="/shared-reports">
              <Button variant="outline" size="lg" className="min-w-[160px]">
                <Send className="mr-2 h-4 w-4" />
                Shared Reports
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Market & Settings */}
        <motion.div 
          className="max-w-4xl mx-auto mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Market & Settings</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/market-scenarios">
              <Button variant="outline" size="lg" className="min-w-[160px]">
                <TrendingUp className="mr-2 h-4 w-4" />
                Market Scenarios
              </Button>
            </Link>
            <Link to="/market-data">
              <Button variant="outline" size="lg" className="min-w-[160px]">
                <Database className="mr-2 h-4 w-4" />
                Market Data
              </Button>
            </Link>
            <Link to="/agent-profile">
              <Button variant="outline" size="lg" className="min-w-[160px]">
                <User className="mr-2 h-4 w-4" />
                Agent Profile
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Help & Info */}
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Help & Info</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/methodology">
              <Button variant="outline" size="lg" className="min-w-[160px]">
                <BookOpen className="mr-2 h-4 w-4" />
                Data & Methodology
              </Button>
            </Link>
            <OnboardingTrigger />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4" />
              <span>Market Compass v0</span>
            </div>
            <p className="text-xs text-center max-w-md">
              Uses public market trend research and transaction logic. 
              Does not use MLS data or provide valuations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
