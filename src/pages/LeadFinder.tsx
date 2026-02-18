import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Target, TrendingUp, TrendingDown, Minus, AlertTriangle,
  ChevronDown, ChevronUp, Upload, Download, Clock, ExternalLink,
  CheckCircle2, CircleDot, Loader2, Search, History, Star,
  BadgeDollarSign, Home, Briefcase, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

interface ScoreFactor {
  label: string;
  points: number;
  reason: string;
}

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

interface CsvRow {
  address: string;
  zip: string;
  score: number | null;
  leadType: string | null;
  topSignal: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—';
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (unit === 'listings') return value.toLocaleString();
  if (unit === 'days') return `${Math.round(value)} days`;
  if (unit === 'index') return value.toFixed(1);
  return String(value);
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'rising') return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (trend === 'falling') return <TrendingDown className="h-4 w-4 text-emerald-600" />;
  if (trend === 'stable') return <Minus className="h-4 w-4 text-muted-foreground" />;
  return <Minus className="h-4 w-4 text-muted-foreground/50" />;
}

function trendLabel(trend: string) {
  if (trend === 'rising') return 'Rising';
  if (trend === 'falling') return 'Falling';
  if (trend === 'stable') return 'Stable';
  return 'Unknown';
}

function trendClass(trend: string, invertColors = false) {
  if (invertColors) {
    if (trend === 'rising') return 'text-emerald-600';
    if (trend === 'falling') return 'text-red-500';
  } else {
    if (trend === 'rising') return 'text-red-500';
    if (trend === 'falling') return 'text-emerald-600';
  }
  return 'text-muted-foreground';
}

function scoreColor(score: number) {
  if (score >= 71) return 'emerald';
  if (score >= 41) return 'amber';
  return 'red';
}

