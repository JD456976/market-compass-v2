import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Users, Building2, FolderOpen,
  Target, BookmarkCheck, Bell,
  MessageSquare, TrendingUp,
  ChevronRight, ChevronLeft, X, FileText, Trophy, BarChart3,
} from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { getBetaAccessSession } from '@/lib/betaAccess';

const ONBOARDING_COMPLETE_KEY = 'reality_engine_onboarding_complete';
const FIRST_NAME_KEY = 'mc_user_firstname';

function resolveFirstName(authUser: any): string {
  const fromAuth = (authUser?.user_metadata?.full_name as string | undefined)?.split(' ')[0]?.trim();
  if (fromAuth) return fromAuth;
  const fromStorage = localStorage.getItem(FIRST_NAME_KEY)?.trim();
  if (fromStorage) return fromStorage;
  const betaEmail = getBetaAccessSession()?.email;
  if (betaEmail) {
    const local = betaEmail.split('@')[0].replace(/[._\-\d]/g, ' ').trim();
    const words = local.split(' ').filter(Boolean);
    if (words.length) return words[0].charAt(0).toUpperCase() + words[0].slice(1);
  }
  return '';
}

interface OnboardingStep {
  icon: React.ReactNode;
  title: (name: string) => string;
  description: string;
  bullets?: { icon: React.ReactNode; label: string; desc: string }[];
  detail?: string;
  nameStep?: true;
}

const STEPS: OnboardingStep[] = [
  {
    icon: <AppLogo size="md" />,
    title: (name) => name ? `Welcome to Market Compass, ${name}!` : 'Welcome to Market Compass',
    description: 'A decision-support platform built for agents who want data-backed confidence in every conversation.',
    detail: 'Market Compass turns public market data, live mortgage rates, and local signals into shareable client insights — in minutes, not hours.',
    nameStep: true,
  },
  {
    icon: <div className="flex gap-2"><FileText className="h-6 w-6" /><Users className="h-6 w-6" /></div>,
    title: () => 'Client Reports & Conversation Tools',
    description: 'Professional reports and real-time data talking points — for both sides of every deal.',
    bullets: [
      { icon: <Building2 className="h-4 w-4" />, label: 'Buyer & Seller Reports', desc: 'Agent Mode for your analysis, Client Mode for polished share-ready PDFs.' },
      { icon: <MessageSquare className="h-4 w-4" />, label: 'Conversation Coach', desc: 'Objection-handling scripts backed by local DOM and sale-to-list data.' },
      { icon: <TrendingUp className="h-4 w-4" />, label: 'Momentum Map', desc: 'Side-by-side radar chart comparing up to 4 ZIP codes for client presentations.' },
    ],
  },
  {
    icon: <div className="flex gap-2"><Target className="h-6 w-6" /><BookmarkCheck className="h-6 w-6" /></div>,
    title: () => 'Prospecting & Market Intelligence',
    description: 'Find opportunities before they\'re obvious — and stay ahead when the market shifts.',
    bullets: [
      { icon: <Target className="h-4 w-4" />, label: 'Lead Finder', desc: 'Scores ZIP codes using FRED economic data to surface buyer and seller opportunity.' },
      { icon: <Bell className="h-4 w-4" />, label: 'Market Alerts', desc: 'Notifies you when a saved ZIP\'s opportunity score changes by 8+ points.' },
      { icon: <BookmarkCheck className="h-4 w-4" />, label: 'Prospecting Playbook', desc: '5 ready-to-use outreach assets — postcards, emails, social posts — branded for you.' },
    ],
  },
  {
    icon: <div className="flex gap-2"><BarChart3 className="h-6 w-6" /><FolderOpen className="h-6 w-6" /></div>,
    title: () => 'Track, Share & Collaborate',
    description: 'Your win-rate record, working sessions, and client portal all in one place.',
    bullets: [
      { icon: <Trophy className="h-4 w-4" />, label: 'Offer Tracker', desc: 'Log offer outcomes to build a win-rate model with price ratio and escalation trends.' },
      { icon: <FolderOpen className="h-4 w-4" />, label: 'Draft Analyses', desc: 'Save and resume working sessions across all your active clients.' },
      { icon: <Users className="h-4 w-4" />, label: 'Shared Reports & Client Portal', desc: 'Track views, receive scenario submissions, and message clients inside their report.' },
    ],
  },
];

interface AgentOnboardingProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function AgentOnboarding({ onComplete, forceShow = false }: AgentOnboardingProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!completed || forceShow) setIsOpen(true);
  }, [forceShow]);

  useEffect(() => {
    const resolved = resolveFirstName(user);
    setFirstName(resolved);
    setNameInput(resolved);
  }, [user]);

  const saveName = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem(FIRST_NAME_KEY, trimmed);
      setFirstName(trimmed);
    }
  };

  const handleComplete = () => {
    if (nameInput.trim()) saveName(nameInput);
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    if (nameInput.trim()) saveName(nameInput);
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep === 0 && nameInput.trim()) saveName(nameInput);
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    else handleComplete();
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const displayName = nameInput.trim() || firstName;

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
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep + '-' + displayName}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-2xl font-sans font-bold mt-4">
                    {step.title(displayName)}
                  </h2>
                  <p className="text-primary-foreground/80 mt-1">{step.description}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  {step.nameStep && (
                    <div className="mb-5 space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        What should we call you? <span className="normal-case font-normal">(optional)</span>
                      </label>
                      <Input
                        placeholder="Your first name"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleNext()}
                        className="max-w-xs"
                        autoFocus
                      />
                      {nameInput.trim() && (
                        <p className="text-xs text-muted-foreground">
                          We'll use this to personalize your experience.
                        </p>
                      )}
                    </div>
                  )}

                  {!step.bullets && step.detail && (
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                      {step.detail}
                    </p>
                  )}

                  {step.bullets && (
                    <div className="space-y-3 mb-5">
                      {step.bullets.map((b, i) => (
                        <motion.div
                          key={b.label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40"
                        >
                          <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 text-accent">
                            {b.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{b.label}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mb-5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentStep ? 'bg-accent w-6' : i < currentStep ? 'bg-accent/40 w-2' : 'bg-muted w-2'
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
