/**
 * LeadFinderIntelPanel — Agent-only market intelligence widget embedded in Buyer/Seller reports.
 * Pulls live FRED data for the report's location ZIP and surfaces the Opportunity Score,
 * Lead Type recommendation, and top data signals inline — without leaving the report.
 * Completely hidden from client mode.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import {
  Target, TrendingUp, TrendingDown, Minus, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, ExternalLink, Clock,
  Home, Users, CircleDot, CheckCircle2, RefreshCw, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

// ─── Types (mirrors LeadFinder types) ────────────────────────────────────────

interface HistoryPoint { date: string; value: number; }

interface MetricData {
  seriesId: string;
  label: string;
  sublabel: string;
  current: number | null;
  previous: number | null;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  change90d?: number | null;
  asOfDate: string | null;
  unit: string;
  note: string;
  flagged: boolean;
  history?: HistoryPoint[];
}

interface ScoreFactor { label: string; points: number; reason: string; }

interface LeadFinderResult {
  zip: string;
  fetchedAt: string;
  opportunityScore: number;
  leadType: 'seller' | 'transitional' | 'buyer';
  topFactors: ScoreFactor[];
  scoreBreakdown: ScoreFactor[];
  metrics: {
    mortgage: MetricData;
    inventory: MetricData;
    daysOnMarket: MetricData;
    hpi: MetricData;
    unemployment: MetricData;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): 'emerald' | 'amber' | 'red' {
  if (score >= 71) return 'emerald';
  if (score >= 41) return 'amber';
  return 'red';
}

function scoreLabel(score: number) {
  if (score >= 71) return 'High Opportunity';
  if (score >= 41) return 'Emerging Opportunity';
  return 'Low Opportunity';
}

const colorTokens = {
  emerald: {
    bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800',
    line: 'hsl(152 69% 42%)',
  },
  amber: {
    bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800',
    line: 'hsl(38 92% 50%)',
  },
  red: {
    bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800',
    line: 'hsl(0 84% 60%)',
  },
};

function TrendChip({ trend }: { trend: string }) {
  if (trend === 'rising') return (
    <span className="inline-flex items-center gap-0.5 text-red-500 text-[10px] font-semibold">
      <TrendingUp className="h-3 w-3" />Rising
    </span>
  );
  if (trend === 'falling') return (
    <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px] font-semibold">
      <TrendingDown className="h-3 w-3" />Falling
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[10px] font-semibold">
      <Minus className="h-3 w-3" />Stable
    </span>
  );
}

function MiniSparkline({ data, color }: { data: HistoryPoint[]; color: string }) {
  if (!data || data.length < 2) return null;
  return (
    <div className="h-8 w-20 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['auto', 'auto']} hide />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—';
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (unit === 'listings') return value.toLocaleString();
  if (unit === 'days') return `${Math.round(value)}d`;
  if (unit === 'index') return value.toFixed(1);
  return String(value);
}

// ─── Compact metric row ───────────────────────────────────────────────────────

function MetricRow({ metric, invertTrend = false }: { metric: MetricData; invertTrend?: boolean }) {
  const trendUp = metric.trend === 'rising';
  const sparkColor = invertTrend
    ? (trendUp ? '#10b981' : '#ef4444')
    : (trendUp ? '#ef4444' : '#10b981');

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg',
      metric.flagged ? 'bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40' : 'bg-muted/30'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{metric.label}</span>
          {metric.flagged && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-bold font-serif">{formatValue(metric.current, metric.unit)}</span>
          <TrendChip trend={metric.trend} />
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight line-clamp-2">{metric.note}</p>
      </div>
      {metric.history && <MiniSparkline data={metric.history} color={sparkColor} />}
      <a
        href={`https://fred.stlouisfed.org/series/${metric.seriesId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-[9px] text-muted-foreground/40 hover:text-primary transition-colors shrink-0 flex flex-col items-center gap-0.5"
        title={`FRED: ${metric.seriesId}`}
      >
        <ExternalLink className="h-2.5 w-2.5" />
        <span className="font-mono">FRED</span>
      </a>
    </div>
  );
}

// ─── Lead type icon helper ────────────────────────────────────────────────────

function leadTypeConfig(leadType: string) {
  const configs = {
    seller: {
      icon: <Home className="h-4 w-4" />, badge: '🔴', title: 'Seller Lead Market',
      description: 'Tight inventory & rising costs — long-term homeowners with equity are highest-probability prospects.',
      color: 'red' as const,
    },
    transitional: {
      icon: <CircleDot className="h-4 w-4" />, badge: '🟡', title: 'Transitional Market',
      description: 'Mixed signals — prioritize relationship building and past client outreach.',
      color: 'amber' as const,
    },
    buyer: {
      icon: <Users className="h-4 w-4" />, badge: '🟢', title: 'Buyer Lead Market',
      description: 'Expanding inventory & softening prices — reconnect with buyers who paused their search.',
      color: 'emerald' as const,
    },
  };
  return configs[leadType as keyof typeof configs] || configs.transitional;
}

// ─── Dynamic action items ─────────────────────────────────────────────────────

function getActions(metrics: LeadFinderResult['metrics']): string[] {
  const actions: string[] = [];
  if (metrics.daysOnMarket.flagged) actions.push('Check your MLS for listings that expired in the last 60 days near this property\'s ZIP — motivated sellers needing a new strategy.');
  if (metrics.inventory.flagged || metrics.inventory.trend === 'falling') actions.push('Identify past clients who have owned 5+ years. Low inventory means their timing to sell is strong.');
  if (metrics.mortgage.flagged || metrics.mortgage.trend === 'rising') actions.push('Share an equity update with your sphere. Rising rates motivate owners with low locked-in rates to act now.');
  if (metrics.hpi.flagged || (metrics.hpi.change90d != null && metrics.hpi.change90d < 0)) actions.push('Reach out to owners near the market peak. Softening prices may open move-up or rightsizing conversations.');
  if (actions.length === 0) actions.push('Schedule market update touchpoints with your top 20 past clients — stay visible as conditions evolve.');
  return actions.slice(0, 3);
}

// ─── Zip extraction helper ─────────────────────────────────────────────────────

function extractZip(location: string): string | null {
  const match = location.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

// ─── Main panel ──────────────────────────────────────────────────────────────

interface LeadFinderIntelPanelProps {
  /** The session location string (may contain a ZIP code) */
  location: string;
  /** 'buyer' or 'seller' — used to frame the recommendation copy */
  reportType: 'buyer' | 'seller';
  /** Optional callback fired when FRED data has been successfully loaded */
  onResult?: (result: LeadFinderResult) => void;
}

