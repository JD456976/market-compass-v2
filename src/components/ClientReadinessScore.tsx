import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Circle, ChevronRight, ChevronDown, Sparkles, AlertTriangle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  text: string;
  category: 'financial' | 'timing' | 'emotional' | 'practical';
  points: number;
  options: { label: string; value: number; note?: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'preapproval', text: 'Financing status?', category: 'financial', points: 25,
    options: [
      { label: 'Full pre-approval letter in hand', value: 25, note: 'Strongest position' },
      { label: 'Pre-qualified (not yet approved)', value: 12 },
      { label: 'Exploring / haven\'t started', value: 0 },
      { label: 'Cash buyer', value: 25, note: 'Strongest position' },
    ],
  },
  {
    id: 'timeline', text: 'Target move-in timeline?', category: 'timing', points: 15,
    options: [
      { label: 'Flexible — no hard deadline', value: 15, note: 'Reduces pressure' },
      { label: '60–90 days', value: 12 },
      { label: '30–60 days', value: 8 },
      { label: 'ASAP (under 30 days)', value: 4, note: 'May limit options' },
    ],
  },
  {
    id: 'downpayment', text: 'Down payment readiness?', category: 'financial', points: 20,
    options: [
      { label: '20%+ ready to deploy', value: 20, note: 'Avoids PMI + shows strength' },
      { label: '10–19% available', value: 15 },
      { label: '5–9% available', value: 8 },
      { label: 'Less than 5%', value: 3 },
    ],
  },
  {
    id: 'contingency', text: 'Current home situation?', category: 'practical', points: 15,
    options: [
      { label: 'Renting — no contingency needed', value: 15, note: 'Clean offer advantage' },
      { label: 'Current home is listed / in contract', value: 10 },
      { label: 'Need to sell first, not yet listed', value: 4 },
      { label: 'Undecided on current home', value: 0 },
    ],
  },
  {
    id: 'clarity', text: 'How clear is your must-have list?', category: 'emotional', points: 15,
    options: [
      { label: 'Very clear — know exactly what we need', value: 15 },
      { label: 'Mostly clear with some flexibility', value: 10 },
      { label: 'Still defining priorities', value: 5 },
      { label: 'Open to exploring', value: 2 },
    ],
  },
  {
    id: 'decisiveness', text: 'If the right home appeared today, could you make an offer?', category: 'emotional', points: 10,
    options: [
      { label: 'Yes — ready to act immediately', value: 10, note: 'Market-ready' },
      { label: 'Likely yes, within a day or two', value: 7 },
      { label: 'Need a few more showings first', value: 3 },
      { label: 'Not quite — still researching', value: 0 },
    ],
  },
];

const CATEGORY_COLORS: Record<Question['category'], string> = {
  financial: 'text-emerald-500 bg-emerald-500/10',
  timing: 'text-amber-500 bg-amber-500/10',
  emotional: 'text-blue-500 bg-blue-500/10',
  practical: 'text-purple-500 bg-purple-500/10',
};

const CATEGORY_LABELS: Record<Question['category'], string> = {
  financial: 'Financial',
  timing: 'Timing',
  emotional: 'Readiness',
  practical: 'Practical',
};

function getScoreTier(score: number): { label: string; color: string; description: string; advice: string } {
  if (score >= 85) return {
    label: 'Market Ready',
    color: 'text-emerald-500',
    description: 'Your client is well-positioned to compete in most market conditions.',
    advice: 'Focus on offer strategy and move fast when the right property appears.',
  };
  if (score >= 65) return {
    label: 'Nearly Ready',
    color: 'text-amber-500',
    description: 'Strong foundation with a few gaps to address before peak competition.',
    advice: 'Resolve 1–2 key items below before entering a hot-market scenario.',
  };
  if (score >= 40) return {
    label: 'Building Readiness',
    color: 'text-orange-500',
    description: 'Several items need attention before committing to active search.',
    advice: 'Use this score as a preparation roadmap with your client.',
  };
  return {
    label: 'Early Stage',
    color: 'text-destructive',
    description: 'Client is in early planning mode — not yet positioned to compete.',
    advice: 'Set a 30-day goal to address financing and timeline clarity.',
  };
}

interface ClientReadinessScoreProps {
  clientName?: string;
}

export function ClientReadinessScore({ clientName }: ClientReadinessScoreProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const totalPossible = QUESTIONS.reduce((s, q) => s + q.points, 0);
  const earned = Object.values(answers).reduce((s, v) => s + v, 0);
  const score = Math.round((earned / totalPossible) * 100);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === QUESTIONS.length;
  const tier = getScoreTier(score);

  const gaps = QUESTIONS.filter(q => {
    const ans = answers[q.id];
    const max = Math.max(...q.options.map(o => o.value));
    return ans !== undefined && ans < max * 0.6;
  });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                Client Readiness Score
                {clientName && <span className="text-muted-foreground font-normal"> — {clientName}</span>}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allAnswered && (
              <Badge variant={score >= 65 ? 'success' : score >= 40 ? 'warning' : 'destructive'} className="text-xs">
                {score}/100
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{answeredCount}/{QUESTIONS.length} questions answered</span>
            {allAnswered && <span className={cn('font-medium', tier.color)}>{tier.label}</span>}
          </div>
          <Progress value={(answeredCount / QUESTIONS.length) * 100} className="h-1.5" />
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 space-y-4">
              {QUESTIONS.map((q) => (
                <div key={q.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {answers[q.id] !== undefined
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    }
                    <p className="text-sm font-medium">{q.text}</p>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 ml-auto', CATEGORY_COLORS[q.category])}>
                      {CATEGORY_LABELS[q.category]}
                    </Badge>
                  </div>
                  <div className="grid gap-1.5 pl-5">
                    {q.options.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.value }))}
                        className={cn(
                          'text-left text-xs px-3 py-2 rounded-md border transition-all flex items-center justify-between gap-2',
                          answers[q.id] === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 hover:border-border hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span>{opt.label}</span>
                        {opt.note && (
                          <span className={cn('text-[9px] shrink-0', answers[q.id] === opt.value ? 'text-primary/70' : 'text-muted-foreground/60')}>
                            {opt.note}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Score Reveal */}
              {allAnswered && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
                  <Separator />
                  {!revealed ? (
                    <Button className="w-full gap-2" onClick={() => setRevealed(true)}>
                      <Sparkles className="h-4 w-4" />
                      Reveal Readiness Score
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-center py-4">
                        <div className={cn('text-5xl font-bold font-serif', tier.color)}>{score}</div>
                        <div className="text-xs text-muted-foreground mt-1">out of 100</div>
                        <Badge variant="outline" className={cn('mt-2 text-sm', tier.color)}>{tier.label}</Badge>
                        <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">{tier.description}</p>
                      </div>

                      {gaps.length > 0 && (
                        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Focus Areas
                          </div>
                          {gaps.map(g => (
                            <p key={g.id} className="text-xs text-muted-foreground pl-5">• {g.text.replace('?', '')}</p>
                          ))}
                        </div>
                      )}

                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <p className="text-xs text-foreground font-medium">Agent Coaching Note</p>
                        <p className="text-xs text-muted-foreground mt-1">{tier.advice}</p>
                      </div>

                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setAnswers({}); setRevealed(false); }}>
                        Reset & Re-score
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
