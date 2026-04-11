import React, { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { formatPriceDisplay, parsePriceValue, stripCurrencyChars } from '@/lib/currencyFormat';

function DollarInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const display = value ? formatPriceDisplay(value) : '';
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <Input className="pl-7" placeholder={placeholder ?? '0'} value={display} onChange={(e) => onChange(stripCurrencyChars(e.target.value))} />
    </div>
  );
}

const TERMS = [10, 15, 20, 30];
const cardStyle = { background: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' };
const fmt = (n: number) => '$' + Math.round(n).toLocaleString();

export default function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState('500000');
  const [downPayment, setDownPayment] = useState('100000');
  const [rate, setRate] = useState(7.0);
  const [term, setTerm] = useState(30);
  const [taxes, setTaxes] = useState('6000');
  const [insurance, setInsurance] = useState('1800');
  const [hoa, setHoa] = useState('0');

  const calc = useMemo(() => {
    const hp = parsePriceValue(homePrice);
    const dp = parsePriceValue(downPayment);
    const loan = Math.max(hp - dp, 0);
    const downPct = hp > 0 ? (dp / hp) * 100 : 0;
    const monthlyRate = rate / 100 / 12;
    const n = term * 12;

    let pi = 0;
    if (monthlyRate > 0 && n > 0 && loan > 0) {
      pi = loan * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    } else if (loan > 0 && n > 0) {
      pi = loan / n;
    }

    const taxMo = parsePriceValue(taxes) / 12;
    const insMo = parsePriceValue(insurance) / 12;
    const hoaMo = parsePriceValue(hoa);
    const needsPmi = downPct < 20;
    const pmiMo = needsPmi ? (loan * 0.005) / 12 : 0;
    const total = pi + taxMo + insMo + pmiMo + hoaMo;
    const totalInterest = pi * n - loan;
    const totalCost = total * n;
    const incomeNeeded = (total * 12) / 0.28;

    return { loan, downPct, pi, taxMo, insMo, pmiMo, needsPmi, hoaMo, total, totalInterest, totalCost, incomeNeeded };
  }, [homePrice, downPayment, rate, term, taxes, insurance, hoa]);

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto space-y-6" style={{ background: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator className="h-7 w-7" style={{ color: '#D4A853' }} />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mortgage Calculator</h1>
          <p className="text-sm text-muted-foreground">Estimate monthly payments for your buyers</p>
        </div>
      </div>

      {/* Inputs */}
      <Card style={cardStyle}>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Home Price</label>
              <DollarInput value={homePrice} onChange={setHomePrice} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Down Payment <span className="text-muted-foreground ml-1">({calc.downPct.toFixed(1)}%)</span>
              </label>
              <DollarInput value={downPayment} onChange={setDownPayment} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Interest Rate: {rate.toFixed(3)}%</label>
              <Slider min={2} max={15} step={0.125} value={[rate]} onValueChange={([v]) => setRate(v)} className="mt-2" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Loan Term</label>
              <div className="flex gap-2 mt-1">
                {TERMS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTerm(t)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: term === t ? '#D4A853' : 'rgba(255,255,255,0.06)',
                      color: term === t ? '#0F172A' : '#94A3B8',
                    }}
                  >
                    {t} yr
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Annual Property Taxes <span className="ml-1">(est. {fmt(parsePriceValue(taxes) / 12)}/mo)</span>
              </label>
              <DollarInput value={taxes} onChange={setTaxes} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Annual Insurance <span className="ml-1">(est. {fmt(parsePriceValue(insurance) / 12)}/mo)</span>
              </label>
              <DollarInput value={insurance} onChange={setInsurance} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">HOA Fees / month</label>
              <DollarInput value={hoa} onChange={setHoa} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card style={cardStyle}>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Estimated Monthly Payment</p>
          <p className="text-4xl font-bold mb-4" style={{ color: '#D4A853' }}>{fmt(calc.total)}</p>
          <div className="space-y-2 text-sm">
            <Row label="Principal & Interest" value={fmt(calc.pi)} />
            <Row label="Property Tax" value={`${fmt(calc.taxMo)}/mo`} />
            <Row label="Homeowner's Insurance" value={`${fmt(calc.insMo)}/mo`} />
            {calc.needsPmi ? (
              <Row label="PMI (0.5% annual)" value={`${fmt(calc.pmiMo)}/mo`} />
            ) : (
              <div className="flex justify-between text-muted-foreground"><span>PMI</span><span className="text-green-400 text-xs">(not required)</span></div>
            )}
            {calc.hoaMo > 0 && <Row label="HOA" value={`${fmt(calc.hoaMo)}/mo`} />}
          </div>
        </CardContent>
      </Card>

      {/* Loan Details */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ['Loan Amount', fmt(calc.loan)],
          ['Total Interest', fmt(calc.totalInterest)],
          ['Total Cost', fmt(calc.totalCost)],
        ] as const).map(([label, val]) => (
          <Card key={label} style={cardStyle}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-base font-semibold text-foreground">{val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Affordability */}
      <Card style={cardStyle}>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-foreground">
            To qualify, buyer typically needs income of{' '}
            <span className="font-bold" style={{ color: '#D4A853' }}>{fmt(calc.incomeNeeded)}/yr</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">*Based on 28% front-end DTI guideline. Actual qualification varies.</p>
        </CardContent>
      </Card>

      <div className="pb-8" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
