import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { runAudit, normalizeText, type AuditFlag, type AuditResult } from '@/lib/listingAuditEngine';
import { extractTextFromPDF } from '@/lib/pdfExtract';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  FileText, ClipboardPaste, Upload, Play, ChevronDown, ChevronUp,
  CheckCircle2, Circle, Copy, Check, Download, AlertTriangle,
  AlertCircle, Info, Sparkles, RotateCcw, Clock, TrendingUp,
  ArrowLeft, Loader2, Eye, BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListingNavigatorOnboarding, ListingNavigatorOnboardingTrigger } from '@/components/ListingNavigatorOnboarding';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedRun {
  id: string;
  created_at: string;
  input_type: string;
  score: number | null;
  summary: { critical: number; moderate: number; presentation: number; positive: number; total: number } | null;
  improved_description: string | null;
  parsed_text: string;
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const dashOffset = circ * (1 - pct);

  const color =
    score >= 80 ? 'hsl(142 72% 29%)' :
    score >= 60 ? 'hsl(35 85% 45%)' :
    score >= 40 ? 'hsl(25 90% 50%)' :
    'hsl(0 72% 51%)';

  const label =
    score >= 80 ? 'Strong' :
    score >= 60 ? 'Fair' :
    score >= 40 ? 'Needs Work' :
    'Critical Issues';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-3xl font-bold font-serif">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Category Config ──────────────────────────────────────────────────────────

const CAT_CONFIG = {
  critical: { icon: AlertCircle, label: 'Critical', bg: 'bg-destructive/8', border: 'border-destructive/25', badge: 'bg-destructive/15 text-destructive border-destructive/30', dot: 'bg-destructive' },
  moderate: { icon: AlertTriangle, label: 'Moderate', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800/40', badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40', dot: 'bg-orange-500' },
  presentation: { icon: Info, label: 'Presentation', bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-yellow-200 dark:border-yellow-800/40', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800/40', dot: 'bg-yellow-500' },
  positive: { icon: CheckCircle2, label: 'Positive Signal', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800/40', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500' },
};

// ─── Flag Card ────────────────────────────────────────────────────────────────

function FlagCard({
  flag,
  onToggleAddressed,
  saving,
}: {
  flag: AuditFlag & { id?: string };
  onToggleAddressed: (flag: AuditFlag & { id?: string }) => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CAT_CONFIG[flag.category];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border transition-all duration-200',
        cfg.bg, cfg.border,
        flag.addressed && 'opacity-50'
      )}
    >
      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="mt-0.5 shrink-0">
          <Icon className={cn('h-4 w-4', flag.category === 'positive' ? 'text-emerald-600' : flag.category === 'critical' ? 'text-destructive' : flag.category === 'moderate' ? 'text-orange-500' : 'text-yellow-600')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-sm font-medium', flag.addressed && 'line-through text-muted-foreground')}>{flag.title}</span>
            {flag.category !== 'positive' && (
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', cfg.badge)}>
                Severity {flag.severity}/5
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{flag.why_it_matters}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {flag.category !== 'positive' && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleAddressed(flag); }}
              disabled={saving}
              className="p-1 rounded hover:bg-background/60 transition-colors"
              title={flag.addressed ? 'Mark unaddressed' : 'Mark addressed'}
            >
              {flag.addressed
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <Circle className="h-4 w-4 text-muted-foreground/50" />
              }
            </button>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <Separator className="opacity-40" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Suggested Angles</p>
                <ul className="space-y-1.5">
                  {flag.suggested_angles.map((angle, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                      <span>{angle}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {Object.keys(flag.evidence || {}).length > 0 && flag.category !== 'positive' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Evidence</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(flag.evidence || {}).map(([k, v]) => (
                      <span key={k} className="text-xs bg-background/60 rounded px-2 py-0.5 border border-border/50 text-muted-foreground">
                        {k.replace(/_/g, ' ')}: {JSON.stringify(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────

function ResultsPanel({
  result,
  runId,
  onReset,
  initialImproved,
}: {
  result: AuditResult;
  runId: string | null;
  onReset: () => void;
  initialImproved: string;
}) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<(AuditFlag & { id?: string })[]>(result.flags);
  const [activeTab, setActiveTab] = useState<'results' | 'rewrite'>('results');
  const [improved, setImproved] = useState(initialImproved);
  const [copied, setCopied] = useState(false);
  const [savingFlag, setSavingFlag] = useState(false);
  const [savingImproved, setSavingImproved] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const grouped = {
    critical: flags.filter(f => f.category === 'critical'),
    moderate: flags.filter(f => f.category === 'moderate'),
    presentation: flags.filter(f => f.category === 'presentation'),
    positive: flags.filter(f => f.category === 'positive'),
  };

  const handleToggleAddressed = async (flag: AuditFlag & { id?: string }) => {
    if (!runId || !user) return;
    const newVal = !flag.addressed;
    setSavingFlag(true);
    try {
      if (flag.id) {
        await supabase.from('listing_navigator_flags')
          .update({ addressed: newVal, addressed_at: newVal ? new Date().toISOString() : null })
          .eq('id', flag.id);
      }
      setFlags(prev => prev.map(f => f.rule_key === flag.rule_key ? { ...f, addressed: newVal } : f));
    } finally {
      setSavingFlag(false);
    }
  };

  const handleImprovedChange = (val: string) => {
    setImproved(val);
    if (!runId || !user) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSavingImproved(true);
      await supabase.from('listing_navigator_runs').update({ improved_description: val }).eq('id', runId);
      setSavingImproved(false);
    }, 1200);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(improved);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([improved], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'improved-listing.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const openIssues = flags.filter(f => f.category !== 'positive' && !f.addressed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onReset} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> New Audit
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('results')}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', activeTab === 'results' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}
          >
            Audit Results
          </button>
          <button
            onClick={() => setActiveTab('rewrite')}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', activeTab === 'rewrite' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}
          >
            Rewrite Workspace
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
            {/* Score + Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ScoreRing score={result.score} />
                  <div className="flex-1 space-y-3 w-full">
                    <h2 className="font-serif text-xl font-semibold">Listing Audit Score</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['critical', 'moderate', 'presentation', 'positive'] as const).map(cat => {
                        const cfg = CAT_CONFIG[cat];
                        const count = result.summary[cat];
                        return (
                          <div key={cat} className={cn('rounded-lg p-3 border text-center', cfg.bg, cfg.border)}>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
                          </div>
                        );
                      })}
                    </div>
                    {openIssues.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{openIssues.length} open issue{openIssues.length !== 1 ? 's' : ''}</span> remaining — check off each as you address it in your rewrite.
                      </p>
                    )}
                    {openIssues.length === 0 && result.summary.total > 0 && (
                      <p className="text-sm text-emerald-600 font-medium">✓ All issues marked addressed — ready to rewrite!</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flags by category */}
            {(['critical', 'moderate', 'presentation', 'positive'] as const).map(cat => {
              const catFlags = grouped[cat];
              if (catFlags.length === 0) return null;
              const cfg = CAT_CONFIG[cat];
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-full', cfg.dot)} />
                    <h3 className="font-medium text-sm">{cfg.label} ({catFlags.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {catFlags.map(flag => (
                      <FlagCard key={flag.rule_key} flag={flag} onToggleAddressed={handleToggleAddressed} saving={savingFlag} />
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'rewrite' && (
          <motion.div key="rewrite" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">Improved Listing Description</CardTitle>
                  <div className="flex items-center gap-2">
                    {savingImproved && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>}
                    <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 gap-1.5">
                      {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownload} className="h-8 gap-1.5">
                      <Download className="h-3.5 w-3.5" /> .txt
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={improved}
                  onChange={e => handleImprovedChange(e.target.value)}
                  placeholder="Write your improved listing description here. Use the audit flags on the right (or toggle back to Audit Results) to guide your rewrite.&#10;&#10;Tips:&#10;• Lead with your strongest differentiator&#10;• Use specific measurements and years&#10;• Replace generic phrases with verifiable details&#10;• Structure in 3-4 focused paragraphs"
                  className="min-h-[360px] font-mono text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground">{improved.length} characters · Auto-saved to your run history</p>
              </CardContent>
            </Card>

            {/* Quick reference — open flags only */}
            {openIssues.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" /> Quick Reference — {openIssues.length} Open Issue{openIssues.length !== 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {openIssues.map(flag => {
                    const cfg = CAT_CONFIG[flag.category];
                    return (
                      <div key={flag.rule_key} className={cn('rounded-lg border p-3', cfg.bg, cfg.border)}>
                        <p className="text-xs font-medium">{flag.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{flag.suggested_angles[0]}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Run History ──────────────────────────────────────────────────────────────

function RunHistory({ onSelect }: { onSelect: (run: SavedRun) => void }) {
  const { user } = useAuth();
  const { data: runs, isLoading } = useQuery({
    queryKey: ['listing-navigator-runs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('listing_navigator_runs')
        .select('id, created_at, input_type, score, summary, improved_description, parsed_text')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as SavedRun[];
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading history…</div>;
  if (!runs?.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Clock className="h-4 w-4" /> Recent Audits</h3>
      <div className="space-y-2">
        {runs.map(run => {
          const summary = run.summary as SavedRun['summary'];
          return (
            <button
              key={run.id}
              onClick={() => onSelect(run)}
              className="w-full text-left rounded-xl border border-border/60 p-3 hover:bg-muted/40 hover:border-border transition-all"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {run.input_type === 'pdf' ? '📄' : '📋'} Audit from {new Date(run.created_at).toLocaleDateString()}
                </span>
                {run.score !== null && (
                  <span className={cn('text-sm font-bold', run.score >= 80 ? 'text-emerald-600' : run.score >= 60 ? 'text-yellow-600' : 'text-destructive')}>
                    Score: {run.score}
                  </span>
                )}
              </div>
              {summary && (
                <div className="flex items-center gap-3 mt-1.5">
                  {summary.critical > 0 && <span className="text-xs text-destructive">{summary.critical} critical</span>}
                  {summary.moderate > 0 && <span className="text-xs text-orange-500">{summary.moderate} moderate</span>}
                  {summary.positive > 0 && <span className="text-xs text-emerald-600">{summary.positive} positive</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type InputMode = 'paste' | 'pdf';
type Phase = 'input' | 'pdf-review' | 'results';

export default function ListingNavigator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>('input');
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [pasteText, setPasteText] = useState('');
  const [parsedText, setParsedText] = useState('');
  const [rawText, setRawText] = useState('');
  const [running, setRunning] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [initialImproved, setInitialImproved] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── PDF Upload ──────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid file', description: 'Please upload a PDF file.', variant: 'destructive' });
      return;
    }
    setPdfLoading(true);
    try {
      const text = await extractTextFromPDF(file);
      const cleaned = normalizeText(text);
      setRawText(text);
      setParsedText(cleaned);
      setPhase('pdf-review');
    } catch (err) {
      toast({ title: 'PDF extraction failed', description: 'Could not read text from this PDF. Try pasting the text instead.', variant: 'destructive' });
    } finally {
      setPdfLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Run Audit ──────────────────────────────────────────────────────────
  const handleRunAudit = useCallback(async () => {
    const textToAudit = inputMode === 'paste' ? pasteText : parsedText;
    if (!textToAudit.trim()) {
      toast({ title: 'No text to audit', description: 'Paste or upload listing text first.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to save and view your audit results.', variant: 'destructive' });
      return;
    }

    setRunning(true);
    try {
      const result = runAudit(textToAudit);

      // Save run to DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: runRow, error: runErr } = await (supabase as any)
        .from('listing_navigator_runs')
        .insert({
          user_id: user.id,
          input_type: inputMode,
          raw_text: inputMode === 'paste' ? textToAudit : rawText,
          parsed_text: textToAudit,
          score: result.score,
          summary: result.summary,
          property_hint: result.propertyHint,
        })
        .select('id')
        .single();

      if (runErr || !runRow) throw runErr;

      // Save flags
      if (result.flags.length > 0) {
        const flagRows = result.flags.map(f => ({
          run_id: runRow.id,
          rule_key: f.rule_key,
          category: f.category,
          severity: f.severity,
          title: f.title,
          why_it_matters: f.why_it_matters,
          evidence: f.evidence as unknown as import('@/integrations/supabase/types').Json,
          suggested_angles: f.suggested_angles as unknown as import('@/integrations/supabase/types').Json,
          addressed: false,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: flagData } = await (supabase as any).from('listing_navigator_flags').insert(flagRows).select('id, rule_key');
        // Merge IDs back into flags
        if (flagData) {
          const idMap = Object.fromEntries(flagData.map(f => [f.rule_key, f.id]));
          result.flags.forEach(f => { (f as AuditFlag & { id?: string }).id = idMap[f.rule_key]; });
        }
      }

      setCurrentRunId(runRow.id);
      setAuditResult(result);
      setInitialImproved('');
      setPhase('results');
      queryClient.invalidateQueries({ queryKey: ['listing-navigator-runs', user.id] });
    } catch (err) {
      toast({ title: 'Error saving audit', description: 'Audit ran successfully but could not be saved. Results shown below.', variant: 'destructive' });
      const result = runAudit(textToAudit);
      setAuditResult(result);
      setPhase('results');
    } finally {
      setRunning(false);
    }
  }, [inputMode, pasteText, parsedText, rawText, user, queryClient]);

  // ── Load saved run ──────────────────────────────────────────────────────
  const handleSelectRun = async (run: SavedRun) => {
    setRunning(true);
    try {
      // Re-run engine on parsed_text to rebuild flags (or fetch from DB)
      const { data: dbFlags } = await supabase
        .from('listing_navigator_flags')
        .select('*')
        .eq('run_id', run.id)
        .order('severity', { ascending: false });

      if (dbFlags && dbFlags.length > 0) {
        const flags: (AuditFlag & { id: string })[] = dbFlags.map(f => ({
          id: f.id,
          rule_key: f.rule_key,
          category: f.category as AuditFlag['category'],
          severity: f.severity,
          title: f.title,
          why_it_matters: f.why_it_matters,
          evidence: (f.evidence as Record<string, unknown>) || {},
          suggested_angles: (f.suggested_angles as string[]) || [],
          addressed: f.addressed,
        }));
        const summary = run.summary || { critical: 0, moderate: 0, presentation: 0, positive: 0, total: 0 };
        setAuditResult({ score: run.score ?? 0, flags, propertyHint: {}, summary });
      } else {
        // Fallback: re-run engine
        const result = runAudit(run.parsed_text);
        setAuditResult(result);
      }

      setCurrentRunId(run.id);
      setInitialImproved(run.improved_description || '');
      setPhase('results');
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setPhase('input');
    setAuditResult(null);
    setCurrentRunId(null);
    setPasteText('');
    setParsedText('');
    setRawText('');
    setInitialImproved('');
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 sticky top-14 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl font-semibold flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" />
                Listing Navigator
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Rule-based audit · No AI · Instant results</p>
            </div>
            <ListingNavigatorOnboardingTrigger />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <ListingNavigatorOnboarding />

        <AnimatePresence mode="wait">
          {/* ── INPUT PHASE ── */}
          {(phase === 'input' || phase === 'pdf-review') && (
            <motion.div key="input" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
              {/* Mode toggle */}
              <div className="flex gap-2">
                {(['paste', 'pdf'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setInputMode(mode); if (mode === 'paste') setPhase('input'); }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                      inputMode === mode
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                    )}
                  >
                    {mode === 'paste' ? <ClipboardPaste className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                    {mode === 'paste' ? 'Paste MLS Text' : 'Upload PDF'}
                  </button>
                ))}
              </div>

              {/* Paste mode */}
              {inputMode === 'paste' && phase === 'input' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><ClipboardPaste className="h-4 w-4" /> MLS Listing Text</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder="Paste the full MLS listing remarks here — include property description, feature notes, and any agent remarks. The more complete the text, the more accurate the audit.

Example: 'Welcome to this 4-bedroom colonial at 12 Elm Street. The sun-filled home features an updated kitchen with granite counters and stainless appliances, hardwood floors throughout, and a heated workshop in the backyard. 100-amp electrical. Price improved from $875,000...'
"
                      className="min-h-[280px] text-sm resize-y font-mono"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{pasteText.length} characters</span>
                      <Button onClick={handleRunAudit} disabled={running || !pasteText.trim()} className="gap-2">
                        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        {running ? 'Running Audit…' : 'Run Audit'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PDF mode — upload trigger */}
              {inputMode === 'pdf' && phase === 'input' && (
                <Card>
                  <CardContent className="pt-6">
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all"
                      onClick={() => fileRef.current?.click()}
                    >
                      {pdfLoading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-10 w-10 text-primary animate-spin" />
                          <p className="text-sm text-muted-foreground">Extracting text from PDF…</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="h-10 w-10 text-muted-foreground/50" />
                          <div>
                            <p className="font-medium">Drop or click to upload MLS PDF</p>
                            <p className="text-sm text-muted-foreground mt-1">Best effort text extraction — you can edit before running audit</p>
                          </div>
                          <Button variant="outline" size="sm" type="button">Browse Files</Button>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                  </CardContent>
                </Card>
              )}

              {/* PDF review — edit parsed text before audit */}
              {phase === 'pdf-review' && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-600" /> Extracted Text — Review Before Audit</CardTitle>
                      <button onClick={() => setPhase('input')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Re-upload</button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">Text extracted from PDF. Edit to correct any OCR issues before running the audit.</p>
                    <Textarea
                      value={parsedText}
                      onChange={e => setParsedText(e.target.value)}
                      className="min-h-[280px] text-sm resize-y font-mono"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{parsedText.length} characters extracted</span>
                      <Button onClick={handleRunAudit} disabled={running || !parsedText.trim()} className="gap-2">
                        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        {running ? 'Running Audit…' : 'Run Audit'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Run history */}
              {phase === 'input' && <RunHistory onSelect={handleSelectRun} />}
            </motion.div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === 'results' && auditResult && (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <ResultsPanel
                result={auditResult}
                runId={currentRunId}
                onReset={handleReset}
                initialImproved={initialImproved}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
