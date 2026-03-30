import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, CheckCircle2, AlertTriangle, TrendingUp, Clock, DollarSign, Shield, Home, Brain } from 'lucide-react';
import { ExtendedLikelihoodBand, LikelihoodBand, Session } from '@/types';
import { MarketSnapshot, getMarketContext } from '@/lib/marketSnapshots';

interface SuccessPredictionProps {
  type: 'buyer' | 'seller';
  likelihood: ExtendedLikelihoodBand | LikelihoodBand;
  session: Session;
  snapshot?: MarketSnapshot;
}

function bandToPercent(band: string): { min: number; max: number; display: string } {
  switch (band) {
    case 'Very High': return { min: 80, max: 95, display: '80-95%' };
    case 'High': return { min: 60, max: 80, display: '60-80%' };
    case 'Moderate': return { min: 40, max: 60, display: '40-60%' };
    case 'Low': return { min: 20, max: 40, display: '20-40%' };
    case 'Very Low': return { min: 5, max: 20, display: '5-20%' };
    default: return { min: 40, max: 60, display: '40-60%' };
  }
}

function getGaugeColor(band: string): string {
  switch (band) {
    case 'Very High':
    case 'High':
      return 'text-emerald-500';
    case 'Moderate':
      return 'text-amber-500';
    default:
      return 'text-destructive';
  }
}

function getBgColor(band: string): string {
  switch (band) {
    case 'Very High':
    case 'High':
      return 'bg-emerald-500';
    case 'Moderate':
      return 'bg-amber-500';
    default:
      return 'bg-destructive';
  }
}

interface ContributingFactor {
  icon: React.ReactNode;
  label: string;
  impact: 'positive' | 'neutral' | 'negative';
  detail: string;
}

function getBuyerFactors(session: Session, snapshot?: MarketSnapshot): ContributingFactor[] {
  const inputs = session.buyer_inputs;
  if (!inputs) return [];
  const factors: ContributingFactor[] = [];

  // Market conditions
  const market = inputs.market_conditions || 'Balanced';
  factors.push({
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    label: 'Market Conditions',
    impact: market === 'Cool' ? 'positive' : market === 'Hot' ? 'negative' : 'neutral',
    detail: `${market} market`,
  });

  // Financing
  factors.push({
    icon: <DollarSign className="h-3.5 w-3.5" />,
    label: 'Financing Strength',
    impact: inputs.financing_type === 'Cash' ? 'positive' : inputs.down_payment_percent === '<10' ? 'negative' : 'neutral',
    detail: inputs.financing_type === 'Cash' ? 'Cash (strongest)' : `${inputs.financing_type}, ${inputs.down_payment_percent}% down`,
  });

  // Contingencies
  const contCount = inputs.contingencies.filter(c => c !== 'None').length;
  factors.push({
    icon: <Shield className="h-3.5 w-3.5" />,
    label: 'Contingencies',
    impact: contCount === 0 ? 'positive' : contCount >= 3 ? 'negative' : 'neutral',
    detail: contCount === 0 ? 'None (clean offer)' : `${contCount} contingenc${contCount > 1 ? 'ies' : 'y'}`,
  });

  // Closing timeline
  factors.push({
    icon: <Clock className="h-3.5 w-3.5" />,
    label: 'Closing Speed',
    impact: inputs.closing_timeline === '<21' ? 'positive' : inputs.closing_timeline === '45+' ? 'negative' : 'neutral',
    detail: `${inputs.closing_timeline} days`,
  });

  // Price ratio
  if (inputs.reference_price && inputs.reference_price > 0) {
    const ratio = inputs.offer_price / inputs.reference_price;
    factors.push({
      icon: <Home className="h-3.5 w-3.5" />,
      label: 'Price Position',
      impact: ratio >= 1.05 ? 'positive' : ratio < 0.95 ? 'negative' : 'neutral',
      detail: `${Math.round(ratio * 100)}% of reference price`,
    });
  }

  // Property intelligence factors
  if (session.property_factors && session.property_factors.length > 0) {
    const netWeight = session.property_factors.reduce((sum, f) => sum + f.weight, 0);
    const topFactor = session.property_factors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0];
    factors.push({
      icon: <Brain className="h-3.5 w-3.5" />,
      label: 'Property Intelligence',
      impact: netWeight > 0 ? 'positive' : netWeight < 0 ? 'negative' : 'neutral',
      detail: `${session.property_factors.length} factor${session.property_factors.length > 1 ? 's' : ''} (${topFactor.label})`,
    });
  }

  return factors;
}

