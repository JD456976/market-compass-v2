import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RechartTooltip, YAxis,
} from 'recharts';
import {
  Target, TrendingUp, TrendingDown, Minus, AlertTriangle,
  ChevronDown, ChevronUp, Upload, Download, Clock, ExternalLink,
  CheckCircle2, CircleDot, Loader2, Search, History, Star,
  BadgeDollarSign, Home, Briefcase, Users, Pin, PinOff,
  RefreshCw, Share2, Copy, Check, X, Bell, BellOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface SavedMarket {
  zip_code: string;
  city_state: string | null;
  opportunity_score: number | null;
  lead_type: string | null;
  refreshed_at: string;
  is_pinned: boolean;
}

interface ScoreHistoryPoint {
  opportunity_score: number;
  lead_type: string;
  recorded_at: string;
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

function trendColorClass(trend: string, invert = false) {
  if (invert) {
    if (trend === 'rising') return 'text-emerald-600';
    if (trend === 'falling') return 'text-red-500';
  } else {
    if (trend === 'rising') return 'text-red-500';
    if (trend === 'falling') return 'text-emerald-600';
  }
  return 'text-muted-foreground';
}

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
    line: '#10b981',
  },
  amber: {
    bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800',
    line: '#f59e0b',
  },
  red: {
    bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800',
    line: '#ef4444',
  },
};

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, color, invertColor }: { data: HistoryPoint[]; color?: string; invertColor?: boolean }) {
  if (!data || data.length < 2) return null;
  const lineColor = color || '#6b7280';
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['auto', 'auto']} hide />
          <RechartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-popover border border-border rounded-md px-2 py-1 text-[10px] shadow-md">
                  <span className="text-muted-foreground">{payload[0]?.payload?.date} </span>
                  <span className="font-semibold text-foreground">{payload[0]?.value}</span>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ metric, invertTrend = false }: { metric: MetricData; invertTrend?: boolean }) {
  const change90d = metric.change90d;
  const trendUp = metric.trend === 'rising';
  const sparklineColor = invertTrend
    ? (trendUp ? '#10b981' : '#ef4444')
    : (trendUp ? '#ef4444' : '#10b981');

  return (
    <Card className="relative overflow-hidden flex flex-col">
      {metric.flagged && <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />}
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{metric.label}</p>
            <p className="text-xs text-foreground/60 mt-0.5 leading-tight">{metric.sublabel}</p>
          </div>
          {metric.flagged && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30 shrink-0 text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />Signal
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 flex flex-col">
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold font-serif tracking-tight">
            {formatValue(metric.current, metric.unit)}
          </span>
          <div className={cn('flex items-center gap-1 mb-0.5 text-xs font-medium', trendColorClass(metric.trend, invertTrend))}>
            <TrendIcon trend={metric.trend} />
            {trendLabel(metric.trend)}
          </div>
        </div>
        {change90d !== undefined && change90d !== null && (
          <p className="text-[10px] text-muted-foreground">
            90d change: <span className={cn('font-semibold', change90d > 0 ? 'text-red-500' : 'text-emerald-600')}>
              {change90d > 0 ? '+' : ''}{change90d.toFixed(2)}%
            </span>
          </p>
        )}

        {/* Sparkline */}
        {metric.history && metric.history.length > 1 && (
          <Sparkline data={metric.history} color={sparklineColor} />
        )}

        <Separator />
        <p className="text-xs text-foreground/80 leading-relaxed flex-1">{metric.note}</p>
        <div className="flex items-center justify-between pt-1">
          {metric.asOfDate && (
            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {metric.asOfDate}
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

function ScoreMeter({
  score, leadType, topFactors, breakdown, scoreHistory,
}: {
  score: number;
  leadType: string;
  topFactors: ScoreFactor[];
  breakdown: ScoreFactor[];
  scoreHistory: ScoreHistoryPoint[];
}) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(score);
  const label = scoreLabel(score);
  const c = colorTokens[color];

  // Build sparkline data from history
  const histData = scoreHistory.map(h => ({
    date: new Date(h.recorded_at).toLocaleDateString(),
    value: h.opportunity_score,
  }));

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
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex flex-col items-center">
            <span className={cn('text-7xl font-bold font-serif tracking-tight', c.text)}>{score}</span>
            <span className="text-sm text-muted-foreground">out of 100</span>
          </div>
          <div className="flex-1 min-w-48 space-y-3">
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>0 — Low</span><span>41 — Emerging</span><span>71 — High</span>
              </div>
              <div className="relative h-4 rounded-full bg-muted overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-[40%] bg-red-200/50 dark:bg-red-900/20" />
                  <div className="w-[30%] bg-amber-200/50 dark:bg-amber-900/20" />
                  <div className="w-[30%] bg-emerald-200/50 dark:bg-emerald-900/20" />
                </div>
                <div
                  className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-700 shadow-lg', c.bar)}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            <Badge className={cn('text-sm font-semibold px-3 py-1 border', c.bg, c.text, c.border)}>
              {label}
            </Badge>
          </div>
        </div>

        {/* Score history sparkline */}
        {histData.length >= 2 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <History className="h-3 w-3" />Score Trend ({histData.length} analyses)
            </p>
            <div className="h-12 bg-muted/20 rounded-lg p-1">
              <Sparkline data={histData} color={c.line} />
            </div>
          </div>
        )}

        {topFactors.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Top Factors Driving This Score</p>
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
                <li>• Mortgage rate &gt; 7% and rising → <strong>+20 pts</strong></li>
                <li>• Inventory below national baseline → <strong>+20 pts</strong></li>
                <li>• Days on market &gt; 45 → <strong>+15 pts</strong></li>
                <li>• Price index declining 90 days → <strong>+15 pts</strong></li>
                <li>• Unemployment stable or falling → <strong>+10 pts</strong></li>
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

// ─── Lead Type + Actions ──────────────────────────────────────────────────────

function LeadTypeCard({ leadType, metrics }: { leadType: string; metrics: LeadFinderResult['metrics'] }) {
  const config = {
    seller: {
      icon: <Home className="h-6 w-6" />, color: 'red', badge: '🔴',
      title: 'Seller Lead Market',
      description: 'Inventory is tight and borrowing costs are rising. Long-term homeowners with equity are your highest-probability prospects. Focus outreach on owners who have held their property 7 or more years.',
    },
    transitional: {
      icon: <CircleDot className="h-6 w-6" />, color: 'amber', badge: '🟡',
      title: 'Transitional Market',
      description: 'This market is showing mixed signals. Prioritize relationship building and past client outreach. Position yourself for listings before the market direction becomes clear.',
    },
    buyer: {
      icon: <Users className="h-6 w-6" />, color: 'emerald', badge: '🟢',
      title: 'Buyer Lead Market',
      description: 'Inventory is expanding and price momentum is softening. Focus on buyers who paused their search. Reconnect with prospects who were priced out 6–12 months ago.',
    },
  };
  const cfg = config[leadType as keyof typeof config] || config.transitional;
  const c = colorTokens[cfg.color as keyof typeof colorTokens];

  const actions: string[] = [];
  if (metrics.daysOnMarket.flagged) actions.push('Search your MLS for listings that expired in the last 60 days in this ZIP. These owners are proven sellers who need a new strategy.');
  if (metrics.inventory.flagged || metrics.inventory.trend === 'falling') actions.push('Pull your past client list and identify owners who have lived in their home 5 or more years. Low inventory means their timing to sell is strong.');
  if (metrics.mortgage.flagged || metrics.mortgage.trend === 'rising') actions.push('Contact your sphere with an equity update. Rising rates motivate homeowners with low locked-in rates to consider selling before buyer demand drops further.');
  if (metrics.hpi.flagged || (metrics.hpi.change90d != null && metrics.hpi.change90d < 0)) actions.push('Reach out to owners who purchased near the market peak. Softening prices may motivate move-up or rightsizing conversations now.');
  if (actions.length === 0) {
    actions.push('Review your sphere of influence for contacts who have expressed interest in selling within the next 12 months.');
    actions.push('Schedule market update touchpoints with your top 20 past clients — stay top of mind as conditions evolve.');
  }

  return (
    <div className="space-y-4">
      <Card className={cn('border-2', c.border)}>
        <CardHeader><div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-muted-foreground" /><CardTitle>Lead Type Recommendation</CardTitle></div></CardHeader>
        <CardContent>
          <div className={cn('rounded-xl p-5 space-y-3', c.bg)}>
            <div className="flex items-center gap-3">
              <span className={cn('p-2 rounded-lg', c.bg, c.text)}>{cfg.icon}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cfg.badge} Market Type</p>
                <h3 className={cn('text-lg font-serif font-bold', c.text)}>{cfg.title}</h3>
              </div>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{cfg.description}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /><CardTitle>Your Next Steps in This Market</CardTitle></div>
          <p className="text-xs text-muted-foreground">Actions derived from the FRED data signals above</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.slice(0, 4).map((action, i) => (
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

// ─── Market Brief Share ───────────────────────────────────────────────────────

function MarketBrief({ result, cityState }: { result: LeadFinderResult; cityState: string }) {
  const [copied, setCopied] = useState(false);

  const briefText = [
    `📍 Market Intelligence: ${result.zip}${cityState ? ` — ${cityState}` : ''}`,
    `📊 Opportunity Score: ${result.opportunityScore}/100 (${result.leadType === 'seller' ? '🔴 Seller' : result.leadType === 'transitional' ? '🟡 Transitional' : '🟢 Buyer'} Market)`,
    ``,
    `🏦 Borrowing Cost (30yr): ${result.metrics.mortgage.current?.toFixed(2) ?? '—'}% — ${result.metrics.mortgage.trend}`,
    `🏠 Active Listings: ${result.metrics.inventory.current?.toLocaleString() ?? '—'} — ${result.metrics.inventory.trend}`,
    `📅 Median Days on Market: ${result.metrics.daysOnMarket.current ? `${Math.round(result.metrics.daysOnMarket.current)} days` : '—'} — ${result.metrics.daysOnMarket.trend}`,
    `📈 Price Index (90d): ${result.metrics.hpi.change90d != null ? `${result.metrics.hpi.change90d > 0 ? '+' : ''}${result.metrics.hpi.change90d.toFixed(1)}%` : '—'}`,
    `👷 Unemployment: ${result.metrics.unemployment.current?.toFixed(1) ?? '—'}% — ${result.metrics.unemployment.trend}`,
    ``,
    `📌 Key Signal: ${result.topFactors[0]?.reason ?? 'Analysis complete.'}`,
    ``,
    `Source: Federal Reserve Economic Data (FRED). Generated ${new Date(result.fetchedAt).toLocaleDateString()}.`,
  ].join('\n');

  const copyBrief = async () => {
    await navigator.clipboard.writeText(briefText);
    setCopied(true);
    toast({ title: 'Market brief copied', description: 'Paste it into an email, text, or social post.' });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <CardTitle>Market Brief</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={copyBrief} className="gap-1.5">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Brief'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Ready-to-send market summary for prospects, sphere of influence, or social posts.</p>
      </CardHeader>
      <CardContent>
        <pre className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-4 border border-border/50 font-mono">
          {briefText}
        </pre>
      </CardContent>
    </Card>
  );
}

// ─── Saved Markets Watchlist ──────────────────────────────────────────────────

function SavedMarketsPanel({
  onSelect,
  activeZip,
}: {
  onSelect: (zip: string, cityState?: string) => void;
  activeZip: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: markets = [], isLoading } = useQuery<SavedMarket[]>({
    queryKey: ['lead-finder-markets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('lead_finder_analyses')
        .select('zip_code, city_state, opportunity_score, lead_type, refreshed_at, is_pinned')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('refreshed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as SavedMarket[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const togglePin = async (zip: string, isPinned: boolean) => {
    if (!user) return;
    await supabase
      .from('lead_finder_analyses')
      .update({ is_pinned: !isPinned })
      .eq('user_id', user.id)
      .eq('zip_code', zip);
    queryClient.invalidateQueries({ queryKey: ['lead-finder-markets', user?.id] });
  };

  if (isLoading) return <div className="h-16 bg-muted/30 rounded-xl animate-pulse" />;
  if (!markets.length) return null;

  const pinned = markets.filter(m => m.is_pinned);
  const recent = markets.filter(m => !m.is_pinned);

  const MarketRow = ({ m }: { m: SavedMarket }) => {
    const color = m.opportunity_score != null ? scoreColor(m.opportunity_score) : 'red';
    const c = colorTokens[color];
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer group',
          m.zip_code === activeZip
            ? 'border-primary/40 bg-primary/5'
            : 'border-border/50 hover:border-border hover:bg-muted/30'
        )}
        onClick={() => onSelect(m.zip_code, m.city_state ?? '')}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold font-mono">{m.zip_code}</span>
            {m.is_pinned && <Pin className="h-3 w-3 text-primary" />}
          </div>
          {m.city_state && <p className="text-[10px] text-muted-foreground truncate">{m.city_state}</p>}
          <p className="text-[10px] text-muted-foreground/60">
            {new Date(m.refreshed_at).toLocaleDateString()}
          </p>
        </div>
        {m.opportunity_score != null && (
          <div className="flex flex-col items-end gap-1">
            <span className={cn('text-lg font-bold font-serif', c.text)}>{m.opportunity_score}</span>
            <Badge variant="outline" className={cn('text-[9px] px-1 py-0 capitalize', c.text, c.border)}>
              {m.lead_type}
            </Badge>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); togglePin(m.zip_code, m.is_pinned); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
          title={m.is_pinned ? 'Unpin' : 'Pin market'}
        >
          {m.is_pinned ? <PinOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Saved Markets</CardTitle>
          <Badge variant="outline" className="text-xs ml-auto">{markets.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Click a market to reload its analysis. Pin frequently used markets to the top.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {pinned.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Pin className="h-3 w-3" />Pinned</p>
            {pinned.map(m => <MarketRow key={m.zip_code} m={m} />)}
          </div>
        )}
        {recent.length > 0 && (
          <div className="space-y-1.5">
            {pinned.length > 0 && <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent</p>}
            {recent.map(m => <MarketRow key={m.zip_code} m={m} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── CSV Upload ───────────────────────────────────────────────────────────────

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
        const zip = (zipIdx >= 0 ? cols[zipIdx] : '').replace(/\D/g, '').slice(0, 5);
        let score: number | null = null, leadType: string | null = null, topSignal: string | null = null;
        if (currentResult && zip === currentResult.zip) {
          score = currentResult.opportunityScore;
          leadType = currentResult.leadType;
          topSignal = currentResult.topFactors[0]?.label || null;
        }
        return { address, zip, score, leadType, topSignal };
      }).filter(r => r.address);
      setRows(parsed);
    } catch {
      toast({ title: 'Could not parse file', variant: 'destructive' });
    }
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sorted = [...rows].sort((a, b) =>
    sortBy === 'score' ? (b.score ?? -1) - (a.score ?? -1) : a.address.localeCompare(b.address)
  );

  const exportCsv = () => {
    const header = 'Address,ZIP,Opportunity Score,Lead Type,Top Signal\n';
    const body = sorted.map(r => `"${r.address}","${r.zip}","${r.score ?? 'N/A'}","${r.leadType ?? 'N/A'}","${r.topSignal ?? 'N/A'}"`).join('\n');
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
            <p className="text-xs text-muted-foreground mt-1">Every score is derived from live federal economic data — not algorithmic estimates.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}Upload CSV
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
            <p className="text-xs text-muted-foreground">Include <strong>Address</strong> and <strong>ZIP</strong> columns. Analyze a market first to score matching ZIPs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">{rows.length} addresses loaded</p>
              <div className="flex gap-1 ml-auto">
                <Button size="sm" variant={sortBy === 'score' ? 'default' : 'ghost'} onClick={() => setSortBy('score')} className="text-xs h-7">Score</Button>
                <Button size="sm" variant={sortBy === 'address' ? 'default' : 'ghost'} onClick={() => setSortBy('address')} className="text-xs h-7">Address</Button>
              </div>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      {['Address', 'ZIP', 'Score', 'Lead Type', 'Top Signal'].map(h => (
                        <th key={h} className="px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground last:hidden sm:last:table-cell">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r, i) => {
                      const isHigh = r.score != null && r.score >= 71;
                      return (
                        <tr key={i} className={cn('border-t border-border/50', isHigh ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-muted/20 transition-colors')}>
                          <td className="px-3 py-2.5 font-medium max-w-[160px] truncate">{r.address || '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground font-mono">{r.zip || '—'}</td>
                          <td className="px-3 py-2.5">
                            {r.score != null
                              ? <span className={cn('font-bold text-base', r.score >= 71 ? 'text-emerald-600' : r.score >= 41 ? 'text-amber-600' : 'text-red-500')}>{r.score}</span>
                              : <span className="text-muted-foreground/50 text-xs">Analyze ZIP</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.leadType ? <Badge variant="outline" className="capitalize text-xs">{r.leadType}</Badge> : <span className="text-muted-foreground/50 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell max-w-[160px] truncate">{r.topSignal || '—'}</td>
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
  const [retryCount, setRetryCount] = useState(0);

  // Score history for active ZIP
  const { data: scoreHistory = [] } = useQuery<ScoreHistoryPoint[]>({
    queryKey: ['lead-finder-score-history', user?.id, result?.zip],
    queryFn: async () => {
      if (!user || !result?.zip) return [];
      const { data, error } = await supabase
        .from('lead_finder_score_history')
        .select('opportunity_score, lead_type, recorded_at')
        .eq('user_id', user.id)
        .eq('zip_code', result.zip)
        .order('recorded_at', { ascending: true })
        .limit(30);
      if (error) throw error;
      return (data || []) as ScoreHistoryPoint[];
    },
    enabled: !!user && !!result?.zip,
  });

  const handleSelectMarket = useCallback((selectedZip: string, selectedCityState?: string) => {
    setZip(selectedZip);
    if (selectedCityState) setCityState(selectedCityState);
  }, []);

  const analyze = async () => {
    const trimmedZip = zip.trim();
    if (!trimmedZip || trimmedZip.length < 5) {
      toast({ title: 'Enter a 5-digit ZIP code', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(
        `${supabaseUrl}/functions/v1/fred-lead-finder?zip=${encodeURIComponent(trimmedZip)}`,
        {
          signal: controller.signal,
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        }
      );
      clearTimeout(timeout);

      if (!resp.ok) throw new Error(`Failed to fetch market data (${resp.status})`);
      const fredData: LeadFinderResult = await resp.json();
      if ((fredData as any).error) throw new Error((fredData as any).error);

      setResult(fredData);
      setRetryCount(0);

      if (user) {
        // Upsert analysis cache
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
          }, { onConflict: 'user_id,zip_code' });

        // Append to score history
        await supabase
          .from('lead_finder_score_history')
          .insert({
            user_id: user.id,
            zip_code: trimmedZip,
            city_state: cityState.trim() || null,
            opportunity_score: fredData.opportunityScore,
            lead_type: fredData.leadType,
          });

        queryClient.invalidateQueries({ queryKey: ['lead-finder-markets', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['lead-finder-score-history', user?.id, trimmedZip] });
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        setError('Request timed out. The FRED API may be slow — please try again.');
      } else {
        setError(err.message || 'Failed to fetch market data. Please try again.');
      }
      setRetryCount(r => r + 1);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') analyze();
  };

  const retry = () => analyze();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

          {/* ── Main Column ─────────────────────────────────────────────── */}
          <div className="space-y-8 min-w-0">

            {/* Page Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary/60">
                <Target className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Lead Finder</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
                Find Your Next Listing Opportunity
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
                Every insight below is pulled from live federal economic data.{' '}
                <span className="font-semibold text-foreground/80">No guesswork. No estimates.</span>
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>All data sourced directly from the Federal Reserve Economic Data (FRED) database</span>
                <a href="https://fred.stlouisfed.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Step 1 — Market Selector */}
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
                      onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
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
                    <Button onClick={analyze} disabled={loading || zip.length < 5} className="h-12 px-8 w-full sm:w-auto">
                      {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing…</> : <><Search className="h-4 w-4 mr-2" />Analyze This Market</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button size="sm" variant="outline" onClick={retry} className="shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {retryCount > 0 ? 'Retry again' : 'Retry'}
                </Button>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-56 bg-muted rounded-xl" />)}
                </div>
                <div className="h-64 bg-muted rounded-xl" />
                <div className="h-48 bg-muted rounded-xl" />
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div className="space-y-8">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-xs px-3 py-1">
                    <Clock className="h-3 w-3 mr-1.5" />
                    {new Date(result.fetchedAt).toLocaleString()}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-3 py-1 border-primary/30 text-primary">
                    ZIP: {result.zip}{cityState && ` — ${cityState}`}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={analyze} className="gap-1.5 text-xs ml-auto text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-3.5 w-3.5" />Refresh
                  </Button>
                </div>

                {/* Step 2 — Market Data */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                    <h2 className="font-serif text-xl font-semibold">Current Market Conditions</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">Live FRED data. Each source code links to the Federal Reserve for independent verification.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard metric={result.metrics.mortgage} />
                    <MetricCard metric={result.metrics.inventory} invertTrend />
                    <MetricCard metric={result.metrics.daysOnMarket} />
                    <MetricCard metric={result.metrics.hpi} />
                    <MetricCard metric={result.metrics.unemployment} invertTrend />
                  </div>
                </section>

                {/* Step 3 — Opportunity Score */}
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
                    scoreHistory={scoreHistory}
                  />
                </section>

                {/* Step 4 — Lead Type + Actions */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                    <h2 className="font-serif text-xl font-semibold">Recommendation & Action Plan</h2>
                  </div>
                  <LeadTypeCard leadType={result.leadType} metrics={result.metrics} />
                </section>

                {/* Market Brief */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                    <h2 className="font-serif text-xl font-semibold">Shareable Market Brief</h2>
                  </div>
                  <MarketBrief result={result} cityState={cityState} />
                </section>

                {/* CSV */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
                    <h2 className="font-serif text-xl font-semibold">Score Your Lead List</h2>
                  </div>
                  <CsvUpload currentResult={result} />
                </section>
              </div>
            )}

            {/* Empty state */}
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
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">{item.icon}</div>
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

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-20">
            <SavedMarketsPanel
              onSelect={handleSelectMarket}
              activeZip={result?.zip ?? ''}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
