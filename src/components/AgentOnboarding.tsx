import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Compass, Users, Building2, FolderOpen, FileText, Send, 
  Database, ChevronRight, ChevronLeft, X, Play
} from 'lucide-react';

const ONBOARDING_COMPLETE_KEY = 'reality_engine_onboarding_complete';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail?: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Compass className="h-8 w-8" />,
    title: 'Welcome to Market Compass',
    description: 'A decision-support tool that helps you navigate buyer and seller scenarios with clarity.',
    detail: 'Market Compass uses public market trend data and transaction logic to help understand tradeoffs — not to predict outcomes.',
  },
  {
    icon: <div className="flex gap-2"><Users className="h-6 w-6" /><Building2 className="h-6 w-6" /></div>,
    title: 'Agent Mode vs Client Mode',
    description: 'Switch between internal analysis and client-ready views.',
    detail: 'Agent Mode shows full grounding data, explanations, and editing tools. Client Mode shows polished reports safe for sharing. Share links and PDF exports are only available in Client Mode.',
  },
  {
    icon: <div className="flex gap-2"><FolderOpen className="h-6 w-6" /><FileText className="h-6 w-6" /><Send className="h-6 w-6" /></div>,
    title: 'Drafts, Templates & Shared Reports',
    description: 'Three distinct workspaces for different purposes.',
    detail: 'Draft Analyses are your working sessions — editable and comparable. Templates save your preferred defaults (never client data). Shared Reports log what you\'ve sent to clients.',
  },
  {
    icon: <Database className="h-8 w-8" />,
    title: 'Market Data',
    description: 'Town-level market snapshots anchor your assumptions.',
    detail: 'When you enter an address, Market Compass looks for a matching snapshot (median DOM, sale-to-list ratio). If none exists, it uses a generic baseline and flags this in Agent Mode.',
  },
  {
    icon: <Play className="h-8 w-8" />,
    title: 'Ready to Start',
    description: 'Create a Buyer or Seller report to begin.',
    detail: 'You can always access this guide later from the home screen. Have questions? Check Data & Methodology for how the tool works.',
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
    // Check if onboarding has been completed
    const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!completed || forceShow) {
      setIsOpen(true);
    }
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
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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
              <h2 className="text-2xl font-serif font-bold mt-4">{step.title}</h2>
              <p className="text-primary-foreground/80 mt-1">{step.description}</p>
            </div>

            <CardContent className="p-6">
              {/* Detail */}
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
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentStep 
                        ? 'bg-accent w-6' 
                        : i < currentStep 
                        ? 'bg-accent/40' 
                        : 'bg-muted'
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

              {/* Don't show again link */}
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

// Trigger button to re-open onboarding - matches other nav buttons
export function OnboardingTrigger({ className }: { className?: string }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="lg"
        onClick={() => setShowOnboarding(true)}
        className={`min-w-[160px] ${className || ''}`}
      >
        <Compass className="mr-2 h-4 w-4" />
        How It Works
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
