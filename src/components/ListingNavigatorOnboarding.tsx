import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, ChevronLeft, ChevronRight, X, Play, ClipboardPaste, Upload, BarChart3, FileEdit, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'listing_navigator_onboarding_complete';

const STEPS = [
  {
    icon: Eye,
    title: 'Listing Navigator',
    subtitle: 'A rule-based audit tool for MLS listings',
    description: 'Listing Navigator analyzes your MLS listing text using deterministic rules — no AI, no guesswork. Get actionable, explainable feedback in seconds.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: ClipboardPaste,
    title: 'Paste or Upload',
    subtitle: 'Two ways to input a listing',
    description: 'Paste MLS remarks directly from your clipboard, or upload a PDF listing sheet. For PDFs, you can review and correct the extracted text before the audit runs.',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: BarChart3,
    title: 'Listing Audit Score',
    subtitle: 'A 0–100 score with category breakdown',
    description: 'Every listing gets a score and categorized flags: Critical (red), Moderate (orange), Presentation (yellow), and Positive Signals (green). Each flag explains exactly why it matters.',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  {
    icon: CheckCircle2,
    title: 'Suggested Angles',
    subtitle: 'Practical guidance, not generic advice',
    description: 'Every flag comes with 3–6 specific, templated suggestions — things you can actually say or do. Mark flags as addressed as you work through your rewrite.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    icon: FileEdit,
    title: 'Rewrite Workspace',
    subtitle: 'Write the improved version yourself',
    description: 'Switch to the Rewrite Workspace tab to write your improved listing description. Reference open flags inline, then copy to clipboard or download as .txt — auto-saved as you type.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

// ─── Onboarding Modal ─────────────────────────────────────────────────────────

export function ListingNavigatorOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
    setStep(0);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleDismiss();
  };

  const handlePrev = () => setStep(s => Math.max(0, s - 1));

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Close */}
              <div className="flex justify-end p-3 pb-0">
                <button onClick={handleDismiss} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="px-6 pb-6 pt-2 space-y-4"
                >
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', current.bgColor)}>
                    <Icon className={cn('h-7 w-7', current.color)} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{current.subtitle}</p>
                    <h2 className="font-sans text-xl font-semibold mt-0.5">{current.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
                </motion.div>
              </AnimatePresence>

              {/* Step dots + navigation */}
              <div className="flex items-center justify-between px-6 pb-5">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <button key={i} onClick={() => setStep(i)} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30')} />
                  ))}
                </div>
                <div className="flex gap-2">
                  {step > 0 && (
                    <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                  )}
                  <Button size="sm" onClick={handleNext} className="gap-1">
                    {step < STEPS.length - 1 ? <><ChevronRight className="h-4 w-4" /> Next</> : <><Play className="h-4 w-4" /> Get Started</>}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Trigger Button ───────────────────────────────────────────────────────────

export function ListingNavigatorOnboardingTrigger() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const handleDismiss = () => { setOpen(false); setStep(0); };
  const handleNext = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else handleDismiss(); };
  const handlePrev = () => setStep(s => Math.max(0, s - 1));

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setStep(0); setOpen(true); }} className="gap-1.5">
        <Eye className="h-3.5 w-3.5" /> How to Use
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 30, stiffness: 400 }} className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                <div className="h-1 bg-muted">
                  <motion.div className="h-full bg-primary" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.3 }} />
                </div>
                <div className="flex justify-end p-3 pb-0">
                  <button onClick={handleDismiss} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="px-6 pb-6 pt-2 space-y-4">
                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', current.bgColor)}>
                      <Icon className={cn('h-7 w-7', current.color)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{current.subtitle}</p>
                      <h2 className="font-sans text-xl font-semibold mt-0.5">{current.title}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
                  </motion.div>
                </AnimatePresence>
                <div className="flex items-center justify-between px-6 pb-5">
                  <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <button key={i} onClick={() => setStep(i)} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30')} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {step > 0 && <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1"><ChevronLeft className="h-4 w-4" /> Back</Button>}
                    <Button size="sm" onClick={handleNext} className="gap-1">
                      {step < STEPS.length - 1 ? <><ChevronRight className="h-4 w-4" /> Next</> : <><Play className="h-4 w-4" /> Done</>}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
