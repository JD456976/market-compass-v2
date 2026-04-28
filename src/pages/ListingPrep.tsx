import { useState, useCallback } from 'react';
import { Sparkles, Copy, Check, RefreshCw, Home, MapPin, DollarSign, Clock, TrendingUp, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PrepResult {
  talkingPoints: string[];
  objections: { objection: string; rebuttal: string }[];
  pricingNarrative: string;
  marketContext: string;
  closingAsk: string;
}

const MARKET_CONDITIONS = [
  { value: 'strong_sellers', label: "Strong seller's market" },
  { value: 'sellers', label: "Seller's market" },
  { value: 'balanced', label: 'Balanced market' },
  { value: 'buyers', label: "Buyer's market" },
  { value: 'strong_buyers', label: "Strong buyer's market" },
];

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'condo', label: 'Condo / Townhouse' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'land', label: 'Land / Lot' },
];

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={cn('h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0', className)}
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ResultCard({ title, icon: Icon, children, copyText }: {
  title: string;
  icon: typeof Home;
  children: React.ReactNode;
  copyText?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(212,168,83,0.12)' }}>
          <Icon className="h-3.5 w-3.5" style={{ color: '#D4A853' }} />
        </div>
        <span className="flex-1 text-sm font-semibold text-white">{title}</span>
        {copyText && !collapsed && <CopyButton text={copyText} />}
        {collapsed
          ? <ChevronDown className="h-4 w-4 text-slate-500" />
          : <ChevronUp className="h-4 w-4 text-slate-500" />}
      </button>
      {!collapsed && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ListingPrep() {
  const { toast } = useToast();

  // Inputs
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [propType, setPropType] = useState('single_family');
  const [approxPrice, setApproxPrice] = useState('');
  const [bedBath, setBedBath] = useState('');
  const [marketCondition, setMarketCondition] = useState('sellers');
  const [sellerGoal, setSellerGoal] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  // Output
  const [result, setResult] = useState<PrepResult | null>(null);
  const [loading, setLoading] = useState(false);

  const canGenerate = address.trim() && city.trim() && approxPrice.trim();

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
    setResult(null);

    const marketLabel = MARKET_CONDITIONS.find(m => m.value === marketCondition)?.label || marketCondition;
    const typeLabel = PROPERTY_TYPES.find(t => t.value === propType)?.label || propType;

    try {
      const resp = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: `You are an expert real estate coach preparing an agent for a listing appointment. You write with confidence, specificity, and a focus on earning the seller's trust. No filler. No generic advice. Respond ONLY with a valid JSON object matching this exact structure, no markdown:
{
  "talkingPoints": ["string", "string", "string", "string", "string"],
  "objections": [
    {"objection": "string", "rebuttal": "string"},
    {"objection": "string", "rebuttal": "string"},
    {"objection": "string", "rebuttal": "string"}
  ],
  "pricingNarrative": "string",
  "marketContext": "string",
  "closingAsk": "string"
}`,
          messages: [{
            role: 'user',
            content: `Listing appointment prep for:
Address: ${address}, ${city}
Property type: ${typeLabel}
Approximate price range: ${approxPrice}
${bedBath ? 'Beds/baths: ' + bedBath : ''}
Current market: ${marketLabel}
${sellerGoal ? 'Seller goal: ' + sellerGoal : ''}
${extraNotes ? 'Notes: ' + extraNotes : ''}

Generate:
1. talkingPoints: 5 specific, confident talking points the agent should lead with (not generic — reference the price range, market condition, and property type)
2. objections: 3 likely seller objections (e.g. "I want to try FSBO", "Your commission is too high", "Another agent priced it higher") with sharp, non-defensive rebuttals
3. pricingNarrative: A 2-3 sentence pricing justification the agent can say out loud to the seller
4. marketContext: One sentence summarizing current market conditions relevant to this listing
5. closingAsk: The exact words the agent should use to ask for the listing at the end of the appointment`
          }]
        })
      });

      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      if (data?.type === 'error') throw new Error(data?.error?.message || 'API error');

      const raw = data?.content?.[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed: PrepResult = JSON.parse(clean);
      setResult(parsed);
    } catch (e) {
      toast({ title: 'Generation failed', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [address, city, propType, approxPrice, bedBath, marketCondition, sellerGoal, extraNotes, canGenerate, toast]);

  const allText = result ? [
    'TALKING POINTS\n' + result.talkingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'),
    '\nCOMMON OBJECTIONS\n' + result.objections.map(o => `Q: ${o.objection}\nA: ${o.rebuttal}`).join('\n\n'),
    '\nPRICING NARRATIVE\n' + result.pricingNarrative,
    '\nMARKET CONTEXT\n' + result.marketContext,
    '\nCLOSING ASK\n' + result.closingAsk,
  ].join('\n') : '';

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#0F172A' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,168,83,0.15)' }}>
              <Home className="h-5 w-5" style={{ color: '#D4A853' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Listing Prep</h1>
              <p className="text-xs" style={{ color: '#64748B' }}>AI-built appointment playbook</p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block" style={{ color: '#94A3B8' }}>Property Address</Label>
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main Street"
                className="text-sm"
                style={{ backgroundColor: '#0F1729', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: '#94A3B8' }}>City / Area</Label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Boston, MA"
                className="text-sm"
                style={{ backgroundColor: '#0F1729', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: '#94A3B8' }}>Approx. Price Range</Label>
              <Input
                value={approxPrice}
                onChange={e => setApproxPrice(e.target.value)}
                placeholder="$550,000–$600,000"
                className="text-sm"
                style={{ backgroundColor: '#0F1729', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: '#94A3B8' }}>Property Type</Label>
              <Select value={propType} onValueChange={setPropType}>
                <SelectTrigger className="text-sm h-9" style={{ backgroundColor: '#0F1729', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: '#94A3B8' }}>Beds / Baths</Label>
              <Input
                value={bedBath}
                onChange={e => setBedBath(e.target.value)}
                placeholder="4 bed / 2.5 bath"
                className="text-sm"
                style={{ backgroundColor: '#0F1729', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block" style={{ color: '#94A3B8' }}>Market Conditions</Label>
              <Select value={marketCondition} onValueChange={setMarketCondition}>
                <SelectTrigger className="text-sm h-9" style={{ backgroundColor: '#0F1729', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKET_CONDITIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: '#94A3B8' }}>Seller's Main Goal <span style={{ color: '#475569' }}>(optional)</span></Label>
              <Input
                value={sellerGoal}
                onChange={e => setSellerGoal(e.target.value)}
                placeholder="Downsize by fall"
                className="text-sm"
                style={{ backgroundColor: '#0F1729', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color: '#94A3B8' }}>Notes <span style={{ color: '#475569' }}>(optional)</span></Label>
              <Input
                value={extraNotes}
                onChange={e => setExtraNotes(e.target.value)}
                placeholder="Needs to close in 60 days"
                className="text-sm"
                style={{ backgroundColor: '#0F1729', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={!canGenerate || loading}
            className="w-full gap-2 font-semibold"
            style={{ backgroundColor: loading || !canGenerate ? undefined : '#D4A853', color: '#0F172A' }}
          >
            {loading ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Building your playbook…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate Playbook</>
            )}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Your Playbook</p>
              <CopyButton text={allText} className="h-7 w-7" />
            </div>

            {/* Market Context — always first, small */}
            <div className="rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}>
              <TrendingUp className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#D4A853' }} />
              <p className="text-[12px] leading-relaxed" style={{ color: '#CBD5E1' }}>{result.marketContext}</p>
            </div>

            <ResultCard
              title="Talking Points"
              icon={MessageSquare}
              copyText={result.talkingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
            >
              <ol className="space-y-2.5">
                {result.talkingPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5" style={{ backgroundColor: 'rgba(212,168,83,0.15)', color: '#D4A853' }}>
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{point}</p>
                  </li>
                ))}
              </ol>
            </ResultCard>

            <ResultCard
              title="Handle Objections"
              icon={MessageSquare}
              copyText={result.objections.map(o => `Q: ${o.objection}\nA: ${o.rebuttal}`).join('\n\n')}
            >
              <div className="space-y-4">
                {result.objections.map((obj, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#F87171' }}>THEM</span>
                      <p className="text-sm italic" style={{ color: '#94A3B8' }}>"{obj.objection}"</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ADE80' }}>YOU</span>
                      <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{obj.rebuttal}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ResultCard>

            <ResultCard
              title="Pricing Narrative"
              icon={DollarSign}
              copyText={result.pricingNarrative}
            >
              <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{result.pricingNarrative}</p>
            </ResultCard>

            <ResultCard
              title="The Ask — Closing the Appointment"
              icon={Home}
              copyText={result.closingAsk}
            >
              <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.15)' }}>
                <p className="text-sm leading-relaxed italic" style={{ color: '#E2E8F0' }}>"{result.closingAsk}"</p>
              </div>
            </ResultCard>

            <Button
              variant="outline"
              onClick={generate}
              className="w-full gap-2 text-sm"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#94A3B8' }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