function scoreLabel(score: number) {
  if (score >= 71) return 'High Opportunity';
  if (score >= 41) return 'Emerging Opportunity';
  return 'Low Opportunity';
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ metric, invertTrend = false }: { metric: MetricData; invertTrend?: boolean }) {
  const change90d = metric.change90d;
  return (
    <Card className="relative overflow-hidden">
      {metric.flagged && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{metric.label}</p>
            <p className="text-sm text-foreground/70 mt-0.5">{metric.sublabel}</p>
          </div>
          {metric.flagged && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30 shrink-0 text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Signal
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current value */}
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold font-serif tracking-tight">
            {formatValue(metric.current, metric.unit)}
          </span>
          <div className={cn('flex items-center gap-1 mb-1 text-sm font-medium', trendClass(metric.trend, invertTrend))}>
            <TrendIcon trend={metric.trend} />
            {trendLabel(metric.trend)}
          </div>
        </div>

        {/* 90-day change if available */}
        {change90d !== undefined && change90d !== null && (
          <p className="text-xs text-muted-foreground">
            90-day change: <span className={cn('font-semibold', change90d > 0 ? 'text-red-500' : 'text-emerald-600')}>
              {change90d > 0 ? '+' : ''}{change90d.toFixed(2)}%
            </span>
          </p>
        )}

        <Separator />

        {/* Plain-language note */}
        <p className="text-sm text-foreground/80 leading-relaxed">{metric.note}</p>

        {/* Source */}
        <div className="flex items-center justify-between pt-1">
          {metric.asOfDate && (
            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {metric.asOfDate}
            </p>
          )}
          <a
            href={`https://fred.stlouisfed.org/series/${metric.seriesId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground/60 hover:text-primary flex items-center gap-1 transition-colors ml-auto"
          >
            FRED: {metric.seriesId}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Opportunity Score Meter ──────────────────────────────────────────────────

function ScoreMeter({ score, leadType, topFactors, breakdown }: {
  score: number;
  leadType: string;
  topFactors: ScoreFactor[];
  breakdown: ScoreFactor[];
}) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(score);
  const label = scoreLabel(score);

  const colorMap = {
    emerald: {
      bar: 'bg-emerald-500',
      glow: 'shadow-emerald-500/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    amber: {
      bar: 'bg-amber-500',
      glow: 'shadow-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
    },
    red: {
      bar: 'bg-red-500',
      glow: 'shadow-red-500/30',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
    },
  };
  const c = colorMap[color];

  return (
    <Card className={cn('border-2', c.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className={cn('h-5 w-5', c.text)} />
          <CardTitle>Opportunity Score</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">Calculated from 5 live FRED economic indicators</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Big number */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className={cn('text-7xl font-bold font-serif tracking-tight', c.text)}>{score}</span>
            <span className="text-sm text-muted-foreground">out of 100</span>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>0 — Low</span>
                <span>41 — Emerging</span>
                <span>71 — High</span>
              </div>
              {/* Track */}
              <div className="relative h-4 rounded-full bg-muted overflow-hidden">
                {/* Color zones */}
                <div className="absolute inset-0 flex">
                  <div className="w-[40%] bg-red-200/50 dark:bg-red-900/20" />
                  <div className="w-[30%] bg-amber-200/50 dark:bg-amber-900/20" />
                  <div className="w-[30%] bg-emerald-200/50 dark:bg-emerald-900/20" />
                </div>
                {/* Fill */}
                <div
                  className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-700', c.bar, 'shadow-lg', c.glow)}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            <Badge className={cn('text-sm font-semibold px-3 py-1', c.bg, c.text, c.border, 'border')}>
              {label}
            </Badge>
          </div>
        </div>

        {/* Top 2 drivers */}
        {topFactors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Factors Driving This Score</p>
            {topFactors.map((f, i) => (
              <div key={i} className={cn('rounded-lg p-3 space-y-1', c.bg)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{f.label}</span>
                  <Badge variant="outline" className={cn('text-xs', c.text, c.border)}>+{f.points} pts</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Collapsible score breakdown */}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="text-xs font-medium">How is this score calculated?</span>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground text-sm mb-2">Scoring Logic (max 100 pts)</p>
              <ul className="space-y-1.5">
                <li>• Mortgage rate &gt; 7% and rising → <strong>+20 pts</strong> (seller urgency)</li>
                <li>• Inventory below baseline → <strong>+20 pts</strong> (low competition)</li>
                <li>• Days on market &gt; 45 → <strong>+15 pts</strong> (expired listing pool)</li>
                <li>• Price index declining 90 days → <strong>+15 pts</strong> (seller motivation)</li>
                <li>• Unemployment stable or falling → <strong>+10 pts</strong> (market stability)</li>
                <li>• Combined momentum → <strong>up to +20 pts</strong></li>
              </ul>
              {breakdown.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <p className="font-semibold text-foreground">Active Factors This Analysis</p>
                  {breakdown.map((f, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>{f.label}</span>
                      <span className="font-semibold text-primary">+{f.points}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ─── Lead Type Card ───────────────────────────────────────────────────────────

function LeadTypeCard({ leadType, metrics }: { leadType: string; metrics: LeadFinderResult['metrics'] }) {
  const config = {
    seller: {
      icon: <Home className="h-6 w-6" />,
      color: 'red',
      title: 'Seller Lead Market',
      description: 'Inventory is tight and borrowing costs are rising. Long-term homeowners with equity are your highest-probability prospects. Focus outreach on owners who have held their property 7 or more years.',
      badge: '🔴',
    },
    transitional: {
      icon: <CircleDot className="h-6 w-6" />,
      color: 'amber',
      title: 'Transitional Market',
      description: 'This market is showing mixed signals. Prioritize relationship building and past client outreach. Position yourself for listings before the market direction becomes clear.',
      badge: '🟡',
    },
    buyer: {
      icon: <Users className="h-6 w-6" />,
      color: 'emerald',
      title: 'Buyer Lead Market',
      description: 'Inventory is expanding and price momentum is softening. Focus on buyers who paused their search. Reconnect with prospects who were priced out 6–12 months ago.',
      badge: '🟢',
    },
  };

  const cfg = config[leadType as keyof typeof config] || config.transitional;

  const colorMap = {
    red: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: 'text-red-600', text: 'text-red-700 dark:text-red-300' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-600', text: 'text-amber-700 dark:text-amber-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', icon: 'text-emerald-600', text: 'text-emerald-700 dark:text-emerald-300' },
  };
  const c = colorMap[cfg.color as keyof typeof colorMap];

  // Dynamic action checklist
  const actions: string[] = [];
  if (metrics.daysOnMarket.flagged) {
    actions.push('Search your MLS for listings that expired in the last 60 days in this ZIP. These owners are proven sellers who need a new strategy.');
  }
  if (metrics.inventory.flagged || metrics.inventory.trend === 'falling') {
    actions.push('Pull your past client list and identify owners who have lived in their home 5 or more years. Low inventory means their timing to sell is strong.');
  }
  if (metrics.mortgage.flagged || metrics.mortgage.trend === 'rising') {
    actions.push('Contact your sphere with an equity update. Rising rates motivate homeowners with low locked-in rates to consider selling before buyer demand drops further.');
  }
  if (metrics.hpi.flagged || (metrics.hpi.change90d !== null && metrics.hpi.change90d !== undefined && metrics.hpi.change90d < 0)) {
    actions.push('Reach out to owners who purchased near the market peak. Softening prices may motivate move-up or rightsizing conversations now.');
  }
  if (actions.length === 0) {
    actions.push('Review your sphere of influence for contacts who have expressed interest in selling within the next 12 months.');
    actions.push('Schedule market update touchpoints with your top 20 past clients — stay top of mind as conditions evolve.');
  }
  const topActions = actions.slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Primary recommendation */}
      <Card className={cn('border-2', c.border)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Lead Type Recommendation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn('rounded-xl p-5 space-y-3', c.bg)}>
            <div className="flex items-center gap-3">
              <span className={cn('p-2 rounded-lg', c.bg, c.icon)}>
                {cfg.icon}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cfg.badge} Market Type</p>
                <h3 className={cn('text-lg font-serif font-bold', c.text)}>{cfg.title}</h3>
              </div>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{cfg.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic action checklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <CardTitle>Your Next Steps in This Market</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Actions derived from the FRED data signals above</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {topActions.map((action, i) => (
            <div key={i} className="flex gap-3">
              <div className="mt-0.5 shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{action}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Recent Searches ──────────────────────────────────────────────────────────

function RecentSearches({ onSelect }: { onSelect: (zip: string) => void }) {
  const { user } = useAuth();
  const { data: recents, isLoading } = useQuery({
    queryKey: ['lead-finder-recents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('lead_finder_analyses')
        .select('zip_code, city_state, opportunity_score, lead_type, refreshed_at')
        .eq('user_id', user.id)
        .order('refreshed_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (isLoading || !recents?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" />
        Recent Searches
      </p>
      <div className="flex flex-wrap gap-2">
        {recents.map((r) => (
          <button
            key={r.zip_code}
            onClick={() => onSelect(r.zip_code)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted/50 transition-colors text-sm"
          >
            <span className="font-medium">{r.zip_code}</span>
            {r.city_state && <span className="text-muted-foreground text-xs">{r.city_state}</span>}
            {r.opportunity_score !== null && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0',
                  r.opportunity_score >= 71 ? 'text-emerald-600 border-emerald-300' :
                  r.opportunity_score >= 41 ? 'text-amber-600 border-amber-300' :
                  'text-red-500 border-red-300'
                )}
              >
                {r.opportunity_score}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CSV Upload Section ───────────────────────────────────────────────────────

function CsvUpload({ currentResult }: { currentResult: LeadFinderResult | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'address'>('score');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const addrIdx = headers.findIndex(h => h.includes('address') || h === 'addr');
      const zipIdx = headers.findIndex(h => h.includes('zip'));

      const parsed: CsvRow[] = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
        const address = addrIdx >= 0 ? cols[addrIdx] || '' : cols[0] || '';
        const zip = zipIdx >= 0 ? cols[zipIdx]?.slice(0, 5) || '' : '';

        // Score from current result if ZIP matches, else null
        let score: number | null = null;
        let leadType: string | null = null;
        let topSignal: string | null = null;
        if (currentResult && zip === currentResult.zip) {
          score = currentResult.opportunityScore;
          leadType = currentResult.leadType;
          topSignal = currentResult.topFactors[0]?.label || null;
        }
        return { address, zip, score, leadType, topSignal };
      }).filter(r => r.address);

      setRows(parsed);
    } catch {
      toast({ title: 'Could not parse file', description: 'Make sure it is a valid CSV with address and zip columns.', variant: 'destructive' });
    }
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'score') return (b.score ?? -1) - (a.score ?? -1);
    return a.address.localeCompare(b.address);
  });

  const exportCsv = () => {
    const header = 'Address,ZIP,Opportunity Score,Lead Type,Top Signal\n';
    const body = sorted.map(r =>
      `"${r.address}","${r.zip}","${r.score ?? 'N/A'}","${r.leadType ?? 'N/A'}","${r.topSignal ?? 'N/A'}"`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead-finder-scored.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Score Your Own Lead List</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Every score in this table is derived from live federal economic data — not algorithmic estimates.</p>
          </div>
          <div className="flex gap-2">
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
              Upload CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:bg-muted/30 transition-colors space-y-2"
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground/70">Drop a CSV here or click to upload</p>
            <p className="text-xs text-muted-foreground">Include columns for <strong>Address</strong> and <strong>ZIP</strong>. Run a market analysis first to score matching ZIPs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">{rows.length} addresses loaded</p>
              <div className="flex gap-1 ml-auto">
                <Button size="sm" variant={sortBy === 'score' ? 'default' : 'ghost'} onClick={() => setSortBy('score')} className="text-xs h-7">
                  Sort by Score
                </Button>
                <Button size="sm" variant={sortBy === 'address' ? 'default' : 'ghost'} onClick={() => setSortBy('address')} className="text-xs h-7">
                  Sort by Address
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Address</th>
                      <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">ZIP</th>
                      <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Score</th>
                      <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Lead Type</th>
                      <th className="px-3 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Top Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r, i) => {
                      const isHigh = r.score !== null && r.score >= 71;
                      return (
                        <tr key={i} className={cn(
                          'border-t border-border/50',
                          isHigh ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-muted/20 transition-colors'
                        )}>
                          <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">{r.address || '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{r.zip || '—'}</td>
                          <td className="px-3 py-2.5">
                            {r.score !== null ? (
                              <span className={cn(
                                'font-bold text-base',
                                r.score >= 71 ? 'text-emerald-600' : r.score >= 41 ? 'text-amber-600' : 'text-red-500'
                              )}>
                                {r.score}
                              </span>
                            ) : <span className="text-muted-foreground/50 text-xs">Analyze ZIP</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.leadType ? (
                              <Badge variant="outline" className="capitalize text-xs">
                                {r.leadType}
                              </Badge>
                            ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell max-w-[180px] truncate">{r.topSignal || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadFinder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [zip, setZip] = useState('');
  const [cityState, setCityState] = useState('');
  const [result, setResult] = useState<LeadFinderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRecent = useCallback((recentZip: string) => {
    setZip(recentZip);
  }, []);

  const analyze = async () => {
    const trimmedZip = zip.trim();
    if (!trimmedZip) {
      toast({ title: 'Enter a ZIP code', description: 'Type a 5-digit ZIP to analyze market conditions.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fred-lead-finder', {
        body: undefined,
        headers: { 'Content-Type': 'application/json' },
      });
      // Invoke with query param via fetch directly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/fred-lead-finder?zip=${encodeURIComponent(trimmedZip)}`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      if (!resp.ok) throw new Error('Failed to fetch market data');
      const fredData: LeadFinderResult = await resp.json();
      if ((fredData as any).error) throw new Error((fredData as any).error);

      setResult(fredData);

      // Persist to Supabase for caching & recent searches
      if (user) {
        await supabase
          .from('lead_finder_analyses')
          .upsert({
            user_id: user.id,
            zip_code: trimmedZip,
            city_state: cityState.trim() || null,
            fred_data: fredData as any,
            opportunity_score: fredData.opportunityScore,
            lead_type: fredData.leadType,
            refreshed_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,zip_code',
          });
        queryClient.invalidateQueries({ queryKey: ['lead-finder-recents', user.id] });
      }
    } catch (err: any) {
      console.error('Lead finder error:', err);
      setError(err.message || 'Failed to fetch market data. Please try again.');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') analyze();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary/60">
            <Target className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Lead Finder</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Find Your Next Listing Opportunity
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            Every insight below is pulled from live federal economic data.{' '}
            <span className="font-semibold text-foreground/80">No guesswork. No estimates.</span>
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span>All data sourced directly from the Federal Reserve Economic Data (FRED) database</span>
            <a
              href="https://fred.stlouisfed.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* ── Step 1: Market Selector ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <CardTitle className="text-lg">Select Your Market</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ZIP Code</label>
                <Input
                  placeholder="e.g. 90210"
                  value={zip}
                  onChange={e => setZip(e.target.value.slice(0, 5))}
                  onKeyDown={handleKeyDown}
                  className="h-12 text-base font-mono"
                  maxLength={5}
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">City / State (optional)</label>
                <Input
                  placeholder="e.g. Beverly Hills, CA"
                  value={cityState}
                  onChange={e => setCityState(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 text-base"
                />
              </div>
              <div className="sm:self-end">
                <Button
                  onClick={analyze}
                  disabled={loading || !zip.trim()}
                  className="h-12 px-8 w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Analyze This Market
                    </>
                  )}
                </Button>
              </div>
            </div>

            <RecentSearches onSelect={handleSelectRecent} />
          </CardContent>
        </Card>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-52 bg-muted rounded-xl" />
                ))}
              </div>
            </div>
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {result && !loading && (
          <div className="space-y-8">
            {/* Market context badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-xs px-3 py-1">
                <Clock className="h-3 w-3 mr-1.5" />
                Data pulled {new Date(result.fetchedAt).toLocaleString()}
              </Badge>
              <Badge variant="outline" className="text-xs px-3 py-1 border-primary/30 text-primary">
                ZIP: {result.zip}
                {cityState && ` — ${cityState}`}
              </Badge>
              <span className="text-xs text-muted-foreground">National FRED data. All metrics verified at source.</span>
            </div>

            {/* ── Step 2: Market Data Panel ─────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="font-serif text-xl font-semibold">Current Market Conditions</h2>
              </div>
              <p className="text-sm text-muted-foreground -mt-1">
                Live data from the Federal Reserve. Each source code links directly to the FRED database for verification.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard metric={result.metrics.mortgage} />
                <MetricCard metric={result.metrics.inventory} invertTrend />
                <MetricCard metric={result.metrics.daysOnMarket} />
                <MetricCard metric={result.metrics.hpi} />
                <MetricCard metric={result.metrics.unemployment} invertTrend />
              </div>
            </section>

            {/* ── Step 3: Opportunity Score ─────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                <h2 className="font-serif text-xl font-semibold">Opportunity Score</h2>
              </div>
              <ScoreMeter
                score={result.opportunityScore}
                leadType={result.leadType}
                topFactors={result.topFactors}
                breakdown={result.scoreBreakdown}
              />
            </section>

            {/* ── Step 4 & 5: Lead Type + Action Plan ─────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                <h2 className="font-serif text-xl font-semibold">Recommendation & Action Plan</h2>
              </div>
              <LeadTypeCard leadType={result.leadType} metrics={result.metrics} />
            </section>

            {/* ── Step 6: CSV Upload ───────────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                <h2 className="font-serif text-xl font-semibold">Score Your Own Lead List</h2>
              </div>
              <CsvUpload currentResult={result} />
            </section>
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────────────── */}
        {!result && !loading && !error && (
          <div className="text-center py-20 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-semibold">Enter a ZIP Code to Begin</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                The Lead Finder will pull live federal data and calculate your market's opportunity score in seconds.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto pt-4 text-left">
              {[
                { icon: <BadgeDollarSign className="h-4 w-4" />, label: 'Mortgage Rate', src: 'FRED: MORTGAGE30US' },
                { icon: <Home className="h-4 w-4" />, label: 'Housing Supply', src: 'FRED: ACTLISCOUUS' },
                { icon: <TrendingUp className="h-4 w-4" />, label: 'Price Momentum', src: 'FRED: CSUSHPISA' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card p-3 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground/70">{item.src}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
