import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { MapPin, Plus, X, Loader2, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ZipResult {
  zip: string;
  score: number;
  leadType: 'seller' | 'buyer' | 'transitional';
  metrics: {
    mortgage: number;
    inventory: number;
    dom: number;
    hpi: number;
    unemployment: number;
  };
  loading?: boolean;
  error?: string;
}

const LEAD_COLORS = {
  seller: 'text-emerald-500 bg-emerald-500/10',
  buyer: 'text-blue-500 bg-blue-500/10',
  transitional: 'text-amber-500 bg-amber-500/10',
};

const CHART_COLORS = ['hsl(var(--primary))', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

function scoreToRadar(result: ZipResult) {
  return [
    { axis: 'Supply', value: Math.min(100, Math.max(0, 100 - result.metrics.inventory)) },
    { axis: 'Velocity', value: Math.min(100, Math.max(0, 100 - result.metrics.dom)) },
    { axis: 'Price', value: Math.min(100, Math.max(0, result.metrics.hpi)) },
    { axis: 'Jobs', value: Math.min(100, Math.max(0, 100 - result.metrics.unemployment)) },
    { axis: 'Affordability', value: Math.min(100, Math.max(0, 100 - result.metrics.mortgage)) },
  ];
}

async function fetchZipScore(zip: string, user_id: string): Promise<ZipResult> {
  // Try to load from cache first
  const { data: cached } = await supabase
    .from('lead_finder_analyses')
    .select('opportunity_score, lead_type, fred_data, refreshed_at')
    .eq('zip_code', zip)
    .eq('user_id', user_id)
    .single();

  const isStale = cached
    ? (Date.now() - new Date(cached.refreshed_at).getTime()) > 24 * 60 * 60 * 1000
    : true;

  if (cached && !isStale) {
    const fd = cached.fred_data as any;
    return {
      zip,
      score: cached.opportunity_score ?? 50,
      leadType: (cached.lead_type as any) ?? 'transitional',
      metrics: {
        mortgage: fd?.mortgage?.current ?? 50,
        inventory: fd?.inventory?.current ?? 50,
        dom: fd?.daysOnMarket?.current ?? 50,
        hpi: fd?.hpi?.current ?? 50,
        unemployment: fd?.unemployment?.current ?? 50,
      },
    };
  }

  // Fetch live
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/fred-lead-finder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ zip }),
  });
  if (!res.ok) throw new Error('Failed to fetch');
  const data = await res.json();

  return {
    zip,
    score: data.opportunityScore ?? 50,
    leadType: data.leadType ?? 'transitional',
    metrics: {
      mortgage: data.metrics?.mortgage?.current ?? 50,
      inventory: data.metrics?.inventory?.current ?? 50,
      dom: data.metrics?.daysOnMarket?.current ?? 50,
      hpi: data.metrics?.hpi?.current ?? 50,
      unemployment: data.metrics?.unemployment?.current ?? 50,
    },
  };
}

export function NeighborhoodMomentumMap({ primaryZip }: { primaryZip?: string }) {
  const { user } = useAuth();
  const [zips, setZips] = useState<ZipResult[]>([]);
  const [inputZip, setInputZip] = useState('');
  const [loading, setLoading] = useState(false);

  const addZip = async () => {
    const zip = inputZip.trim();
    if (!zip.match(/^\d{5}$/) || !user) return;
    if (zips.find(z => z.zip === zip)) {
      toast({ title: 'Already added', description: `${zip} is already in your comparison.` });
      return;
    }
    if (zips.length >= 4) {
      toast({ title: 'Max 4 ZIPs', description: 'Remove one to add another.' });
      return;
    }

    setLoading(true);
    setInputZip('');
    try {
      const result = await fetchZipScore(zip, user.id);
      setZips(z => [...z, result]);
    } catch {
      toast({ title: 'Error', description: `Could not load data for ${zip}.`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const removeZip = (zip: string) => setZips(z => z.filter(r => r.zip !== zip));

  // Pre-load primary zip if provided
  const handleAddPrimary = async () => {
    if (primaryZip && !zips.find(z => z.zip === primaryZip) && user) {
      setLoading(true);
      try {
        const result = await fetchZipScore(primaryZip, user.id);
        setZips([result]);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  };

  // Build radar data merging all ZIPs
  const radarData = zips.length > 0 ? scoreToRadar(zips[0]).map((pt, i) => {
    const row: Record<string, any> = { axis: pt.axis };
    zips.forEach(z => {
      row[z.zip] = scoreToRadar(z)[i].value;
    });
    return row;
  }) : [];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-base">Neighborhood Momentum Map</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Compare up to 4 ZIP codes side-by-side</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ZIP Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter ZIP code"
            value={inputZip}
            onChange={e => setInputZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            onKeyDown={e => e.key === 'Enter' && addZip()}
            className="h-9 text-sm"
            maxLength={5}
          />
          <Button size="sm" onClick={addZip} disabled={loading || inputZip.length !== 5} className="gap-1.5 shrink-0">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
          {primaryZip && zips.length === 0 && !loading && (
            <Button size="sm" variant="outline" onClick={handleAddPrimary} className="shrink-0 text-xs">
              Load {primaryZip}
            </Button>
          )}
        </div>

        {/* ZIP Badges */}
        {zips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {zips.map((z, i) => (
              <div key={z.zip} className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-3 py-1">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i] }} />
                <span className="text-xs font-medium">{z.zip}</span>
                <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', LEAD_COLORS[z.leadType])}>
                  {z.score}
                </Badge>
                <button onClick={() => removeZip(z.zip)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Radar Chart */}
        {zips.length >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 0, right: 30, bottom: 0, left: 30 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                {zips.map((z, i) => (
                  <Radar
                    key={z.zip}
                    name={z.zip}
                    dataKey={z.zip}
                    stroke={CHART_COLORS[i]}
                    fill={CHART_COLORS[i]}
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                  />
                ))}
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: number, name: string) => [val.toFixed(0), name]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Score Comparison Table */}
        {zips.length > 0 && (
          <div className="space-y-2">
            {zips.sort((a, b) => b.score - a.score).map((z, i) => (
              <div key={z.zip} className={cn('flex items-center gap-3 rounded-lg p-2.5 border', i === 0 && 'border-primary/20 bg-primary/5')}>
                <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: CHART_COLORS[zips.findIndex(x => x.zip === z.zip)] + '20', color: CHART_COLORS[zips.findIndex(x => x.zip === z.zip)] }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{z.zip}</span>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', LEAD_COLORS[z.leadType])}>
                      {z.leadType}
                    </Badge>
                    {i === 0 && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Top Market</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-sans">{z.score}</div>
                  <div className="text-[10px] text-muted-foreground">score</div>
                </div>
                <div className="h-12 w-20 relative">
                  <div className="absolute inset-y-0 left-0 bg-muted rounded-full w-full overflow-hidden flex items-center">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${z.score}%`,
                        backgroundColor: CHART_COLORS[zips.findIndex(x => x.zip === z.zip)],
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {zips.length === 0 && !loading && (
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Add ZIP codes above to compare market momentum</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
