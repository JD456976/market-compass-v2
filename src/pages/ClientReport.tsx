import React, { useState } from 'react';
import { FileText, Loader2, Copy, MessageSquare, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';

const REPORT_TYPES = ['Buyer Briefing', 'Seller Briefing', 'Market Overview'] as const;
const TIMEFRAMES = ['Last 30 days', 'Last 90 days', 'Last 6 months'] as const;

export default function ClientReport() {
  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [reportType, setReportType] = useState<string>('Buyer Briefing');
  const [timeframe, setTimeframe] = useState<string>('Last 90 days');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const canGenerate = clientName.trim() && address.trim();

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setReport('');
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: 'You are a real estate market analyst. Write a concise, professional market briefing an agent can share with a client. Use clear sections. Be specific and data-driven in tone.',
          messages: [{
            role: 'user',
            content: `Generate a ${reportType} for ${clientName} about ${address} covering ${timeframe}. Include: current market conditions, what it means for this client, 2-3 key talking points, and a recommended next step.`,
          }],
        }),
      });
      const data = await res.json();
      if (data?.type === 'error') throw new Error(data?.error?.message || 'Could not generate response.');
      const text = data?.content?.[0]?.text ?? 'Unable to generate report.';
      setReport(text);
    } catch {
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const copyReport = () => {
    const full = `Market Briefing for ${clientName}\n${today}\n\n${report}\n\nPowered by Market Compass`;
    navigator.clipboard.writeText(full);
    toast({ title: 'Copied to clipboard' });
  };

  const shareViaText = () => {
    const full = `Market Briefing for ${clientName}\n${today}\n\n${report}\n\nPowered by Market Compass`;
    window.open(`sms:?body=${encodeURIComponent(full)}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Report</h1>
          <p className="text-sm text-muted-foreground">Generate a branded market snapshot for your client</p>
        </div>
      </div>

      {/* Section 1 — Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Client Name</label>
            <Input placeholder="Jane Smith" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Property Address or Neighborhood</label>
            <Input placeholder="123 Main St or Back Bay, Boston" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Report Type</label>
            <ToggleGroup type="single" value={reportType} onValueChange={v => v && setReportType(v)} className="flex flex-wrap gap-2">
              {REPORT_TYPES.map(t => (
                <ToggleGroupItem key={t} value={t} className="rounded-full px-4 py-1.5 text-xs border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  {t}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Timeframe</label>
            <ToggleGroup type="single" value={timeframe} onValueChange={v => v && setTimeframe(v)} className="flex flex-wrap gap-2">
              {TIMEFRAMES.map(t => (
                <ToggleGroupItem key={t} value={t} className="rounded-full px-4 py-1.5 text-xs border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  {t}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Generate */}
      <Button onClick={generate} disabled={!canGenerate || loading} className="w-full h-12 text-base font-semibold">
        {loading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating…</> : 'Generate Report'}
      </Button>

      {/* Section 3 — Output */}
      {report && (
        <Card className="border-primary/30 client-report-printable">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground print-title">Market Briefing for {clientName}</h2>
              <p className="text-xs text-muted-foreground">{today}</p>
            </div>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {report}
            </div>
            <div className="flex gap-3 pt-2 print-hide">
              <Button onClick={copyReport} className="flex-1">
                <Copy className="h-4 w-4 mr-2" /> Copy Report
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
              <Button onClick={shareViaText} variant="outline" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" /> Share via Text
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">Powered by Market Compass</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
