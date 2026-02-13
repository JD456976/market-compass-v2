/**
 * Offer Timing Advantage Card — timing signals for offers and listings.
 * Works for both buyer and seller reports.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BuyerInputs, SellerInputs, LikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { analyzeBuyerTiming, analyzeSellerTiming, TimingSignal } from '@/lib/offerTiming';

function TimingSignalRow({ signal }: { signal: TimingSignal }) {
  const Icon = signal.strength === 'positive' ? CheckCircle2 : signal.strength === 'negative' ? XCircle : MinusCircle;
  const color = signal.strength === 'positive' 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : signal.strength === 'negative' 
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

const TIMING_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  'Optimal': 'success',
  'Good': 'success',
  'Neutral': 'warning',
  'Weak': 'destructive',
};

// ── Buyer Side ──
interface BuyerTimingCardProps {
  inputs: BuyerInputs;
  snapshot?: MarketSnapshot;
  className?: string;
}

export function BuyerTimingCard({ inputs, snapshot, className }: BuyerTimingCardProps) {
  const result = useMemo(() => analyzeBuyerTiming(inputs, snapshot), [inputs, snapshot]);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5 text-accent" />
          Offer Timing Advantage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Timing Strength</span>
          <Badge variant={TIMING_BADGE[result.overall] || 'outline'} className="text-sm">
            {result.overall}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>

        <div className="space-y-1 divide-y divide-border/50">
          {result.signals.map((signal, i) => (
            <TimingSignalRow key={i} signal={signal} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Seller Side ──
interface SellerTimingCardProps {
  inputs: SellerInputs;
  likelihood30: LikelihoodBand;
  snapshot?: MarketSnapshot;
  className?: string;
}

export function SellerTimingCard({ inputs, likelihood30, snapshot, className }: SellerTimingCardProps) {
  const result = useMemo(() => analyzeSellerTiming(inputs, likelihood30, snapshot), [inputs, likelihood30, snapshot]);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5 text-accent" />
          Listing Timing Advantage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Timing Strength</span>
          <Badge variant={TIMING_BADGE[result.overall] || 'outline'} className="text-sm">
            {result.overall}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>

        <div className="space-y-1 divide-y divide-border/50">
          {result.signals.map((signal, i) => (
            <TimingSignalRow key={i} signal={signal} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
