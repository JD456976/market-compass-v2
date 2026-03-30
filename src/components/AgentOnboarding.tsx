import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Building2, FolderOpen, Send,
  Target, Trophy, BookmarkCheck, Bell, Compass,
  MessageSquare, TrendingUp,
  ChevronRight, ChevronLeft, X, Play,
} from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';

const ONBOARDING_COMPLETE_KEY = 'reality_engine_onboarding_complete';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail?: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <AppLogo size="md" />,
    title: 'Welcome to Market Compass',
    description: 'A decision-support platform built for real estate agents who want data-backed confidence in every conversation.',
    detail: 'Market Compass uses public market trend data, live mortgage rates, and your local signals to help clients understand tradeoffs — not to predict outcomes. Every insight is grounded, explainable, and shareable.',
  },
  {
    icon: <div className="flex gap-2"><Users className="h-6 w-6" /><Building2 className="h-6 w-6" /></div>,
    title: 'Buyer & Seller Reports',
    description: 'Create professional, data-backed reports for any side of a transaction in minutes.',
    detail: 'Agent Mode shows full grounding data, editable fields, and strategy notes. Client Mode produces polished, share-ready reports. PDF exports and share links are available in Client Mode — and your branding carries through both.',
  },
  {
    icon: <div className="flex gap-3"><Target className="h-6 w-6" /><Trophy className="h-6 w-6" /></div>,
    title: 'Lead Finder & Offer Tracker',
    description: 'Identify high-opportunity markets and build a personal win-rate record.',
    detail: 'Lead Finder analyzes FRED economic data across ZIP codes to score buyer and seller opportunity. Offer Tracker logs your offer outcomes to build a win-rate model — showing your price ratio, escalation effectiveness, and competitive patterns over time.',
  },
  {
    icon: <div className="flex gap-3"><BookmarkCheck className="h-6 w-6" /><Bell className="h-6 w-6" /></div>,
    title: 'Playbooks & Market Alerts',
    description: 'Save personalized outreach scripts and get notified when market opportunity shifts.',
    detail: 'The Prospecting Playbook generates 5 ready-to-use outreach assets (postcards, emails, social posts, door hangers, call scripts) branded with your name and CTA. Market Shift Alerts notify you when a saved ZIP\'s Opportunity Score changes by 8+ points — so you\'re always ahead of the curve.',
  },
  {
    icon: <div className="flex gap-3"><MessageSquare className="h-6 w-6" /><TrendingUp className="h-6 w-6" /></div>,
    title: 'Conversation Coach & Momentum Map',
    description: 'Handle seller objections with data and visualize neighborhood trends side-by-side.',
    detail: 'The Seller Conversation Coach generates objection-handling scripts backed by local DOM and sale-to-list data. The Neighborhood Momentum Map lets you compare up to 4 ZIP codes on a radar chart — perfect for showing clients why location timing matters.',
  },
  {
    icon: <div className="flex gap-3"><FolderOpen className="h-6 w-6" /><Send className="h-6 w-6" /></div>,
    title: 'Drafts, Shared Reports & Client Portal',
    description: 'Manage your working sessions, track client views, and invite clients to collaborate.',
    detail: 'Draft Analyses are your editable sessions. Shared Reports log what you\'ve sent — with view tracking, messaging, and scenario submissions built in. Invite clients to the portal so they can explore what-if scenarios and message you directly within their report.',
  },
  {
    icon: <div className="flex gap-1"><Compass className="h-8 w-8" /></div>,
    title: 'Ready to Start',
    description: 'Create a Buyer or Seller report, or explore Lead Finder to find your next opportunity.',
    detail: 'You can always re-open this guide from the home screen. Check Data & Methodology to understand how every score is calculated. Your agent profile and branding settings apply everywhere automatically.',
  },
];

interface AgentOnboardingProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function AgentOnboarding({ onComplete, forceShow = false }: AgentOnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!completed || forceShow) setIsOpen(true);
  }, [forceShow]);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else handleComplete();
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <Card className="border-2 border-accent/20 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-accent/20 text-accent">
                  {step.icon}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={handleSkip}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-2xl font-sans font-bold mt-4">{step.title}</h2>
              <p className="text-primary-foreground/80 mt-1">{step.description}</p>
            </div>

            <CardContent className="p-6">
              {step.detail && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  {step.detail}
                </p>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-6">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentStep ? 'bg-accent w-6' : i < currentStep ? 'bg-accent/40 w-2' : 'bg-muted w-2'
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handlePrev} className="flex-1">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
                <Button
                  variant="accent"
                  onClick={handleNext}
                  className={currentStep === 0 ? 'w-full' : 'flex-1'}
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                  {!isLastStep && <ChevronRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground mt-4 w-full text-center"
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

// ─── Trigger ──────────────────────────────────────────────────────────────────

export const OnboardingTrigger = forwardRef<HTMLButtonElement, { className?: string }>(
  ({ className }, ref) => {
    const [showOnboarding, setShowOnboarding] = useState(false);

    return (
      <>
        <Button
          ref={ref}
          variant="outline"
          size="lg"
          onClick={() => setShowOnboarding(true)}
          className={`w-full justify-start flex-col items-start h-auto py-3 gap-0.5 ${className || ''}`}
        >
          <span className="flex items-center w-full">
            <AppLogo size="sm" className="mr-2 flex-shrink-0" />
            <span className="truncate">How It Works</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-normal pl-6">Tour the key features and workflow</span>
        </Button>
        {showOnboarding && (
          <AgentOnboarding
            forceShow={true}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
      </>
    );
  }
);
OnboardingTrigger.displayName = 'OnboardingTrigger';
