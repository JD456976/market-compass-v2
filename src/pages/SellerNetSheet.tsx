import { useState, useMemo, useCallback } from 'react';
import { DollarSign, Copy, Check, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip } from 'recharts';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function DollarInput({ label, value, onChange, sub }: { label: string; value: number; onChange: (v: number) => void; sub?: string }) {
  const [raw, setRaw] = useState(value.toLocaleString('en-US'));

  const handleBlur = () => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned) || 0;
    onChange(num);
    setRaw(num.toLocaleString('en-US'));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(e.target.value);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>{label}</label>
      {sub && <p className="text-[11px]" style={{ color: '#64748B' }}>{sub}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#64748B' }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full rounded-lg pl-7 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
        />
      </div>
    </div>
  );
}

function PctSlider({ label, value, onChange, min, max, step, sub }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; sub?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>{label}</label>
      {sub && <p className="text-[11px]" style={{ color: '#64748B' }}>{sub}</p>}
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
        <div className="relative w-20">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) onChange(v);
            }}
            step={step}
            min={min}
            max={max}
            className="w-full rounded-lg px-2 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#64748B' }}>%</span>
        </div>
      </div>
    </div>
  );
}

interface Scenario {
  label: string;
  pct: number;
  color: string;
  sale: number;
  commission: number;
  closing: number;
  mortgage: number;
  net: number;
}

