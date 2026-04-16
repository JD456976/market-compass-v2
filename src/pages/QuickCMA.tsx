import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, BarChart3 } from 'lucide-react';

const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhome', 'Multi-Family'] as const;

export default function QuickCMA() {
  const [address, setAddress] = useState('');
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [sqft, setSqft] = useState('');
  const [propertyType, setPropertyType] = useState<string>('Single Family');
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [copied, setCopied] = useState(false);

  const runCMA = async () => {
    if (!address.trim() || !sqft.trim()) {
      toast({ title: 'Missing fields', description: 'Address and square footage are required.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setReport('');
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: 'You are a real estate appraiser and CMA expert. Provide concise, tactical comps analysis.',
          messages: [{
            role: 'user',
            content: `Run a quick CMA for ${address}, ${beds}bd/${baths}ba, ${sqft} sqft ${propertyType}. Target price: ${targetPrice.trim() || 'not specified'}. Provide: (1) Estimated market value range, (2) Key pricing factors (3 bullet points), (3) Suggested list price with rationale, (4) Days on market estimate. Be specific and numerical.`,
          }],
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = data.content?.[0]?.text || 'No response received.';
      setReport(text);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Quick CMA</h1>
      </div>
      <p className="text-muted-foreground text-sm">Run a fast Comparative Market Analysis powered by AI.</p>

      {/* Inputs */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-foreground">Subject Property Address *</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Springfield, IL" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-foreground">Beds</Label>
              <Input type="number" min={0} value={beds} onChange={e => setBeds(+e.target.value)} />
            </div>
            <div>
              <Label className="text-foreground">Baths</Label>
              <Input type="number" min={0} step={0.5} value={baths} onChange={e => setBaths(+e.target.value)} />
            </div>
            <div>
              <Label className="text-foreground">Sq Ft *</Label>
              <Input type="number" min={0} value={sqft} onChange={e => setSqft(e.target.value)} placeholder="1800" />
            </div>
          </div>

          <div>
            <Label className="text-foreground mb-2 block">Property Type</Label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setPropertyType(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    propertyType === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-foreground">Target List Price (optional)</Label>
            <Input value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="$425,000" />
          </div>

          <Button onClick={runCMA} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : 'Run CMA Analysis'}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      {report && (
        <Card className="border-primary/30 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-foreground text-lg">CMA Results</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{address} · {beds}bd/{baths}ba · {sqft} sqft · {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-invert max-w-none text-foreground text-sm whitespace-pre-wrap leading-relaxed">
              {report}
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={copyReport} variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/10">
                {copied ? <><Check className="h-4 w-4 mr-2" /> Copied</> : <><Copy className="h-4 w-4 mr-2" /> Copy CMA</>}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => {
                  const summary = `CMA for ${address}\n${beds}bd/${baths}ba ${sqft}sqft\n\n${report}\n\n— via Market Compass`;
                  window.open(`sms:?body=${encodeURIComponent(summary)}`);
                }}
              >
                Share via Text
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Powered by Market Compass</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
