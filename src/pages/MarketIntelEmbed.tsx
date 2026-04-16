/**
 * MarketIntelEmbed — Tier 2 embeddable market intelligence widget.
 *
 * Accessible at /embed/market-intel?zip=02134
 * Designed to be iframed inside Deal Pilot deal views or any external app.
 * Shows a compact live market intelligence card for the given ZIP.
 * No auth required. Data pulled from the FRED edge function.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp, TrendingDown, Minus, Target, ExternalLink, Loader2, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricSnap {
  label: string;
  value: string;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  flagged: boolean;
}

interface EmbedData {
  zip: string;
  score: number;
  leadType: 'seller' | 'buyer' | 'transitional';
  topSignal: string;
  metrics: MetricSnap[];
  fetchedAt: string;
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'rising') return <TrendingUp className="h-3.5 w-3.5 text-red-500" />;
  if (trend === 'falling') return <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

const scoreColor = (s: number) => s >= 71 ? 'emerald' : s >= 41 ? 'amber' : 'red';
const scoreLabel = (s: number) => s >= 71 ? 'High Opportunity' : s >= 41 ? 'Emerging' : 'Low Opportunity';
const leadIcon = (t: string) => t === 'seller' ? '🔴' : t === 'buyer' ? '🟢' : '🟡';

const colorMap = {
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
  amber:   { bar: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-800'   },
  red:     { bar: 'bg-red-500',     text: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/30',       border: 'border-red-200 dark:border-red-800'       },
};

export default function MarketIntelEmbed() {
  const [params] = useSearchParams();
  const zip = params.get('zip') || '';
  const [data, setData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zip || zip.length !== 5) { setError('Please provide a 5-digit ZIP code.'); return; }
    setLoading(true);
    setError(null);
    const run = async () => {
      try {
        const raw = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            messages: [{
              role: 'user',
              content: `For ZIP code ${zip}, return ONLY a JSON object (no markdown) with: {"opportunityScore":<0-100>,"leadType":"buyer"|"seller"|"transitional","zip":"${zip}","fetchedAt":"${new Date().toISOString()}","topFactors":[{"reason":"<string>"}],"metrics":{"mortgage":{"current":<rate>,"trend":"stable"},"inventory":{"current":<num>,"trend":"stable"},"daysOnMarket":{"current":<num>,"trend":"stable"},"hpi":{"change90d":<num>,"trend":"stable"},"unemployment":{"current":<num>,"trend":"stable"}}}`
            }],
          }),
        });
        if (!raw.ok) throw new Error('API error ' + raw.status);
        const aiData = await raw.json();
        const text = aiData?.content?.[0]?.text || '';
        const res = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
        if (!res) throw new Error('Failed');

        // Build embed payload
        const r = res;
        const snap: EmbedData = {
          zip: r.zip,
          score: r.opportunityScore,
          leadType: r.leadType,
          topSignal: r.topFactors?.[0]?.reason || 'See full analysis for details.',
          fetchedAt: r.fetchedAt,
          metrics: [
            { label: '30yr Rate',   value: r.metrics?.mortgage?.current     != null ? `${r.metrics.mortgage.current.toFixed(2)}%`           : '—', trend: r.metrics?.mortgage?.trend     || 'unknown', flagged: r.metrics?.mortgage?.flagged     || false },
            { label: 'Inventory',   value: r.metrics?.inventory?.current    != null ? r.metrics.inventory.current.toLocaleString()           : '—', trend: r.metrics?.inventory?.trend    || 'unknown', flagged: r.metrics?.inventory?.flagged    || false },
            { label: 'Median DOM',  value: r.metrics?.daysOnMarket?.current != null ? `${Math.round(r.metrics.daysOnMarket.current)} days`   : '—', trend: r.metrics?.daysOnMarket?.trend || 'unknown', flagged: r.metrics?.daysOnMarket?.flagged || false },
            { label: 'HPI 90d',     value: r.metrics?.hpi?.change90d        != null ? `${r.metrics.hpi.change90d > 0 ? '+' : ''}${r.metrics.hpi.change90d.toFixed(1)}%` : '—', trend: r.metrics?.hpi?.trend || 'unknown', flagged: r.metrics?.hpi?.flagged || false },
            { label: 'Unemployment',value: r.metrics?.unemployment?.current != null ? `${r.metrics.unemployment.current.toFixed(1)}%`        : '—', trend: r.metrics?.unemployment?.trend || 'unknown', flagged: r.metrics?.unemployment?.flagged || false },
          ],
        };
        setData(snap);
      } catch (e: any) {
        setError(e.message || 'Could not load market data.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [zip]);

  if (!zip) return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      No ZIP code provided. Add <code className="mx-1 font-mono bg-muted px-1 rounded">?zip=02134</code> to the URL.
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />Loading market data for {zip}…
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-32 gap-2 text-destructive text-sm">
      <AlertTriangle className="h-4 w-4" />{error}
    </div>
  );

  if (!data) return null;

  const col = colorMap[scoreColor(data.score)];

  return (
    <div className="bg-background min-h-screen p-3 font-sans">
      <Card className={cn('border-2', col.border)}>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className={cn('h-4 w-4', col.text)} />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Market Intelligence</span>
            </div>
            <a
              href={`https://market-compass-v2.lovable.app/lead-finder?zip=${data.zip}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              Full Analysis <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex flex-col items-center">
              <span className={cn('text-4xl font-bold font-sans', col.text)}>{data.score}</span>
              <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', col.bar)} style={{ width: `${data.score}%` }} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('text-[10px] font-semibold px-2 py-0.5 border', col.bg, col.text, col.border)}>
                  {scoreLabel(data.score)}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">
                  {leadIcon(data.leadType)} {data.leadType} market · ZIP {data.zip}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <Separator />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {data.metrics.map(m => (
              <div key={m.label} className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-muted-foreground truncate">{m.label}</span>
                <div className="flex items-center gap-1">
                  {m.flagged && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                  <span className="text-xs font-semibold">{m.value}</span>
                  <TrendBadge trend={m.trend} />
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Top signal: </span>{data.topSignal}
          </p>
          <p className="text-[9px] text-muted-foreground/60">
            Source: FRED · {new Date(data.fetchedAt).toLocaleDateString()} · Powered by Market Compass
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
