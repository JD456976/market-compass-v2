/**
 * Seller Motivation Indicator Card — inferred leverage signals.
 * Buyer side: seller motivation profile.
 * Seller side: buyer motivation assessment.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BuyerInputs, SellerInputs, LikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { inferSellerMotivation, inferBuyerMotivation, MotivationSignal } from '@/lib/sellerMotivation';

function SignalRow({ signal }: { signal: MotivationSignal }) {
  const Icon = signal.indicator === 'positive' ? TrendingUp : signal.indicator === 'negative' ? TrendingDown : Minus;
  const color = signal.indicator === 'positive' 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : signal.indicator === 'negative' 
    ? 'text-destructive' 
    : 'text-muted-foreground';

  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', color)} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{signal.label}</p>
        <p className="text-xs text-muted-foreground">{signal.detail}</p>
      </div>
    </div>
  );
}

const MOTIVATION_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  'Hot Listing': 'destructive',
  'Neutral': 'outline',
  'Motivated': 'success',
  'Stale': 'success',
  'Urgent': 'success',
  'Active': 'warning',
  'Patient': 'outline',
  'Window Shopping': 'destructive',
};

// ── Buyer Side: Seller Leverage Profile ──
interface SellerMotivationCardProps {
  inputs: BuyerInputs;
  snapshot?: MarketSnapshot;
  className?: string;
}

export function SellerMotivationCard({ inputs, snapshot, className }: SellerMotivationCardProps) {
  const result = useMemo(() => inferSellerMotivation(inputs, snapshot), [inputs, snapshot]);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-accent" />
          Seller Leverage Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Seller Motivation</span>
          <Badge variant={MOTIVATION_BADGE[result.level] || 'outline'} className="text-sm">
            {result.level}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>

        <div className="space-y-1 divide-y divide-border/50">
          {result.signals.map((signal, i) => (
            <SignalRow key={i} signal={signal} />
          ))}
        </div>

        <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-xs font-medium text-foreground mb-1">Strategy Implication</p>
          <p className="text-xs text-muted-foreground">{result.leverageAdvice}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Seller Side: Buyer Motivation Assessment ──
interface BuyerMotivationCardProps {
  inputs: SellerInputs;
  likelihood30: LikelihoodBand;
  snapshot?: MarketSnapshot;
  className?: string;
}

export function BuyerMotivationCard({ inputs, likelihood30, snapshot, className }: BuyerMotivationCardProps) {
  const result = useMemo(() => inferBuyerMotivation(inputs, likelihood30, snapshot), [inputs, likelihood30, snapshot]);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-accent" />
          Buyer Motivation Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Buyer Activity Level</span>
          <Badge variant={MOTIVATION_BADGE[result.level] || 'outline'} className="text-sm">
            {result.level}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>

        <div className="space-y-1 divide-y divide-border/50">
          {result.signals.map((signal, i) => (
            <SignalRow key={i} signal={signal} />
          ))}
        </div>

        <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-xs font-medium text-foreground mb-1">Strategy Implication</p>
          <p className="text-xs text-muted-foreground">{result.leverageAdvice}</p>
        </div>
      </CardContent>
    </Card>
  );
}