export function LeadFinderIntelPanel({ location, reportType, onResult }: LeadFinderIntelPanelProps) {
  const { user } = useAuth();
  const [result, setResult] = useState<LeadFinderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [zip, setZip] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const detectedZip = extractZip(location);

  useEffect(() => {
    if (detectedZip) {
      setZip(detectedZip);
      loadData(detectedZip);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedZip]);

  async function loadData(zipCode: string) {
    setLoading(true);
    setError(null);
    try {
      // Check DB cache first (< 24h)
      if (user) {
        const { data: cached } = await supabase
          .from('lead_finder_analyses')
          .select('fred_data, refreshed_at, opportunity_score')
          .eq('user_id', user.id)
          .eq('zip_code', zipCode)
          .maybeSingle();

        if (cached?.fred_data && cached.refreshed_at) {
          const age = Date.now() - new Date(cached.refreshed_at).getTime();
          if (age < 24 * 60 * 60 * 1000) {
            const cachedResult = cached.fred_data as unknown as LeadFinderResult;
            setResult(cachedResult);
            setLastUpdated(cached.refreshed_at);
            onResult?.(cachedResult);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch fresh from edge function
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fred-lead-finder?zip=${zipCode}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`FRED fetch failed [${res.status}]`);
      const data: LeadFinderResult = await res.json();
      setResult(data);
      setLastUpdated(data.fetchedAt);
      onResult?.(data);

      // Cache in DB
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fredJson = data as any;
        await supabase.from('lead_finder_analyses').upsert(
          [{
            user_id: user.id,
            zip_code: zipCode,
            fred_data: fredJson,
            opportunity_score: data.opportunityScore,
            lead_type: data.leadType,
            refreshed_at: new Date().toISOString(),
          }],
          { onConflict: 'user_id,zip_code' }
        );
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') {
        setError('Could not load market data for this location.');
      }
    } finally {
      setLoading(false);
    }
  }

  // No ZIP in the location string — show a soft prompt
  if (!detectedZip) {
    return (
      <Card className="border-dashed border-border/60 bg-muted/20">
        <CardContent className="py-5 flex items-center gap-3">
          <Target className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Lead Finder Intel</p>
            <p className="text-xs text-muted-foreground">
              Add a ZIP code to the property location to see live market opportunity data from FRED.{' '}
              <Link to="/lead-finder" className="underline hover:text-primary">Open Lead Finder →</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">Loading market intelligence for ZIP {zip}…</p>
            <p className="text-xs text-muted-foreground">Pulling live federal economic data from FRED</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !result) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium">Market data unavailable</p>
              <p className="text-xs text-muted-foreground">{error || 'No data returned for this ZIP'}</p>
            </div>
          </div>
          {zip && (
            <Button size="sm" variant="outline" onClick={() => loadData(zip)} className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const color = scoreColor(result.opportunityScore);
  const label = scoreLabel(result.opportunityScore);
  const c = colorTokens[color];
  const ltc = leadTypeConfig(result.leadType);
  const ltColors = colorTokens[ltc.color];
  const actions = getActions(result.metrics);

  return (
    <Card className={cn('border-2 overflow-hidden', c.border)}>
      {/* ── Header strip ── */}
      <div className={cn('px-4 py-2 flex items-center justify-between gap-2', c.bg)}>
        <div className="flex items-center gap-2">
          <Target className={cn('h-4 w-4', c.text)} />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
            Lead Finder Intel · ZIP {result.zip}
          </span>
          <Badge variant="outline" className={cn('text-[10px] px-2 py-0', c.text, c.border, c.bg)}>
            Agent Only
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            onClick={() => zip && loadData(zip)}
          >
            <RefreshCw className="h-3 w-3 mr-1" />Refresh
          </Button>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* ── Score + Lead Type ── */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Score meter */}
          <div className="flex flex-col items-center shrink-0">
            <span className={cn('text-5xl font-bold font-serif tracking-tight leading-none', c.text)}>
              {result.opportunityScore}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
          </div>
          <div className="flex-1 min-w-36 space-y-2">
            <div>
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-[40%] bg-red-200/50 dark:bg-red-900/20" />
                  <div className="w-[30%] bg-amber-200/50 dark:bg-amber-900/20" />
                  <div className="w-[30%] bg-emerald-200/50 dark:bg-emerald-900/20" />
                </div>
                <div
                  className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-700', c.bar)}
                  style={{ width: `${result.opportunityScore}%` }}
                />
              </div>
            </div>
            <Badge className={cn('text-xs font-semibold px-3 py-0.5 border', c.bg, c.text, c.border)}>{label}</Badge>
          </div>
          {/* Lead type pill */}
          <div className={cn('rounded-xl px-4 py-2.5 flex items-center gap-2 shrink-0 border', ltColors.bg, ltColors.border)}>
            <span className={ltColors.text}>{ltc.icon}</span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{ltc.badge} Market</p>
              <p className={cn('text-xs font-bold font-serif', ltColors.text)}>{ltc.title}</p>
            </div>
          </div>
        </div>

        {/* ── Top factors ── */}
        {result.topFactors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Driving Factors</p>
            {result.topFactors.map((f, i) => (
              <div key={i} className={cn('rounded-lg px-3 py-2 flex items-start gap-2', c.bg)}>
                <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 shrink-0 mt-0.5', c.text, c.border)}>+{f.points}</Badge>
                <div>
                  <p className="text-xs font-semibold">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{f.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Expandable: full metrics + actions ── */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground border border-border/50 rounded-lg">
              <span className="text-xs font-medium">
                {expanded ? 'Hide' : 'Show'} full market data & recommended actions
              </span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            {/* Metrics grid */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live FRED Indicators</p>
              <div className="space-y-1.5">
                <MetricRow metric={result.metrics.mortgage} />
                <MetricRow metric={result.metrics.inventory} />
                <MetricRow metric={result.metrics.daysOnMarket} />
                <MetricRow metric={result.metrics.hpi} />
                <MetricRow metric={result.metrics.unemployment} invertTrend />
              </div>
            </div>

            <Separator />

            {/* Lead type description */}
            <div className={cn('rounded-xl p-4 space-y-2 border', ltColors.bg, ltColors.border)}>
              <div className="flex items-center gap-2">
                <span className={ltColors.text}>{ltc.icon}</span>
                <p className="text-sm font-bold font-serif">{ltc.badge} {ltc.title}</p>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{ltc.description}</p>
            </div>

            {/* Action checklist */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />Your Next Steps
              </p>
              <div className="space-y-2">
                {actions.map((action, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Footer link ── */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-muted-foreground/60">
            Data sourced from Federal Reserve Economic Data (FRED). Agent-only view.
          </p>
          <Link
            to="/lead-finder"
            className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 font-semibold transition-colors"
          >
            Full Lead Finder <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
