import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { runAudit, normalizeText, type AuditFlag, type AuditResult, type PropertyHint, extractPropertyHints } from '@/lib/listingAuditEngine';
import { extractTextFromPDF } from '@/lib/pdfExtract';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  FileText, ClipboardPaste, Upload, Play, ChevronDown, ChevronUp,
  CheckCircle2, Circle, Copy, Check, Download, AlertTriangle,
  AlertCircle, Info, RotateCcw, Clock, TrendingUp, TrendingDown,
  ArrowLeft, Loader2, Eye, BookOpen, Home, Building2,
  FileDown, ArrowUpRight, MapPin, Hash, ChevronRight,
  Sparkles, Minus, Trash2, Pencil, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListingNavigatorOnboarding, ListingNavigatorOnboardingTrigger } from '@/components/ListingNavigatorOnboarding';
import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedRun {
  id: string;
  created_at: string;
  input_type: string;
  score: number | null;
  summary: { critical: number; moderate: number; presentation: number; positive: number; total: number } | null;
  improved_description: string | null;
  parsed_text: string;
  property_address: string | null;
  mls_number: string | null;
  listing_label: string | null;
}

interface PropertyGroup {
  key: string;
  address: string | null;
  mls_number: string | null;
  runs: SavedRun[];
  bestScore: number | null;
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

// ─── Property Hint Display Card ───────────────────────────────────────────────

function PropertyHintCard({ hint }: { hint: PropertyHint }) {
  const fields: { label: string; value: string | undefined }[] = [
    { label: 'Price', value: hint.price ? `$${hint.price.toLocaleString()}` : undefined },
    { label: 'Year Built', value: hint.yearBuilt?.toString() },
    { label: 'Beds', value: hint.beds?.toString() },
    { label: 'Full Baths', value: hint.fullBaths?.toString() },
    { label: 'Sqft', value: hint.sqft ? `${hint.sqft.toLocaleString()} sq ft` : undefined },
    { label: 'Garage', value: hint.garage !== undefined ? (hint.garage === 0 ? 'None' : `${hint.garage}-car`) : undefined },
    { label: 'DOM', value: hint.dom !== undefined ? `${hint.dom} days` : undefined },
    { label: 'Assessed Value', value: hint.assessedValue ? `$${hint.assessedValue.toLocaleString()}` : undefined },
  ].filter(f => f.value !== undefined);

  if (!fields.length) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" /> Auto-Detected Property Details
        </CardTitle>
        <p className="text-xs text-muted-foreground">These values were extracted from the listing text and used to apply price-sensitive and year-based rules. If anything looks wrong, edit your text and re-run.</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {fields.map(f => (
            <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-medium">
              <span className="text-muted-foreground">{f.label}:</span>
              <span>{f.value}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Flag Card ────────────────────────────────────────────────────────────────

function FlagCard({
  flag, onToggleAddressed, saving,
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
          <Icon className={cn('h-4 w-4',
            flag.category === 'positive' ? 'text-emerald-600' :
            flag.category === 'critical' ? 'text-destructive' :
            flag.category === 'moderate' ? 'text-orange-500' :
            'text-yellow-600'
          )} />
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
  result, runId, runMeta, onReset, initialImproved,
}: {
  result: AuditResult;
  runId: string | null;
  runMeta: { address?: string; mls_number?: string } | null;
  onReset: () => void;
  initialImproved: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flags, setFlags] = useState<(AuditFlag & { id?: string })[]>(result.flags);
  const [activeTab, setActiveTab] = useState<'results' | 'rewrite'>('results');
  const [improved, setImproved] = useState(initialImproved);
  const [copied, setCopied] = useState(false);
  const [savingFlag, setSavingFlag] = useState(false);
  const [savingImproved, setSavingImproved] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const grouped = {
    critical: flags.filter(f => f.category === 'critical'),
    moderate: flags.filter(f => f.category === 'moderate'),
    presentation: flags.filter(f => f.category === 'presentation'),
    positive: flags.filter(f => f.category === 'positive'),
  };

  const allIssues = flags.filter(f => f.category !== 'positive');
  const addressedCount = allIssues.filter(f => f.addressed).length;
  const progressPct = allIssues.length > 0 ? Math.round((addressedCount / allIssues.length) * 100) : 100;
  const openIssues = allIssues.filter(f => !f.addressed);

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

  const handleDownloadTxt = () => {
    const blob = new Blob([improved], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'improved-listing.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    console.log('[LN] Starting PDF export...');
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 18;
      const contentW = pageW - margin * 2;
      let y = margin;

      // Header
      doc.setFillColor(34, 52, 74);
      doc.rect(0, 0, pageW, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Listing Navigator — Audit Report', margin, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const meta = runMeta?.address ? runMeta.address : 'Market Compass';
      const mlsStr = runMeta?.mls_number ? ` · MLS# ${runMeta.mls_number}` : '';
      doc.text(`${meta}${mlsStr} · ${new Date().toLocaleDateString()}`, margin, 21);
      y = 36;

      // Score bar
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`Audit Score: ${result.score}/100`, margin, y);
      const scoreColor = result.score >= 80 ? [34, 139, 34] : result.score >= 60 ? [200, 130, 0] : [180, 40, 40];
      doc.setFillColor(...(scoreColor as [number, number, number]));
      doc.roundedRect(margin, y + 3, (contentW * result.score) / 100, 5, 1, 1, 'F');
      doc.setFillColor(220, 220, 220);
      doc.roundedRect(margin + (contentW * result.score) / 100, y + 3, contentW - (contentW * result.score) / 100, 5, 1, 1, 'F');
      y += 16;

      // Summary row
      const cats = ['critical', 'moderate', 'presentation', 'positive'] as const;
      const catColors: Record<string, [number, number, number]> = {
        critical: [200, 50, 50],
        moderate: [220, 130, 20],
        presentation: [200, 170, 0],
        positive: [40, 160, 80],
      };
      doc.setFontSize(9);
      cats.forEach((cat, idx) => {
        const col = margin + idx * (contentW / 4);
        const count = result.summary[cat];
        doc.setFillColor(...catColors[cat]);
        doc.roundedRect(col, y, contentW / 4 - 4, 14, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`${count}`, col + (contentW / 4 - 4) / 2, y + 6, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(CAT_CONFIG[cat].label, col + (contentW / 4 - 4) / 2, y + 11, { align: 'center' });
      });
      y += 20;

      // Flags
      const addFlag = (flag: AuditFlag & { id?: string }) => {
        if (y > 260) { doc.addPage(); y = margin; }
        const catColor = catColors[flag.category] || [100, 100, 100];
        doc.setFillColor(...catColor, 0.15);
        doc.setDrawColor(...catColor);
        doc.setLineWidth(0.3);

        // Flag title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        const titleLines = doc.splitTextToSize(
          `${flag.category !== 'positive' ? `[Severity ${flag.severity}] ` : ''}${flag.title}${flag.addressed ? ' ✓ Addressed' : ''}`,
          contentW - 4
        );
        doc.text(titleLines, margin + 2, y);
        y += titleLines.length * 4.5 + 1;

        // Why it matters
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const whyLines = doc.splitTextToSize(flag.why_it_matters, contentW - 4);
        doc.text(whyLines, margin + 2, y);
        y += whyLines.length * 4 + 2;

        // Suggested angles (first 2)
        if (flag.suggested_angles.length > 0) {
          doc.setTextColor(60, 60, 60);
          flag.suggested_angles.slice(0, 2).forEach(angle => {
            const lines = doc.splitTextToSize(`• ${angle}`, contentW - 8);
            if (y + lines.length * 4 > 275) { doc.addPage(); y = margin; }
            doc.text(lines, margin + 4, y);
            y += lines.length * 4;
          });
        }
        y += 4;
        doc.setLineWidth(0.1);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y - 1, margin + contentW, y - 1);
        y += 2;
      };

      cats.forEach(cat => {
        const catFlags = grouped[cat];
        if (!catFlags.length) return;
        if (y > 255) { doc.addPage(); y = margin; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(`${CAT_CONFIG[cat].label} (${catFlags.length})`, margin, y);
        y += 6;
        catFlags.forEach(addFlag);
      });

      // Improved description
      if (improved.trim()) {
        doc.addPage();
        y = margin;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text('Improved Listing Description', margin, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const descLines = doc.splitTextToSize(improved, contentW);
        descLines.forEach((line: string) => {
          if (y > 275) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 5;
        });
      }

      // Footer
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`Market Compass · Listing Navigator · Page ${i} of ${totalPages}`, margin, 290);
      }

      const filename = runMeta?.address
        ? `listing-audit-${runMeta.address.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
        : 'listing-audit.pdf';
      doc.save(filename);
      console.log('[LN] PDF saved:', filename);
      toast({ title: 'PDF exported', description: `${filename} downloaded successfully.` });
    } catch (err) {
      console.error('[LN] PDF export error:', err);
      toast({ title: 'PDF export failed', description: 'Could not generate PDF. Try again.', variant: 'destructive' });
    } finally {
      setExportingPdf(false);
    }
  };

  // Navigate to Seller flow with pre-populated data
  const handleStartSellerReport = () => {
    const hint = result.propertyHint;
    const params = new URLSearchParams();
    if (runMeta?.address) params.set('address', runMeta.address);
    if (hint.price) params.set('listPrice', String(hint.price));
    if (runMeta?.mls_number) params.set('mls', runMeta.mls_number);
    params.set('from', 'listing-navigator');
    navigate(`/seller?${params.toString()}`);
  };

  const handleStartBuyerReport = () => {
    const hint = result.propertyHint;
    const params = new URLSearchParams();
    if (runMeta?.address) params.set('address', runMeta.address);
    if (hint.price) params.set('listPrice', String(hint.price));
    if (runMeta?.mls_number) params.set('mls', runMeta.mls_number);
    params.set('from', 'listing-navigator');
    navigate(`/buyer?${params.toString()}`);
  };

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
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h2 className="font-serif text-xl font-semibold">Listing Audit Score</h2>
                        {runMeta?.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3.5 w-3.5" /> {runMeta.address}
                            {runMeta.mls_number && <span className="ml-2 flex items-center gap-0.5"><Hash className="h-3 w-3" />{runMeta.mls_number}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={exportingPdf} className="h-8 gap-1.5 text-xs">
                          {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                          PDF Report
                        </Button>
                      </div>
                    </div>
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

                    {/* Progress bar */}
                    {allIssues.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {addressedCount} of {allIssues.length} issues addressed
                          </span>
                          <span className={cn('font-medium', progressPct === 100 ? 'text-emerald-600' : 'text-foreground')}>
                            {progressPct}%
                          </span>
                        </div>
                        <Progress value={progressPct} className="h-2" />
                        {progressPct === 100 ? (
                          <p className="text-xs text-emerald-600 font-medium">✓ All issues marked addressed — ready to rewrite!</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{openIssues.length} open issue{openIssues.length !== 1 ? 's' : ''} — check off each as you address it in your rewrite.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property hints */}
            {Object.keys(result.propertyHint).length > 0 && (
              <PropertyHintCard hint={result.propertyHint} />
            )}

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

            {/* Report Integration */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <ArrowUpRight className="h-4 w-4" /> Continue to a Client Report
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Use this listing as your starting point for a Seller or Buyer Analysis. Property data detected above will be pre-filled where possible.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" onClick={handleStartSellerReport} className="gap-2">
                    <Building2 className="h-4 w-4" /> Start Seller Analysis
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleStartBuyerReport} className="gap-2">
                    <Home className="h-4 w-4" /> Start Buyer Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'rewrite' && (
          <motion.div key="rewrite" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            {/* Progress bar in rewrite tab too */}
            {allIssues.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{addressedCount} of {allIssues.length} flags addressed</span>
                  <span className={cn('font-medium', progressPct === 100 ? 'text-emerald-600' : 'text-foreground')}>{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">Improved Listing Description</CardTitle>
                  <div className="flex items-center gap-2">
                    {savingImproved && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>}
                    <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 gap-1.5">
                      {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownloadTxt} className="h-8 gap-1.5">
                      <Download className="h-3.5 w-3.5" /> .txt
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={exportingPdf} className="h-8 gap-1.5">
                      {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                      PDF
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
                      <div key={flag.rule_key} className={cn('rounded-lg border p-3 flex items-start justify-between gap-2', cfg.bg, cfg.border)}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{flag.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{flag.suggested_angles[0]}</p>
                        </div>
                        <button
                          onClick={() => handleToggleAddressed(flag)}
                          disabled={savingFlag}
                          className="shrink-0 p-1 rounded hover:bg-background/60"
                          title="Mark addressed"
                        >
                          <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </button>
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

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score, diff, showDiff }: { score: number; diff: number | null; showDiff: boolean }) {
  const tier =
    score >= 80 ? { label: 'Strong', bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200' } :
    score >= 60 ? { label: 'Fair',   bg: 'bg-yellow-500/10',  text: 'text-yellow-700',  border: 'border-yellow-200'  } :
    score >= 40 ? { label: 'Needs Work', bg: 'bg-orange-500/10', text: 'text-orange-700', border: 'border-orange-200' } :
                  { label: 'Critical', bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' };

  return (
    <div className={cn('flex flex-col items-center px-3 py-2 rounded-xl border', tier.bg, tier.border)}>
      <span className={cn('text-xl font-bold leading-none', tier.text)}>
        {score}
        <span className="text-xs font-normal text-muted-foreground">/100</span>
      </span>
      <span className={cn('text-[10px] font-medium mt-0.5', tier.text)}>{tier.label}</span>
      {showDiff && diff !== null && diff !== 0 && (
        <span className={cn('text-[10px] flex items-center gap-0.5 mt-0.5 font-medium',
          diff > 0 ? 'text-emerald-600' : 'text-destructive'
        )}>
          {diff > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          {diff > 0 ? `+${diff}` : diff} pts
        </span>
      )}
    </div>
  );
}

// ─── Property Group Card ───────────────────────────────────────────────────────

function PropertyGroupCard({
  group, onSelect, onDeleteRun, onRenameGroup,
}: {
  group: PropertyGroup;
  onSelect: (run: SavedRun) => void;
  onDeleteRun: (runId: string) => Promise<void>;
  onRenameGroup: (runId: string, label: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [labelInput, setLabelInput] = useState(group.runs[0]?.listing_label || group.address || '');
  const latestRun = group.runs[0];
  const hasMultiple = group.runs.length > 1;

  const scoreDiff = hasMultiple && latestRun.score !== null && group.runs[1].score !== null
    ? latestRun.score - group.runs[1].score
    : null;

  const handleDelete = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    setDeleting(runId);
    await onDeleteRun(runId);
    setDeleting(null);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRenameGroup(latestRun.id, labelInput);
    setRenaming(false);
  };

  const displayName = latestRun.listing_label || group.address || `Audit ${new Date(latestRun.created_at).toLocaleDateString()}`;
  const auditDate = new Date(latestRun.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // Summary pill helpers
  const s = latestRun.summary;

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">

      {/* ── Top section: identity + score + primary CTA ── */}
      <div className="flex items-center gap-3 p-4">

        {/* Icon */}
        <div className="shrink-0 p-2 rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <form onSubmit={handleRename} className="flex gap-1.5 items-center">
              <Input
                autoFocus
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                className="h-7 text-xs flex-1"
                placeholder="Label or address…"
                onClick={e => e.stopPropagation()}
              />
              <Button type="submit" size="sm" variant="ghost" className="h-7 px-2">
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setRenaming(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </form>
          ) : (
            <>
              <p className="text-sm font-semibold truncate leading-tight">{displayName}</p>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                {group.mls_number && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                    <Hash className="h-2.5 w-2.5" />{group.mls_number}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">Last audited {auditDate}</span>
                {hasMultiple && (
                  <span className="text-[11px] text-muted-foreground">{group.runs.length} runs</span>
                )}
              </div>
              {/* Summary pills */}
              {s && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {s.critical > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium">
                      <AlertCircle className="h-2.5 w-2.5" />{s.critical} critical
                    </span>
                  )}
                  {s.moderate > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-medium">
                      {s.moderate} moderate
                    </span>
                  )}
                  {s.positive > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium">
                      <CheckCircle2 className="h-2.5 w-2.5" />{s.positive} passing
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Score badge */}
        {latestRun.score !== null && (
          <ScoreBadge score={latestRun.score} diff={scoreDiff} showDiff={hasMultiple} />
        )}
      </div>

      {/* ── Action bar: Resume CTA + CRUD ── */}
      <div className="border-t border-border/40 flex items-center gap-0 divide-x divide-border/40">
        {/* Primary: Resume / Open */}
        <button
          onClick={() => onSelect(latestRun)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          Resume Audit
        </button>

        {/* History toggle (only if multiple runs) */}
        {hasMultiple && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            History
            {expanded
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />}
          </button>
        )}

        {/* Rename */}
        <button
          onClick={() => setRenaming(r => !r)}
          title="Rename"
          className="p-2.5 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        {/* Delete latest */}
        <button
          onClick={e => handleDelete(e, latestRun.id)}
          disabled={deleting === latestRun.id}
          title="Delete"
          className="p-2.5 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          {deleting === latestRun.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Run history (expandable) ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 bg-muted/20">
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Run History</p>
              <div className="divide-y divide-border/40">
                {group.runs.map((run, idx) => (
                  <div key={run.id} className="flex items-center hover:bg-muted/30 transition-colors">
                    <button
                      onClick={() => onSelect(run)}
                      className="flex-1 text-left px-4 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {idx === 0 && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                          <span className="text-xs font-medium text-foreground">
                            {idx === 0 ? 'Latest' : `Run ${group.runs.length - idx}`}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            · {new Date(run.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {run.summary && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {run.summary.critical > 0 && <span className="text-[10px] text-destructive">{run.summary.critical} critical</span>}
                            {run.summary.moderate > 0 && <span className="text-[10px] text-orange-500">{run.summary.moderate} moderate</span>}
                            {run.summary.positive > 0 && <span className="text-[10px] text-emerald-600">{run.summary.positive} passing</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {run.score !== null && (
                          <span className={cn('text-sm font-bold',
                            run.score >= 80 ? 'text-emerald-600' :
                            run.score >= 60 ? 'text-yellow-600' :
                            'text-destructive'
                          )}>
                            {run.score}<span className="text-[10px] text-muted-foreground font-normal">/100</span>
                          </span>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </button>
                    <button
                      onClick={e => handleDelete(e, run.id)}
                      disabled={deleting === run.id}
                      className="px-3 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      title="Delete this run"
                    >
                      {deleting === run.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Run History ──────────────────────────────────────────────────────────────

function RunHistory({ onSelect }: { onSelect: (run: SavedRun) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: runs, isLoading } = useQuery({
    queryKey: ['listing-navigator-runs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('listing_navigator_runs')
        .select('id, created_at, input_type, score, summary, improved_description, parsed_text, property_address, mls_number, listing_label')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as SavedRun[];
    },
    enabled: !!user,
  });

  const handleDeleteRun = async (runId: string) => {
    await supabase.from('listing_navigator_runs').delete().eq('id', runId);
    queryClient.invalidateQueries({ queryKey: ['listing-navigator-runs', user?.id] });
    toast({ title: 'Run deleted' });
  };

  const handleRenameGroup = async (runId: string, label: string) => {
    await supabase.from('listing_navigator_runs').update({ listing_label: label }).eq('id', runId);
    queryClient.invalidateQueries({ queryKey: ['listing-navigator-runs', user?.id] });
    toast({ title: 'Label updated' });
  };

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading history…</div>;

  if (!runs?.length) return (
    <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/20 p-8 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
        <ClipboardPaste className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No audits yet</p>
        <p className="text-xs text-muted-foreground mt-1">Paste or upload listing text above to run your first audit and start building your library.</p>
      </div>
    </div>
  );

  // Group by address (or MLS# or run ID as fallback)
  const groups: PropertyGroup[] = [];
  const seen = new Map<string, PropertyGroup>();

  runs.forEach(run => {
    const key = run.mls_number?.trim()
      || run.property_address?.trim()
      || run.id;

    if (seen.has(key)) {
      seen.get(key)!.runs.push(run);
    } else {
      const group: PropertyGroup = {
        key,
        address: run.property_address,
        mls_number: run.mls_number,
        runs: [run],
        bestScore: run.score,
      };
      seen.set(key, group);
      groups.push(group);
    }
  });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-4 w-4" /> Property Audit Library ({groups.length} {groups.length === 1 ? 'property' : 'properties'})
      </h3>
      <div className="space-y-2">
        {groups.map(group => (
          <PropertyGroupCard
            key={group.key}
            group={group}
            onSelect={onSelect}
            onDeleteRun={handleDeleteRun}
            onRenameGroup={handleRenameGroup}
          />
        ))}
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
  const navigate = useNavigate();

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
  const [currentRunMeta, setCurrentRunMeta] = useState<{ address?: string; mls_number?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Property metadata fields
  const [propertyAddress, setPropertyAddress] = useState('');
  const [mlsNumber, setMlsNumber] = useState('');

  // Live hint preview while typing
  const [liveHint, setLiveHint] = useState<PropertyHint>({});
  useEffect(() => {
    const textToCheck = inputMode === 'paste' ? pasteText : parsedText;
    if (textToCheck.trim().length > 50) {
      setLiveHint(extractPropertyHints(textToCheck));
    } else {
      setLiveHint({});
    }
  }, [pasteText, parsedText, inputMode]);

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
    } catch {
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
    const meta = { address: propertyAddress.trim() || undefined, mls_number: mlsNumber.trim() || undefined };
    setCurrentRunMeta(meta);

    try {
      const result = runAudit(textToAudit);

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
          property_address: meta.address || null,
          mls_number: meta.mls_number || null,
        })
        .select('id')
        .single();

      if (runErr || !runRow) throw runErr;

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
        const { data: flagData } = await (supabase as any).from('listing_navigator_flags').insert(flagRows).select('id, rule_key');
        if (flagData) {
          const idMap = Object.fromEntries(flagData.map((f: any) => [f.rule_key, f.id]));
          result.flags.forEach(f => { (f as AuditFlag & { id?: string }).id = idMap[f.rule_key]; });
        }
      }

      setCurrentRunId(runRow.id);
      setAuditResult(result);
      setInitialImproved('');
      setPhase('results');
      queryClient.invalidateQueries({ queryKey: ['listing-navigator-runs', user.id] });
    } catch {
      toast({ title: 'Error saving audit', description: 'Audit ran but could not be saved. Results shown below.', variant: 'destructive' });
      const result = runAudit(textToAudit);
      setAuditResult(result);
      setCurrentRunMeta(meta);
      setPhase('results');
    } finally {
      setRunning(false);
    }
  }, [inputMode, pasteText, parsedText, rawText, user, queryClient, propertyAddress, mlsNumber]);

  // ── Load saved run ──────────────────────────────────────────────────────
  const handleSelectRun = async (run: SavedRun) => {
    setRunning(true);
    try {
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
        const hint = run.parsed_text ? extractPropertyHints(run.parsed_text) : {};
        setAuditResult({ score: run.score ?? 0, flags, propertyHint: hint, summary });
      } else {
        const result = runAudit(run.parsed_text);
        setAuditResult(result);
      }

      setCurrentRunId(run.id);
      setCurrentRunMeta({ address: run.property_address || undefined, mls_number: run.mls_number || undefined });
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
    setCurrentRunMeta(null);
    setPasteText('');
    setParsedText('');
    setRawText('');
    setInitialImproved('');
  };

  const textToCheck = inputMode === 'paste' ? pasteText : parsedText;
  const liveHintFields = Object.keys(liveHint).filter(k => liveHint[k as keyof PropertyHint] !== undefined);

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

              {/* Property Metadata */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> Property Identification <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prop-address" className="text-xs">Property Address</Label>
                      <Input
                        id="prop-address"
                        placeholder="123 Main St, Boston, MA 02101"
                        value={propertyAddress}
                        onChange={e => setPropertyAddress(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mls-num" className="text-xs">MLS Listing Number</Label>
                      <Input
                        id="mls-num"
                        placeholder="MLS-12345678"
                        value={mlsNumber}
                        onChange={e => setMlsNumber(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                      placeholder={`Paste the full MLS listing remarks here — include property description, feature notes, and any agent remarks. The more complete the text, the more accurate the audit.\n\nExample: 'Welcome to this 4-bedroom colonial at 12 Elm Street. The sun-filled home features an updated kitchen with granite counters and stainless appliances, hardwood floors throughout, and a heated workshop in the backyard. 100-amp electrical. Price improved from $875,000...'`}
                      className="min-h-[280px] text-sm resize-y font-mono"
                    />
                    {/* Live hint preview */}
                    {liveHintFields.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Detected:</span>
                        {liveHintFields.map(k => {
                          const val = liveHint[k as keyof PropertyHint];
                          return (
                            <span key={k} className="text-xs bg-primary/5 border border-primary/15 rounded-full px-2 py-0.5">
                              {k}: {k === 'price' || k === 'assessedValue' ? `$${Number(val).toLocaleString()}` : String(val)}
                            </span>
                          );
                        })}
                      </div>
                    )}
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
                    {/* Live hint preview for PDF mode */}
                    {liveHintFields.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Detected:</span>
                        {liveHintFields.map(k => {
                          const val = liveHint[k as keyof PropertyHint];
                          return (
                            <span key={k} className="text-xs bg-primary/5 border border-primary/15 rounded-full px-2 py-0.5">
                              {k}: {k === 'price' || k === 'assessedValue' ? `$${Number(val).toLocaleString()}` : String(val)}
                            </span>
                          );
                        })}
                      </div>
                    )}
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

              {/* Loading overlay for audit */}
              {running && (
                <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm">Running audit engine…</span>
                </div>
              )}

              {/* Run history (property library) */}
              {phase === 'input' && !running && <RunHistory onSelect={handleSelectRun} />}
            </motion.div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === 'results' && auditResult && (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <ResultsPanel
                result={auditResult}
                runId={currentRunId}
                runMeta={currentRunMeta}
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