const SellerNetSheet = () => {
  const { toast } = useToast();
  const [listPrice, setListPrice] = useState(500000);
  const [mortgagePayoff, setMortgagePayoff] = useState(280000);
  const [commissionPct, setCommissionPct] = useState(5.0);
  const [closingPct, setClosingPct] = useState(2.0);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [address, setAddress] = useState('');

  const scenarios: Scenario[] = useMemo(() => {
    return [
      { label: 'Full Ask', pct: 1.0, color: '#D4A853' },
      { label: 'Likely (97%)', pct: 0.97, color: '#818CF8' },
      { label: 'Conservative (93%)', pct: 0.93, color: '#64748B' },
    ].map((s) => {
      const sale = Math.round(listPrice * s.pct);
      const commission = Math.round(sale * (commissionPct / 100));
      const closing = Math.round(sale * (closingPct / 100));
      const net = sale - commission - closing - mortgagePayoff;
      return { ...s, sale, commission, closing, mortgage: mortgagePayoff, net };
    });
  }, [listPrice, mortgagePayoff, commissionPct, closingPct]);

  const copyToClipboard = useCallback(() => {
    const lines = [
      'SELLER NET SHEET ESTIMATE',
      `List Price: ${fmt(listPrice)}`,
      `Commission: ${commissionPct}%  |  Closing Costs: ${closingPct}%`,
      `Mortgage Payoff: ${fmt(mortgagePayoff)}`,
      '',
      ...scenarios.map(s =>
        `${s.label}: Sale ${fmt(s.sale)} − Commission ${fmt(s.commission)} − Closing ${fmt(s.closing)} − Mortgage ${fmt(s.mortgage)} = NET ${fmt(s.net)}`
      ),
      '',
      'This is an estimate only. Consult your title company for a formal net sheet.',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast({ title: 'Copied to clipboard', description: 'Net sheet summary copied.' });
    setTimeout(() => setCopied(false), 2000);
  }, [scenarios, listPrice, mortgagePayoff, commissionPct, closingPct, toast]);

  const rows = [
    { label: 'Sale Price', key: 'sale' as const },
    { label: 'Commission', key: 'commission' as const },
    { label: 'Closing Costs', key: 'closing' as const },
    { label: 'Mortgage Payoff', key: 'mortgage' as const },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,168,83,0.15)' }}>
            <DollarSign className="h-5 w-5" style={{ color: '#D4A853' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#F1F5F9' }}>Seller Net Sheet</h1>
            <p className="text-[13px]" style={{ color: '#94A3B8' }}>Estimate your seller's net proceeds at closing</p>
          </div>
        </div>

        {/* Input Card */}
        <Card className="mb-6" style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
          <CardContent className="p-5">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>Property Address</label>
                <input
                  type="text"
                  placeholder="123 Main St, City, State"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <DollarInput label="List Price" value={listPrice} onChange={setListPrice} />
                <DollarInput label="Mortgage Payoff Balance" value={mortgagePayoff} onChange={setMortgagePayoff} />
                <PctSlider label="Total Commission %" value={commissionPct} onChange={setCommissionPct} min={1} max={8} step={0.1} />
                <PctSlider label="Estimated Closing Costs %" value={closingPct} onChange={setClosingPct} min={0.5} max={5} step={0.1} sub="(title, escrow, transfer taxes, etc.)" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider" style={{ color: '#64748B' }}></th>
                    {scenarios.map((s) => (
                      <th key={s.label} className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: s.color }}>
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="py-2.5 px-4 text-sm" style={{ color: '#94A3B8' }}>{row.label}</td>
                      {scenarios.map((s) => (
                        <td key={s.label} className="py-2.5 px-4 text-right font-mono text-sm" style={{ color: '#CBD5E1' }}>
                          {row.key === 'commission' || row.key === 'closing'
                            ? `(${fmt(s[row.key])})`
                            : row.key === 'mortgage'
                            ? `(${fmt(s[row.key])})`
                            : fmt(s[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="py-0">
                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-sm font-bold" style={{ color: '#F1F5F9' }}>NET PROCEEDS</td>
                    {scenarios.map((s) => (
                      <td key={s.label} className="py-3 px-4 text-right font-mono font-bold text-lg" style={{ color: s.net >= 0 ? '#D4A853' : '#EF4444' }}>
                        {fmt(s.net)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart Breakdown */}
        {(() => {
          const s = scenarios[0]; // Full Ask scenario for pie
          const pieData = [
            { name: 'Net to Seller', value: Math.max(s.net, 0), color: '#D4A853' },
            { name: 'Commission', value: s.commission, color: '#334155' },
            { name: 'Closing Costs', value: s.closing, color: '#475569' },
            { name: 'Mortgage Payoff', value: s.mortgage, color: '#1E293B' },
          ].filter(d => d.value > 0);

          return (
            <Card className="mt-6" style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
                  Where the Money Goes (Full Ask)
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          cx="50%" cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            return (
                              <div className="rounded-md px-2.5 py-1.5 text-xs shadow-lg" style={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ color: '#94A3B8' }}>{d.name}: </span>
                                <span className="font-mono font-semibold" style={{ color: '#F1F5F9' }}>{fmt(d.value as number)}</span>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                          <span className="text-sm" style={{ color: '#CBD5E1' }}>{d.name}</span>
                        </div>
                        <span className="font-mono text-sm" style={{ color: '#F1F5F9' }}>{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Disclaimer & Buttons */}
        <div className="mt-4 space-y-3">
          <p className="text-[11px] leading-relaxed" style={{ color: '#64748B' }}>
            This is an estimate only. Actual closing costs vary. Consult your title company for a formal net sheet.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#F1F5F9' }}
            >
              {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {copied ? 'Copied!' : 'Copy Summary'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const addrLine = address ? ` — ${address}` : '';
                const s0 = scenarios[0];
                const s1 = scenarios[1];
                const s2 = scenarios[2];
                const lines = [
                  `📊 Seller Net Sheet${addrLine}`,
                  `List Price: ${fmt(listPrice)}`,
                  `Est. Agent Commission: ${fmt(s0.commission)}`,
                  `Closing Costs: ${fmt(s0.closing)}`,
                  `Mortgage Payoff: ${fmt(mortgagePayoff)}`,
                  '---',
                  'Net Proceeds:',
                  `✅ Full Ask: ${fmt(s0.net)}`,
                  `📊 Likely (97%): ${fmt(s1.net)}`,
                  `⚠️ Conservative (93%): ${fmt(s2.net)}`,
                  '',
                  'Generated by Market Compass | Chinatti Realty',
                ];
                navigator.clipboard.writeText(lines.join('\n'));
                setShareCopied(true);
                toast({ title: 'Copied!', description: 'Formatted summary ready to share.' });
                setTimeout(() => setShareCopied(false), 2000);
              }}
              style={{ backgroundColor: '#D4A853', color: '#0F172A' }}
              className="shrink-0 hover:opacity-90"
            >
              {shareCopied ? <Check className="h-4 w-4 mr-1.5" /> : <Share2 className="h-4 w-4 mr-1.5" />}
              {shareCopied ? 'Copied!' : 'Save & Share'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerNetSheet;
