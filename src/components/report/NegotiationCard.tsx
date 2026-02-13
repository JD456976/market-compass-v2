/**
 * Negotiation Pathway Planner Card — chess engine for real estate offers.
 * Works for both buyer (counter rejection) and seller (counter-offer strategy) reports.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, ArrowUp, Sliders, Clock, DoorOpen, Shield, 
  HandCoins, ChevronDown, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BuyerInputs, SellerInputs, ExtendedLikelihoodBand, LikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { planBuyerNegotiation, planSellerNegotiation, NegotiationMove, MovePriority } from '@/lib/negotiationPathway';

const MOVE_ICONS: Record<string, React.ElementType> = {
  'increase-price': ArrowUp,
  'adjust-terms': Sliders,
  'wait': Clock,
  'walk-away': DoorOpen,
  'hold-firm': Shield,
  'counter': HandCoins,
  'accept-best': Target,
  'reduce-price': ChevronDown,
};

const PRIORITY_STYLES: Record<MovePriority, string> = {
  primary: 'border-accent/30 bg-accent/5',
  secondary: 'border-border/50 bg-secondary/30',
  fallback: 'border-border/30 bg-muted/30',
};

const PRIORITY_LABELS: Record<MovePriority, string> = {
  primary: 'Recommended',
  secondary: 'Alternative',
  fallback: 'If needed',
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-accent',
  high: 'text-destructive',
};

function MoveCard({ move }: { move: NegotiationMove }) {
  const Icon = MOVE_ICONS[move.type] || Target;
  
  return (
    <div className={cn('p-3 rounded-lg border', PRIORITY_STYLES[move.priority])}>
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-medium">{move.label}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {PRIORITY_LABELS[move.priority]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1.5">{move.description}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Impact: <span className="text-foreground">{move.impact}</span></span>
            <span className={cn('font-medium', RISK_COLORS[move.riskLevel])}>
              {move.riskLevel.charAt(0).toUpperCase() + move.riskLevel.slice(1)} risk
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const STRENGTH_BADGE: Record<string, 'success' | 'warning' | 'destructive'> = {
  'Strong': 'success',
  'Balanced': 'warning',
  'Weak': 'destructive',
};

// ── Buyer Side ──
interface BuyerNegotiationCardProps {
  inputs: BuyerInputs;
  acceptance: ExtendedLikelihoodBand;
  riskOfLosing: ExtendedLikelihoodBand;
  snapshot?: MarketSnapshot;
  className?: string;
}

export function BuyerNegotiationCard({ inputs, acceptance, riskOfLosing, snapshot, className }: BuyerNegotiationCardProps) {
  const result = useMemo(() => planBuyerNegotiation(inputs, acceptance, riskOfLosing, snapshot), [inputs, acceptance, riskOfLosing, snapshot]);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-accent" />
          Negotiation Pathway
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Position Strength</span>
          <Badge variant={STRENGTH_BADGE[result.positionStrength]} className="text-sm">
            {result.positionStrength}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{result.overallStrategy}</p>

        <div className="space-y-2">
          {result.moves.map((move, i) => (
            <MoveCard key={i} move={move} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Seller Side ──
interface SellerNegotiationCardProps {
  inputs: SellerInputs;
  likelihood30: LikelihoodBand;
  snapshot?: MarketSnapshot;
  className?: string;
}

export function SellerNegotiationCard({ inputs, likelihood30, snapshot, className }: SellerNegotiationCardProps) {
  const result = useMemo(() => planSellerNegotiation(inputs, likelihood30, snapshot), [inputs, likelihood30, snapshot]);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-accent" />
          Counter-Offer Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Position Strength</span>
          <Badge variant={STRENGTH_BADGE[result.positionStrength]} className="text-sm">
            {result.positionStrength}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{result.overallStrategy}</p>

        <div className="space-y-2">
          {result.moves.map((move, i) => (
            <MoveCard key={i} move={move} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
