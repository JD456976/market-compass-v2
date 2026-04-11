import React, { useState, useMemo } from 'react';
import { BarChart2, Plus, Trash2, Copy, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPriceDisplay, parsePriceValue, stripCurrencyChars } from '@/lib/currencyFormat';

interface Comp {
  id: string;
  address: string;
  salePrice: string;
  sqft: string;
  dom: string;
  saleDate: string;
}

const emptyComp = (): Comp => ({
  id: crypto.randomUUID(),
  address: '',
  salePrice: '',
  sqft: '',
  dom: '',
  saleDate: '',
});

function DollarInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const display = value ? formatPriceDisplay(value) : '';
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <Input
        className="pl-7"
        placeholder={placeholder ?? '0'}
        value={display}
        onChange={(e) => onChange(stripCurrencyChars(e.target.value))}
      />
    </div>
  );
}

export default function QuickComps() {
  const [address, setAddress] = useState('');
  const [listPrice, setListPrice] = useState('500000');
  const [sqft, setSqft] = useState('2000');
  const [beds, setBeds] = useState('3');
  const [baths, setBaths] = useState('2');

  const [comps, setComps] = useState<Comp[]>([emptyComp(), emptyComp(), emptyComp()]);

  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);

  const subjectPpsf = useMemo(() => {
    const p = parsePriceValue(listPrice);
    const s = parseFloat(sqft) || 0;
    return s > 0 ? p / s : 0;
  }, [listPrice, sqft]);

  const compStats = useMemo(() => {
    return comps.map((c) => {
      const price = parsePriceValue(c.salePrice);
      const sf = parseFloat(c.sqft) || 0;
      const ppsf = sf > 0 ? price / sf : 0;
      let diffPct = 0;
      if (subjectPpsf > 0 && ppsf > 0) {
        diffPct = ((subjectPpsf - ppsf) / ppsf) * 100;
      }
      return { ppsf, diffPct, valid: price > 0 && sf > 0 };
    });
  }, [comps, subjectPpsf]);

  const summary = useMemo(() => {
    const validStats = compStats.filter((s) => s.valid);
    if (validStats.length === 0) return null;
    const avgPpsf = validStats.reduce((a, b) => a + b.ppsf, 0) / validStats.length;
    const subSqft = parseFloat(sqft) || 0;
    const low = Math.round((avgPpsf * 0.97) * subSqft);
    const high = Math.round((avgPpsf * 1.03) * subSqft);
    const diffPct = subjectPpsf > 0 ? ((subjectPpsf - avgPpsf) / avgPpsf) * 100 : 0;
    return { avgPpsf, low, high, diffPct };
  }, [compStats, sqft, subjectPpsf]);

  const updateComp = (id: string, field: keyof Comp, value: string) => {
    setComps((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeComp = (id: string) => {
    if (comps.length <= 1) return;
    setComps((prev) => prev.filter((c) => c.id !== id));
  };

  const addComp = () => {
    if (comps.length >= 5) return;
    setComps((prev) => [...prev, emptyComp()]);
  };

  const generateNarrative = async () => {
    const validComps = comps.filter((_, i) => compStats[i].valid);
    if (validComps.length === 0) {
      toast.error('Add at least one comp with sale price and sq ft');
      return;
    }
    setLoading(true);
    setNarrative('');
    try {
      const compText = validComps.map((c, i) => {
        const s = compStats[comps.indexOf(c)];
        return `Comp ${i + 1}: ${c.address || 'N/A'}, sold $${parsePriceValue(c.salePrice).toLocaleString()}, ${c.sqft} sqft ($${s.ppsf.toFixed(0)}/sqft), ${c.dom || '?'} DOM, ${c.saleDate || 'recent'}`;
      }).join('\n');

      const prompt = `You are a real estate pricing advisor. Given the subject property and comps, write a 3-4 sentence pricing narrative an agent can say out loud at a listing appointment. Be confident and specific. Return plain text only, no JSON.

Subject: ${address || 'Subject property'}, List Price $${parsePriceValue(listPrice).toLocaleString()}, ${sqft} sqft ($${subjectPpsf.toFixed(0)}/sqft), ${beds} bed / ${baths} bath.

${compText}

Average comp $/sqft: $${summary?.avgPpsf.toFixed(0) ?? 'N/A'}
Suggested range: $${summary?.low.toLocaleString() ?? '?'} – $${summary?.high.toLocaleString() ?? '?'}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data?.content?.[0]?.text ?? 'Unable to generate narrative.';
      setNarrative(text);
    } catch {
      toast.error('Failed to generate narrative');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => '$' + n.toLocaleString();

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto space-y-6" style={{ background: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="h-7 w-7" style={{ color: '#D4A853' }} />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Quick Comps Analyzer</h1>
          <p className="text-sm text-muted-foreground">Compare sales data and build your pricing recommendation</p>
        </div>
      </div>

      {/* Subject Property */}
      <Card style={{ background: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Subject Property</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Address</label>
              <Input placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">List Price</label>
              <DollarInput value={listPrice} onChange={setListPrice} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Square Footage</label>
              <Input type="number" placeholder="2000" value={sqft} onChange={(e) => setSqft(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Beds</label>
                <Input type="number" value={beds} onChange={(e) => setBeds(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Baths</label>
                <Input type="number" value={baths} onChange={(e) => setBaths(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Comparable Sales</h2>
          {comps.length < 5 && (
            <Button variant="outline" size="sm" onClick={addComp} style={{ borderColor: '#D4A853', color: '#D4A853' }}>
              <Plus className="h-4 w-4 mr-1" /> Add Comp
            </Button>
          )}
        </div>

        {comps.map((comp, idx) => {
          const stat = compStats[idx];
          return (
            <Card key={comp.id} style={{ background: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold mt-2 shrink-0" style={{ color: '#D4A853' }}>#{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <Input placeholder="Address" className="col-span-2 sm:col-span-1" value={comp.address} onChange={(e) => updateComp(comp.id, 'address', e.target.value)} />
                    <DollarInput value={comp.salePrice} onChange={(v) => updateComp(comp.id, 'salePrice', v)} placeholder="Sale Price" />
                    <Input type="number" placeholder="Sq Ft" value={comp.sqft} onChange={(e) => updateComp(comp.id, 'sqft', e.target.value)} />
                    <Input type="number" placeholder="DOM" value={comp.dom} onChange={(e) => updateComp(comp.id, 'dom', e.target.value)} />
                    <Input placeholder="Sale Date" value={comp.saleDate} onChange={(e) => updateComp(comp.id, 'saleDate', e.target.value)} />
                  </div>
                  <button onClick={() => removeComp(comp.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors mt-1 shrink-0" disabled={comps.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {stat.valid && (
                  <div className="flex gap-4 mt-2 ml-6 text-xs">
                    <span className="text-muted-foreground">${stat.ppsf.toFixed(0)}/sqft</span>
                    <span style={{
                      color: Math.abs(stat.diffPct) <= 5 ? '#D4A853' : stat.diffPct > 5 ? '#EF4444' : '#22C55E',
                    }}>
                      Subject is {stat.diffPct > 0 ? '+' : ''}{stat.diffPct.toFixed(1)}% vs this comp
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Bar */}
      {summary && (
        <Card style={{ background: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
          <CardContent className="p-4 flex flex-wrap gap-6 items-center text-sm">
            <div>
              <span className="text-muted-foreground">Avg Comp $/sqft: </span>
              <span className="font-semibold text-foreground">${summary.avgPpsf.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Suggested Range: </span>
              <span className="font-semibold text-foreground">{fmt(summary.low)} – {fmt(summary.high)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Subject vs Avg: </span>
              <span className="font-semibold" style={{
                color: Math.abs(summary.diffPct) <= 5 ? '#D4A853' : summary.diffPct > 5 ? '#EF4444' : '#22C55E',
              }}>
                {summary.diffPct > 0 ? '+' : ''}{summary.diffPct.toFixed(1)}%
                {summary.diffPct > 5 ? ' (overpriced)' : summary.diffPct < -5 ? ' (underpriced)' : ' (in range)'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Button */}
      <Button
        className="w-full h-12 text-base font-semibold"
        style={{ background: '#D4A853', color: '#0F172A' }}
        onClick={generateNarrative}
        disabled={loading}
      >
        {loading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyzing comps...</> : 'Generate Pricing Narrative →'}
      </Button>

      {/* Narrative Output */}
      <AnimatePresence>
        {narrative && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card style={{ background: '#1E293B', borderLeft: '4px solid #D4A853', borderColor: undefined }}>
              <div style={{ borderLeft: '4px solid #D4A853' }} className="rounded-xl">
                <CardContent className="p-5">
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{narrative}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => { navigator.clipboard.writeText(narrative); toast.success('Copied!'); }}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-muted-foreground text-center pb-8">
        For comparative purposes only. Verify all data with MLS records before presenting to clients.
      </p>
    </div>
  );
}