function getSellerFactors(session: Session, snapshot?: MarketSnapshot): ContributingFactor[] {
  const inputs = session.seller_inputs;
  if (!inputs) return [];
  const factors: ContributingFactor[] = [];

  // Strategy
  factors.push({
    icon: <Target className="h-3.5 w-3.5" />,
    label: 'Strategy',
    impact: inputs.strategy_preference === 'Balanced' ? 'positive' : 'neutral',
    detail: inputs.strategy_preference,
  });

  // Timeframe
  factors.push({
    icon: <Clock className="h-3.5 w-3.5" />,
    label: 'Timeframe',
    impact: inputs.desired_timeframe === '90+' ? 'positive' : inputs.desired_timeframe === '30' ? 'negative' : 'neutral',
    detail: `${inputs.desired_timeframe} days`,
  });

  // Condition
  factors.push({
    icon: <Home className="h-3.5 w-3.5" />,
    label: 'Property Condition',
    impact: session.condition === 'Renovated' || session.condition === 'Updated' ? 'positive' : session.condition === 'Dated' ? 'negative' : 'neutral',
    detail: session.condition,
  });

  // Market context from snapshot
  if (snapshot) {
    const context = getMarketContext(snapshot);
    factors.push({
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      label: 'Market Conditions',
      impact: context.competitionContext === 'high' ? 'positive' : context.competitionContext === 'low' ? 'negative' : 'neutral',
      detail: `${context.competitionContext} competition`,
    });
  }

  // Property intelligence factors
  if (session.property_factors && session.property_factors.length > 0) {
    const netWeight = session.property_factors.reduce((sum, f) => sum + f.weight, 0);
    const topFactor = session.property_factors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0];
    factors.push({
      icon: <Brain className="h-3.5 w-3.5" />,
      label: 'Property Intelligence',
      impact: netWeight > 0 ? 'positive' : netWeight < 0 ? 'negative' : 'neutral',
      detail: `${session.property_factors.length} factor${session.property_factors.length > 1 ? 's' : ''} (${topFactor.label})`,
    });
  }

  return factors;
}

function ImpactDot({ impact }: { impact: 'positive' | 'neutral' | 'negative' }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${
      impact === 'positive' ? 'bg-emerald-500' : impact === 'negative' ? 'bg-destructive' : 'bg-muted-foreground/40'
    }`} />
  );
}

export function SuccessPrediction({ type, likelihood, session, snapshot }: SuccessPredictionProps) {
  const percent = bandToPercent(likelihood);
  const midpoint = Math.round((percent.min + percent.max) / 2);
  const gaugeColor = getGaugeColor(likelihood);
  const bgColor = getBgColor(likelihood);
  const factors = type === 'buyer' ? getBuyerFactors(session, snapshot) : getSellerFactors(session, snapshot);

  return (
    <Card className="pdf-section pdf-avoid-break overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-accent" />
          Success Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Gauge */}
        <div className="text-center">
          <p className={`text-4xl font-sans font-bold ${gaugeColor}`}>
            {percent.display}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {type === 'buyer' ? 'Estimated offer acceptance probability' : 'Estimated sale likelihood in desired timeframe'}
          </p>
          {/* Progress bar */}
          <div className="mt-3 mx-auto max-w-xs">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${bgColor} transition-all duration-500`}
                style={{ width: `${midpoint}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Contributing Factors */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Contributing Factors</p>
          <div className="grid gap-2">
            {factors.map((factor, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs p-2 rounded-lg bg-secondary/30">
                <ImpactDot impact={factor.impact} />
                <span className="text-muted-foreground">{factor.icon}</span>
                <span className="font-medium flex-1">{factor.label}</span>
                <span className="text-muted-foreground">{factor.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center italic">
          Probabilities are estimates based on market data and transaction structure. Actual outcomes may vary.
        </p>
      </CardContent>
    </Card>
  );
}
