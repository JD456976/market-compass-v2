import React, { useState, useMemo } from 'react';
import { BarChart2, Plus, Trash2, Copy, Loader2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
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

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (data?.type === 'error') throw new Error(data?.error?.message || 'Could not generate response.');
      const text = data?.content?.[0]?.text ?? 'Unable to generate narrative.';
      setNarrative(text);
    } catch {
      toast.error('Failed to generate narrative');
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = () => {
    const pdf = new jsPDF('p', 'mm', 'letter');
    const pw = 215.9;
    const ph = 279.4;
    const m = 16;
    const cw = pw - m * 2;
    let y = m;

    const navy = [15, 23, 42] as const;
    const gold = [212, 168, 83] as const;
    const darkCard = [30, 41, 59] as const;
    const white = [241, 245, 249] as const;
    const muted = [148, 163, 184] as const;

    // Header bar
    pdf.setFillColor(...navy);
    pdf.rect(0, 0, pw, 28, 'F');
    pdf.setFillColor(...gold);
    pdf.rect(0, 28, pw, 1.5, 'F');

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...white);
    pdf.text('Comparative Market Analysis', m, 13);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...muted);
    pdf.text('Jason Craig | Chinatti Realty', m, 19);
    pdf.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, m, 24);

    pdf.setFontSize(8);
    pdf.setTextColor(...gold);
    pdf.text('Market Compass', pw - m, 19, { align: 'right' });

    y = 36;

    // Subject Property section
    pdf.setFillColor(...darkCard);
    pdf.roundedRect(m, y, cw, 32, 2, 2, 'F');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...gold);
    pdf.text('SUBJECT PROPERTY', m + 5, y + 7);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...white);
    const subAddr = address || 'Not specified';
    pdf.text(subAddr, m + 5, y + 14);

    pdf.setTextColor(...muted);
    pdf.setFontSize(8);
    pdf.text(`${beds} Bed / ${baths} Bath  •  ${parseInt(sqft).toLocaleString() || '—'} sqft  •  List Price: $${parsePriceValue(listPrice).toLocaleString()}  •  $${subjectPpsf.toFixed(0)}/sqft`, m + 5, y + 21);

    y += 38;

    // Comparable Sales table
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...gold);
    pdf.text('COMPARABLE SALES', m, y);
    y += 6;

    // Table header
    const cols = [m, m + 55, m + 85, m + 105, m + 130, m + 155];
    const colLabels = ['Address', 'Sale Price', 'SqFt', '$/SqFt', 'DOM', 'Sale Date'];
    pdf.setFillColor(...navy);
    pdf.rect(m, y, cw, 7, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...muted);
    colLabels.forEach((l, i) => pdf.text(l, cols[i] + 2, y + 5));
    y += 7;

    // Table rows
    const validComps = comps.filter((_, i) => compStats[i].valid);
    validComps.forEach((c, i) => {
      const s = compStats[comps.indexOf(c)];
      const rowBg = i % 2 === 0 ? darkCard : [24, 34, 50] as const;
      pdf.setFillColor(...(rowBg as readonly [number, number, number]));
      pdf.rect(m, y, cw, 7, 'F');

      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...white);
      pdf.text((c.address || `Comp ${i + 1}`).substring(0, 30), cols[0] + 2, y + 5);
      pdf.text(`$${parsePriceValue(c.salePrice).toLocaleString()}`, cols[1] + 2, y + 5);
      pdf.text(c.sqft || '—', cols[2] + 2, y + 5);
      pdf.text(`$${s.ppsf.toFixed(0)}`, cols[3] + 2, y + 5);
      pdf.text(c.dom || '—', cols[4] + 2, y + 5);
      pdf.text(c.saleDate || '—', cols[5] + 2, y + 5);
      y += 7;
    });

    if (validComps.length === 0) {
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text('No comparable sales entered.', m + 5, y + 5);
      y += 10;
    }

    y += 6;

    // Pricing Recommendation
    if (summary) {
      pdf.setFillColor(...darkCard);
      pdf.roundedRect(m, y, cw, 28, 2, 2, 'F');

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...gold);
      pdf.text('PRICING RECOMMENDATION', m + 5, y + 7);

      pdf.setFontSize(9);
      pdf.setTextColor(...white);
      pdf.text(`Suggested Range: $${summary.low.toLocaleString()} – $${summary.high.toLocaleString()}`, m + 5, y + 14);

      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(`Average Comp $/sqft: $${summary.avgPpsf.toFixed(0)}  •  Subject vs Avg: ${summary.diffPct > 0 ? '+' : ''}${summary.diffPct.toFixed(1)}%`, m + 5, y + 20);

      // Simple bar visualization
      const barX = m + 5;
      const barW = cw - 10;
      const barY2 = y + 24;
      pdf.setFillColor(50, 60, 80);
      pdf.rect(barX, barY2, barW, 2, 'F');

      // Subject position on bar (clamp 0.1 to 0.9)
      const pos = Math.max(0.1, Math.min(0.9, 0.5 + (summary.diffPct / 20)));
      pdf.setFillColor(...gold);
      pdf.circle(barX + barW * pos, barY2 + 1, 2, 'F');

      // Labels
      pdf.setFontSize(6);
      pdf.setTextColor(...muted);
      pdf.text('Low', barX, barY2 - 1);
      pdf.text('High', barX + barW - 6, barY2 - 1);

      y += 34;
    }

    // AI Narrative
    if (narrative) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...gold);
      pdf.text('PRICING NARRATIVE', m, y);
      y += 5;

      pdf.setFillColor(...darkCard);
      // Gold left border
      pdf.setFillColor(...gold);
      pdf.rect(m, y, 1.5, 1, 'F'); // placeholder height, will adjust

      pdf.setFillColor(...darkCard);
      const narrativeLines = pdf.splitTextToSize(narrative, cw - 12);
      const narrativeH = narrativeLines.length * 4 + 6;
      pdf.roundedRect(m, y, cw, narrativeH, 2, 2, 'F');
      pdf.setFillColor(...gold);
      pdf.rect(m, y, 1.5, narrativeH, 'F');

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...white);
      pdf.text(narrativeLines, m + 6, y + 5);
      y += narrativeH + 6;
    }

    // Footer
    const footY = ph - 14;
    pdf.setDrawColor(...gold);
    pdf.line(m, footY, pw - m, footY);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...muted);
    pdf.text('Report generated by Market Compass | Chinatti Realty', m, footY + 5);
    pdf.setFontSize(6);
    pdf.text('This CMA is for informational purposes only and does not constitute an appraisal.', m, footY + 9);

    const date = new Date().toISOString().split('T')[0];
    const safeName = (address || 'CMA').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
    pdf.save(`CMA-${safeName}-${date}.pdf`);
    toast.success('PDF downloaded!');
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

      {/* PDF Download Button */}
      <Button
        className="w-full h-12 text-base font-semibold"
        style={{ background: '#D4A853', color: '#0F172A' }}
        onClick={generatePdf}
      >
        <Download className="h-5 w-5 mr-2" /> Download Comp Report PDF
      </Button>

      <p className="text-xs text-muted-foreground text-center pb-8">
        For comparative purposes only. Verify all data with MLS records before presenting to clients.
      </p>
    </div>
  );
}
