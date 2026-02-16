import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, MessageSquare, Layers, 
  ChevronRight, ChevronLeft, X, Play, Shield
} from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';

const CLIENT_ONBOARDING_KEY = 'mc_client_onboarding_complete';

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
    description: 'Your agent has shared property analysis reports designed to help you make confident decisions.',
    detail: 'Market Compass provides clear, data-backed insights into your real estate scenarios — whether you\'re buying or selling.',
  },
  {
    icon: <FileText className="h-8 w-8" />,
    title: 'Your Reports',
    description: 'View detailed property reports shared by your agent.',
    detail: 'Each report includes likelihood assessments, market context, and risk analysis. You can revisit them anytime from your dashboard.',
  },
  {
    icon: <div className="flex gap-2"><MessageSquare className="h-6 w-6" /><Layers className="h-6 w-6" /></div>,
    title: 'Collaborate with Your Agent',
    description: 'Send messages and explore what-if scenarios directly in each report.',
    detail: 'Use the messaging feature to ask questions and the Scenario Explorer to model different offer or pricing strategies. Your agent reviews all submissions.',
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: 'Privacy & Accuracy',
    description: 'Your data is protected. Property addresses are never exposed in shared views.',
    detail: 'Market Compass uses public market trend data and transaction logic. It does not provide valuations or use confidential MLS data.',
  },
  {
    icon: <Play className="h-8 w-8" />,
    title: 'You\'re All Set',
    description: 'Head to your reports to get started.',
    detail: 'You can always re-watch this guide from the menu. If you have questions, message your agent directly through any report.',
  },
];

interface ClientOnboardingProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function ClientOnboarding({ onComplete, forceShow = false }: ClientOnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(CLIENT_ONBOARDING_KEY);
    if (!completed || forceShow) {
      setIsOpen(true);
    }
  }, [forceShow]);

  const handleComplete = () => {
    localStorage.setItem(CLIENT_ONBOARDING_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(CLIENT_ONBOARDING_KEY, 'true');
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
              {step.detail && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  {step.detail}
                </p>
              )}

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

export function ClientOnboardingTrigger({ className }: { className?: string }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setShowOnboarding(true)}
        className={className}
      >
        <AppLogo size="sm" className="mr-2" />
        How It Works
      </Button>
      {showOnboarding && (
        <ClientOnboarding 
          forceShow={true} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}
    </>
  );
}
