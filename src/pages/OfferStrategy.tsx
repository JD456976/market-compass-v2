import { useState, useCallback } from 'react';
import { Crosshair, Loader2, DollarSign, TrendingUp, Shield, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function DollarInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#64748B' }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9,]/g, ''))}
          placeholder="0"
          className="w-full rounded-lg pl-7 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
        />
      </div>
    </div>
  );
}

const SELLER_PRIORITIES = ['Quick Close', 'Rent-back', 'As-Is', 'Flexible on repairs', 'High net'];

const ESCALATION_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'ask-ai', label: 'Ask AI' },
];

// ─── Result type ──────────────────────────────────────────────────────────────

interface StrategyResult {
  recommendedOffer: number;
  escalationAdvice: string;
  concessions: string[];
  keyInsight: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const OfferStrategy = () => {
  const { toast } = useToast();

  // Inputs
  const [listPrice, setListPrice] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [competing, setCompeting] = useState('');
  const [financing, setFinancing] = useState('');
  const [priorities, setPriorities] = useState<string[]>([]);
  const [escalation, setEscalation] = useState('ask-ai');

  // State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StrategyResult | null>(null);

  const togglePriority = (p: string) => {
    setPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const parseNum = (s: string) => parseFloat(s.replace(/,/g, '')) || 0;

  const generate = useCallback(async () => {
    const lp = parseNum(listPrice);
    const mb = parseNum(maxBudget);
    if (!lp || !mb) {
      toast({ title: 'Missing fields', description: 'Enter both List Price and Max Budget.', variant: 'destructive' });
      return;
    }
    if (!competing || !financing) {
      toast({ title: 'Missing fields', description: 'Select competition level and financing type.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResult(null);

    const prompt = `You are a real estate offer strategy advisor. Analyze the buyer's situation and generate a specific, data-grounded offer recommendation. Be direct and tactical. Return ONLY a raw JSON object (no markdown, no code fences) with these exact keys:
- recommendedOffer: number (the dollar amount to offer)
- escalationAdvice: string (escalation clause recommendation with reasoning, or "Not needed" if inappropriate)
- concessions: array of strings, max 3 (recommended concessions or waiver advice)
- keyInsight: string (2-3 sentence market framing narrative)

Here is the situation:
- List Price: $${lp.toLocaleString()}
- Buyer's Maximum Budget: $${mb.toLocaleString()}
- Expected Competing Offers: ${competing}
- Financing Type: ${financing}
- Seller's Priorities: ${priorities.length > 0 ? priorities.join(', ') : 'Not specified'}
- Include Escalation Clause: ${escalation}`;

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API error ${res.status}: ${errText.slice(0, 200)}`);
      }

      const json = await res.json();
      const rawText = json?.content?.[0]?.text || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');

      const parsed: StrategyResult = JSON.parse(jsonMatch[0]);

      if (!parsed.recommendedOffer || !parsed.keyInsight) {
        throw new Error('Incomplete response from AI');
      }

      setResult(parsed);
    } catch (e: any) {
      console.error('Offer strategy error:', e);
      toast({ title: 'Analysis failed', description: e.message || 'Could not generate strategy. Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [listPrice, maxBudget, competing, financing, priorities, escalation, toast]);

  const lp = parseNum(listPrice);
  const pctAbove = result && lp > 0
    ? (((result.recommendedOffer - lp) / lp) * 100).toFixed(1)
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,168,83,0.15)' }}>
            <Crosshair className="h-5 w-5" style={{ color: '#D4A853' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#F1F5F9' }}>Offer Strategy</h1>
            <p className="text-[13px]" style={{ color: '#94A3B8' }}>AI-powered offer analysis for competitive situations</p>
          </div>
        </div>

        {/* Input Card */}
        <Card className="mb-6" style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
          <CardContent className="p-5 space-y-6">
            {/* Property section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>Property</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DollarInput label="List Price" value={listPrice} onChange={setListPrice} />
                <DollarInput label="Your Buyer's Max Budget" value={maxBudget} onChange={setMaxBudget} />
              </div>
            </div>

            {/* Situation section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>Situation</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>Expected Competing Offers</label>
                  <Select value={competing} onValueChange={setCompeting}>
                    <SelectTrigger className="text-sm" style={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', color: '#F1F5F9' }}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Just us">Just us</SelectItem>
                      <SelectItem value="1-2 others">1-2 others</SelectItem>
                      <SelectItem value="3-5 others">3-5 others</SelectItem>
                      <SelectItem value="5+ offers / bidding war">5+ offers / bidding war</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>Financing Type</label>
                  <Select value={financing} onValueChange={setFinancing}>
                    <SelectTrigger className="text-sm" style={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', color: '#F1F5F9' }}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Conventional">Conventional</SelectItem>
                      <SelectItem value="FHA or VA">FHA or VA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seller priorities */}
              <div className="mt-4 space-y-1.5">
                <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>Seller's Priorities</label>
                <div className="flex flex-wrap gap-2">
                  {SELLER_PRIORITIES.map((p) => {
                    const active = priorities.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePriority(p)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{
                          backgroundColor: active ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.05)',
                          color: active ? '#D4A853' : '#94A3B8',
                          border: `1px solid ${active ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Escalation clause */}
              <div className="mt-4 space-y-1.5">
                <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>Include escalation clause?</label>
                <div className="flex gap-2">
                  {ESCALATION_OPTIONS.map((opt) => {
                    const active = escalation === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setEscalation(opt.value)}
                        className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: active ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.05)',
                          color: active ? '#818CF8' : '#94A3B8',
                          border: `1px solid ${active ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Generate button */}
            <Button
              onClick={generate}
              disabled={loading}
              className="w-full font-semibold text-sm py-5"
              style={{ background: 'linear-gradient(135deg, #D4A853 0%, #B8922E 100%)', color: '#0F172A' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing offer situation...
                </span>
              ) : (
                'Generate Offer Strategy →'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {/* Recommended Offer */}
              <Card style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4" style={{ color: '#D4A853' }} />
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Recommended Offer</p>
                  </div>
                  <p className="text-3xl font-bold font-mono" style={{ color: '#D4A853' }}>
                    {fmt(result.recommendedOffer)}
                  </p>
                  {pctAbove && (
                    <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                      {parseFloat(pctAbove) >= 0 ? `${pctAbove}% above ask` : `${Math.abs(parseFloat(pctAbove)).toFixed(1)}% below ask`}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Escalation Clause */}
              <Card style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4" style={{ color: '#818CF8' }} />
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Escalation Clause</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
                    {result.escalationAdvice}
                  </p>
                </CardContent>
              </Card>

              {/* Concession Strategy */}
              <Card style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4" style={{ color: '#34D399' }} />
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Concession Strategy</p>
                  </div>
                  <ul className="space-y-2">
                    {(result.concessions || []).map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#CBD5E1' }}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#34D399' }} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Key Insight */}
              <Card style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)', borderLeftWidth: '4px', borderLeftColor: '#D4A853' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4" style={{ color: '#D4A853' }} />
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Key Insight</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
                    {result.keyInsight}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OfferStrategy;
