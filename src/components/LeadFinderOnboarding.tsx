import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Target, TrendingUp, MapPin, FileText,
  Upload, Bell, Star, ChevronRight, ChevronLeft, X, BookOpen,
} from 'lucide-react';

const ONBOARDING_KEY = 'lead_finder_onboarding_complete';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail: string;
  highlight?: string;
}

const steps: OnboardingStep[] = [
  {
    icon: (
      <div className="relative">
        <Target className="h-8 w-8 text-accent" />
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
      </div>
    ),
    title: 'Welcome to Lead Finder',
    description: 'Find your next listing opportunity using live federal economic data — no guesswork, no estimates.',
    detail: 'Lead Finder pulls real-time data from the Federal Reserve Economic Data (FRED) database and combines five key market signals to give every ZIP code an Opportunity Score out of 100. It tells you exactly where to focus your prospecting energy.',
    highlight: 'Powered entirely by public FRED data — the same source economists use.',
  },
  {
    icon: (
      <div className="flex gap-2 items-center">
        <MapPin className="h-7 w-7 text-accent" />
        <TrendingUp className="h-6 w-6 text-emerald-500" />
      </div>
    ),
    title: 'Enter Any ZIP Code',
    description: 'Type any 5-digit ZIP and optionally add the City/State — then hit Analyze This Market.',
    detail: 'Lead Finder fetches five live FRED indicators for your ZIP: Mortgage Rate (MORTGAGE30US), Active Listing Count (ACTLISCOUUS), Median Days on Market, House Price Index (CSUSHPISA), and Unemployment Rate. Each metric is dated and linked directly to FRED for independent verification.',
    highlight: 'Results are cached for 24 hours so repeated lookups are instant.',
  },
  {
    icon: (
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-1 items-end">
          <div className="h-4 w-4 rounded-sm bg-red-400" />
          <div className="h-6 w-4 rounded-sm bg-amber-400" />
          <div className="h-8 w-4 rounded-sm bg-emerald-400" />
        </div>
        <span className="text-[9px] font-bold text-muted-foreground tracking-widest">SCORE</span>
      </div>
    ),
    title: 'The Opportunity Score',
    description: 'Every market gets a score from 0–100. 71+ is High Opportunity. 41–70 is Emerging. Below 41 is Low.',
    detail: 'The score is calculated from five weighted factors: rising rates (+20 pts), low inventory (+20 pts), high days on market (+15 pts), declining home prices (+15 pts), stable unemployment (+10 pts), and combined momentum signals (+20 pts). The top factors driving the score are shown explicitly — nothing is hidden.',
    highlight: 'High scores = motivated seller prospects. Low scores = buyer opportunities.',
  },
  {
    icon: (
      <div className="flex gap-2">
        <Star className="h-6 w-6 text-amber-500" />
        <Bell className="h-6 w-6 text-accent" />
      </div>
    ),
    title: 'Pin Markets & Get Alerts',
    description: 'Save frequently analyzed markets to your watchlist and receive automatic Market Shift Alerts.',
    detail: 'Click the pin icon on any saved market to keep it at the top of your Saved Markets sidebar. When a pinned market\'s Opportunity Score shifts by 8 or more points since your last analysis, a Market Shift Alert is sent to your Notification Bell — so you\'re always first to know when a ZIP heats up or cools down.',
    highlight: 'Your 3 most recent analyses auto-appear under Recent Searches.',
  },
  {
    icon: (
      <div className="flex gap-2">
        <FileText className="h-6 w-6 text-accent" />
        <Upload className="h-6 w-6 text-muted-foreground" />
      </div>
    ),
    title: 'Playbooks & Lead List Scoring',
    description: 'Generate ready-to-send outreach assets and score your entire lead list in one upload.',
    detail: 'Once you analyze a market, the Prospecting Playbook generates 5 branded outreach assets (postcard copy, email, social post, door hanger, and call script) using the live FRED data as your talking points. The CSV upload tool maps any address list to ZIP-level Opportunity Scores — so you can instantly identify which leads live in your highest-priority markets.',
    highlight: 'Every asset is grounded in data your clients can verify themselves.',
  },
  {
    icon: (
      <div className="relative">
        <Target className="h-8 w-8 text-primary" />
        <Star className="h-3.5 w-3.5 text-amber-400 absolute -top-1 -right-1" />
      </div>
    ),
    title: 'You\'re Ready to Prospect',
    description: 'Enter your first ZIP code and let the data tell you where to focus.',
    detail: 'The most effective agents use Lead Finder weekly — comparing their top ZIP codes and watching for score shifts that signal the right time to increase outreach. Start with ZIPs where you already have listings or sphere contacts, then expand to neighbouring codes.',
    highlight: 'Tap the "How to Use" button at any time to reopen this guide.',
  },
];

interface LeadFinderOnboardingProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function LeadFinderOnboarding({ onComplete, forceShow = false }: LeadFinderOnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed || forceShow) {
      setIsOpen(true);
      setCurrentStep(0);
    }
  }, [forceShow]);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
    else handleDismiss();
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="lead-finder-onboarding-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          key="lead-finder-onboarding-card"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0.18 }}
          className="w-full sm:max-w-lg"
        >
          <Card className="border-0 sm:border-2 sm:border-accent/20 shadow-2xl overflow-hidden rounded-b-none sm:rounded-2xl rounded-t-2xl">
            {/* Header gradient */}
            <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground p-6 pb-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-accent/20 backdrop-blur-sm">
                  {step.icon}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 -mr-1 -mt-1"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold leading-snug">{step.title}</h2>
              <p className="text-primary-foreground/80 mt-1.5 text-sm leading-relaxed">{step.description}</p>
            </div>

            <CardContent className="p-6 space-y-5">
              {/* Detail */}
              <p className="text-sm text-muted-foreground leading-relaxed">{step.detail}</p>

              {/* Highlight pill */}
              {step.highlight && (
                <div className="flex items-start gap-2.5 rounded-lg bg-accent/8 border border-accent/20 px-3 py-2.5">
                  <Star className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-accent/90 font-medium leading-relaxed">{step.highlight}</p>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'bg-accent w-6'
                        : i < currentStep
                        ? 'bg-accent/40 w-2'
                        : 'bg-muted w-2'
                    }`}
                  />
                ))}
              </div>

              {/* Nav buttons */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handlePrev} className="flex-1">
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    Back
                  </Button>
                )}
                <Button
                  variant="accent"
                  onClick={handleNext}
                  className={currentStep === 0 ? 'w-full' : 'flex-1'}
                >
                  {isLast ? 'Start Prospecting' : 'Next'}
                  {!isLast && <ChevronRight className="ml-1.5 h-4 w-4" />}
                </Button>
              </div>

              {!isLast && (
                <button
                  onClick={handleDismiss}
                  className="text-xs text-muted-foreground hover:text-foreground w-full text-center transition-colors"
                >
                  Don't show again
                </button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Trigger button (re-opens the guide) ─────────────────────────────────────

export const LeadFinderOnboardingTrigger = forwardRef<HTMLButtonElement, { className?: string }>(
  ({ className }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <>
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          onClick={() => setShow(true)}
          className={`gap-1.5 text-xs text-muted-foreground hover:text-foreground ${className ?? ''}`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          How to Use
        </Button>
        {show && (
          <LeadFinderOnboarding
            forceShow
            onComplete={() => setShow(false)}
          />
        )}
      </>
    );
  }
);
LeadFinderOnboardingTrigger.displayName = 'LeadFinderOnboardingTrigger';
