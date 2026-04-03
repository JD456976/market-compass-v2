import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Home, Percent, Copy, Download, RotateCcw, TrendingDown, TrendingUp, Minus, Plus, Info } from 'lucide-react';
import { formatPriceDisplay, parsePriceValue, stripCurrencyChars } from '@/lib/currencyFormat';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NetSheetInputs {
  salePrice: string;
  mortgageBalance: string;
  secondMortgage: string;
  commissionRate: number;
  buyerAgentRate: number;
  sellerAgentRate: number;
  splitCommission: boolean;
  transferTaxRate: string;
  titleInsurance: string;
  escrowFees: string;
  homeWarranty: string;
  repairsCredits: string;
  hoaProration: string;
  propertyTaxProration: string;
  stagingCosts: string;
  miscCosts: string;
  sellerConcessions: string;
  propertyAddress: string;
  sellerName: string;
}

const DEFAULT_INPUTS: NetSheetInputs = {
  salePrice: '',
  mortgageBalance: '',
  secondMortgage: '',
  commissionRate: 5,
  buyerAgentRate: 2.5,
  sellerAgentRate: 2.5,
  splitCommission: true,
  transferTaxRate: '0.1',
  titleInsurance: '',
  escrowFees: '',
  homeWarranty: '500',
  repairsCredits: '',
  hoaProration: '',
  propertyTaxProration: '',
  stagingCosts: '',
  miscCosts: '',
  sellerConcessions: '',
  propertyAddress: '',
  sellerName: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

function pct(amount: number, total: number): string {
  if (!total) return '0%';
  return `${((amount / total) * 100).toFixed(1)}%`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NetSheet() {
  const [inputs, setInputs] = useState<NetSheetInputs>(DEFAULT_INPUTS);
  const { toast } = useToast();

  const update = useCallback((field: keyof NetSheetInputs, value: string | number | boolean) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateCurrency = useCallback((field: keyof NetSheetInputs, raw: string) => {
    const formatted = formatPriceDisplay(raw);
    setInputs(prev => ({ ...prev, [field]: formatted }));
  }, []);

  // ─── Calculations ─────────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const sale = parsePriceValue(inputs.salePrice);
    const mortgage1 = parsePriceValue(inputs.mortgageBalance);
    const mortgage2 = parsePriceValue(inputs.secondMortgage);

    let totalCommission: number;
    let buyerComm: number;
    let sellerComm: number;

    if (inputs.splitCommission) {
      buyerComm = sale * (inputs.buyerAgentRate / 100);
      sellerComm = sale * (inputs.sellerAgentRate / 100);
      totalCommission = buyerComm + sellerComm;
    } else {
      totalCommission = sale * (inputs.commissionRate / 100);
      buyerComm = totalCommission / 2;
      sellerComm = totalCommission / 2;
    }

    const transferTaxRate = parseFloat(inputs.transferTaxRate) || 0;
    const transferTax = sale * (transferTaxRate / 100);
    const titleIns = parsePriceValue(inputs.titleInsurance);
    const escrow = parsePriceValue(inputs.escrowFees);
    const warranty = parsePriceValue(inputs.homeWarranty);
    const repairs = parsePriceValue(inputs.repairsCredits);
    const hoa = parsePriceValue(inputs.hoaProration);
    const propTax = parsePriceValue(inputs.propertyTaxProration);
    const staging = parsePriceValue(inputs.stagingCosts);
    const misc = parsePriceValue(inputs.miscCosts);
    const concessions = parsePriceValue(inputs.sellerConcessions);

    const totalPayoffs = mortgage1 + mortgage2;
    const closingCosts = totalCommission + transferTax + titleIns + escrow + warranty;
    const totalCreditsRepairs = repairs + concessions;
    const totalOther = hoa + propTax + staging + misc;
    const totalDeductions = totalPayoffs + closingCosts + totalCreditsRepairs + totalOther;
    const netProceeds = sale - totalDeductions;

    return {
      sale,
      mortgage1, mortgage2, totalPayoffs,
      totalCommission, buyerComm, sellerComm,
      transferTax, titleIns, escrow, warranty,
      closingCosts,
      repairs, concessions, totalCreditsRepairs,
      hoa, propTax, staging, misc, totalOther,
      totalDeductions,
      netProceeds,
    };
  }, [inputs]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleReset = () => setInputs(DEFAULT_INPUTS);

  const handleCopy = () => {
    const lines = [
      inputs.sellerName ? `Seller: ${inputs.sellerName}` : '',
      inputs.propertyAddress ? `Property: ${inputs.propertyAddress}` : '',
      '',
      `Sale Price: ${fmt(calc.sale)}`,
      '',
      '── Payoffs ──',
      `1st Mortgage: (${fmt(calc.mortgage1)})`,
      calc.mortgage2 ? `2nd Mortgage: (${fmt(calc.mortgage2)})` : '',
      '',
      '── Closing Costs ──',
      `Commission: (${fmt(calc.totalCommission)})`,
      `Transfer Tax: (${fmt(calc.transferTax)})`,
      calc.titleIns ? `Title Insurance: (${fmt(calc.titleIns)})` : '',
      calc.escrow ? `Escrow Fees: (${fmt(calc.escrow)})` : '',
      calc.warranty ? `Home Warranty: (${fmt(calc.warranty)})` : '',
      '',
      '── Credits & Adjustments ──',
      calc.repairs ? `Repairs/Credits: (${fmt(calc.repairs)})` : '',
      calc.concessions ? `Seller Concessions: (${fmt(calc.concessions)})` : '',
      calc.hoa ? `HOA Proration: (${fmt(calc.hoa)})` : '',
      calc.propTax ? `Property Tax Proration: (${fmt(calc.propTax)})` : '',
      calc.staging ? `Staging: (${fmt(calc.staging)})` : '',
      calc.misc ? `Other Costs: (${fmt(calc.misc)})` : '',
      '',
      `Total Deductions: (${fmt(calc.totalDeductions)})`,
      `═══════════════════════`,
      `ESTIMATED NET PROCEEDS: ${fmt(calc.netProceeds)}`,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    toast({ title: 'Copied to clipboard', description: 'Net sheet summary copied.' });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-24 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Seller Net Sheet
          </h1>
          <p className="text-sm text-muted-foreground">
            Estimate your seller's net proceeds at closing. All calculations are instant and private.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left: Input Form ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Optional identification */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" /> Property Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Seller Name</Label>
                    <Input
                      placeholder="Jane Smith"
                      value={inputs.sellerName}
                      onChange={e => update('sellerName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Property Address</Label>
                    <Input
                      placeholder="123 Main St, Boston MA"
                      value={inputs.propertyAddress}
                      onChange={e => update('propertyAddress', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sale Price + Payoffs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sale Price & Payoffs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Expected Sale Price *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      className="pl-7 text-lg font-semibold"
                      placeholder="550,000"
                      value={inputs.salePrice}
                      onChange={e => updateCurrency('salePrice', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CurrencyField
                    label="1st Mortgage Balance"
                    value={inputs.mortgageBalance}
                    onChange={v => updateCurrency('mortgageBalance', v)}
                    placeholder="320,000"
                  />
                  <CurrencyField
                    label="2nd Mortgage / HELOC"
                    value={inputs.secondMortgage}
                    onChange={v => updateCurrency('secondMortgage', v)}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Commission */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" /> Commission
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Split view</Label>
                    <Switch
                      checked={inputs.splitCommission}
                      onCheckedChange={v => update('splitCommission', v)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {inputs.splitCommission ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Buyer's Agent</Label>
                        <span className="text-xs font-medium text-foreground">{inputs.buyerAgentRate}%</span>
                      </div>
                      <Slider
                        value={[inputs.buyerAgentRate]}
                        onValueChange={([v]) => update('buyerAgentRate', v)}
                        min={0} max={4} step={0.1}
                        className="py-1"
                      />
                      <p className="text-xs text-muted-foreground">{fmt(calc.buyerComm)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Seller's Agent</Label>
                        <span className="text-xs font-medium text-foreground">{inputs.sellerAgentRate}%</span>
                      </div>
                      <Slider
                        value={[inputs.sellerAgentRate]}
                        onValueChange={([v]) => update('sellerAgentRate', v)}
                        min={0} max={4} step={0.1}
                        className="py-1"
                      />
                      <p className="text-xs text-muted-foreground">{fmt(calc.sellerComm)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs text-muted-foreground">Total Commission</Label>
                      <span className="text-xs font-medium text-foreground">{inputs.commissionRate}%</span>
                    </div>
                    <Slider
                      value={[inputs.commissionRate]}
                      onValueChange={([v]) => update('commissionRate', v)}
                      min={0} max={8} step={0.1}
                      className="py-1"
                    />
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Total Commission</span>
                  <span className="font-semibold text-foreground">{fmt(calc.totalCommission)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Closing Costs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Closing Costs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Transfer / Excise Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.10"
                      value={inputs.transferTaxRate}
                      onChange={e => update('transferTaxRate', e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">{fmt(calc.transferTax)}</p>
                  </div>
                  <CurrencyField
                    label="Title Insurance"
                    value={inputs.titleInsurance}
                    onChange={v => updateCurrency('titleInsurance', v)}
                    placeholder="1,200"
                  />
                  <CurrencyField
                    label="Escrow / Settlement Fees"
                    value={inputs.escrowFees}
                    onChange={v => updateCurrency('escrowFees', v)}
                    placeholder="2,000"
                  />
                  <CurrencyField
                    label="Home Warranty"
                    value={inputs.homeWarranty}
                    onChange={v => updateCurrency('homeWarranty', v)}
                    placeholder="500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Credits, Prorations, Other */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Credits, Prorations & Other</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CurrencyField
                    label="Repairs / Credits to Buyer"
                    value={inputs.repairsCredits}
                    onChange={v => updateCurrency('repairsCredits', v)}
                    placeholder="0"
                  />
                  <CurrencyField
                    label="Seller Concessions"
                    value={inputs.sellerConcessions}
                    onChange={v => updateCurrency('sellerConcessions', v)}
                    placeholder="0"
                  />
                  <CurrencyField
                    label="HOA Proration"
                    value={inputs.hoaProration}
                    onChange={v => updateCurrency('hoaProration', v)}
                    placeholder="0"
                  />
                  <CurrencyField
                    label="Property Tax Proration"
                    value={inputs.propertyTaxProration}
                    onChange={v => updateCurrency('propertyTaxProration', v)}
                    placeholder="0"
                  />
                  <CurrencyField
                    label="Staging Costs"
                    value={inputs.stagingCosts}
                    onChange={v => updateCurrency('stagingCosts', v)}
                    placeholder="0"
                  />
                  <CurrencyField
                    label="Other / Miscellaneous"
                    value={inputs.miscCosts}
                    onChange={v => updateCurrency('miscCosts', v)}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Right: Live Summary ───────────────────────────────────── */}
          <div className="space-y-5">
            <div className="lg:sticky lg:top-20 space-y-5">
              {/* Net Proceeds Hero */}
              <Card className={`border-2 ${calc.netProceeds >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
                <CardContent className="pt-6 text-center space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                    Estimated Net Proceeds
                  </p>
                  <p className={`text-4xl font-bold tracking-tight ${
                    calc.netProceeds >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {fmt(calc.netProceeds)}
                  </p>
                  {calc.sale > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pct(Math.abs(calc.netProceeds), calc.sale)} of sale price
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <LineItem label="Sale Price" amount={calc.sale} positive />
                  <Separator className="my-2" />
                  <LineItem label="Mortgage Payoffs" amount={-calc.totalPayoffs} />
                  <LineItem label="Commission" amount={-calc.totalCommission} sub />
                  <LineItem label="Transfer Tax" amount={-calc.transferTax} sub />
                  <LineItem label="Title & Escrow" amount={-(calc.titleIns + calc.escrow)} sub />
                  <LineItem label="Home Warranty" amount={-calc.warranty} sub />
                  {calc.totalCreditsRepairs > 0 && (
                    <LineItem label="Repairs & Concessions" amount={-calc.totalCreditsRepairs} sub />
                  )}
                  {calc.totalOther > 0 && (
                    <LineItem label="Prorations & Other" amount={-calc.totalOther} sub />
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-foreground pt-1">
                    <span>Net Proceeds</span>
                    <span className={calc.netProceeds >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {fmt(calc.netProceeds)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Visual bar */}
              {calc.sale > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Where the Money Goes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <BarSegment label="Mortgage" amount={calc.totalPayoffs} total={calc.sale} color="bg-red-500/70" />
                    <BarSegment label="Commission" amount={calc.totalCommission} total={calc.sale} color="bg-amber-500/70" />
                    <BarSegment label="Closing Costs" amount={calc.transferTax + calc.titleIns + calc.escrow + calc.warranty} total={calc.sale} color="bg-blue-500/70" />
                    {(calc.totalCreditsRepairs + calc.totalOther) > 0 && (
                      <BarSegment label="Other" amount={calc.totalCreditsRepairs + calc.totalOther} total={calc.sale} color="bg-purple-500/70" />
                    )}
                    <BarSegment label="Net to Seller" amount={Math.max(calc.netProceeds, 0)} total={calc.sale} color="bg-green-500/70" />
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopy}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                This is an estimate only. Actual proceeds may vary based on final negotiations, 
                lender payoff amounts, and local closing practices. Consult with your title company 
                or attorney for exact figures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CurrencyField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <Input
          className="pl-7"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function LineItem({ label, amount, positive, sub }: {
  label: string; amount: number; positive?: boolean; sub?: boolean;
}) {
  if (amount === 0) return null;
  return (
    <div className={`flex justify-between ${sub ? 'pl-3 text-xs text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className={positive ? 'text-foreground font-medium' : 'text-red-400/80'}>
        {positive ? fmt(amount) : `(${fmt(Math.abs(amount))})`}
      </span>
    </div>
  );
}

function BarSegment({ label, amount, total, color }: {
  label: string; amount: number; total: number; color: string;
}) {
  const pctVal = total > 0 ? (amount / total) * 100 : 0;
  if (pctVal < 0.5) return null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{pctVal.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(pctVal, 100)}%` }}
        />
      </div>
    </div>
  );
}
