/**
 * Improvement Panel — "What Would Improve This Offer/Listing"
 * Shows actionable (neutral language) suggestions with expected impact.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ArrowUpRight, ArrowRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BuyerInputs, SellerInputs, Session } from '@/types';

type ImpactLevel = 'high' | 'medium' | 'low';

interface Improvement {
  suggestion: string;
  impact: ImpactLevel;
}

const impactConfig: Record<ImpactLevel, { label: string; icon: typeof ArrowUpRight; className: string }> = {
  high: { label: 'High Impact', icon: ArrowUpRight, className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  medium: { label: 'Moderate', icon: ArrowRight, className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  low: { label: 'Minor', icon: Minus, className: 'text-muted-foreground bg-muted' },
};

function getBuyerImprovements(inputs: BuyerInputs): Improvement[] {
  const improvements: Improvement[] = [];

  // Price improvement
  const refPrice = inputs.reference_price || inputs.offer_price;
  const ratio = refPrice > 0 ? inputs.offer_price / refPrice : 1;
  if (ratio < 1.05) {
    improvements.push({
      suggestion: 'Increasing offer price relative to comparable value may increase competitiveness',
      impact: 'high',
    });
  }

  // Contingency reduction
  const contingencies = inputs.contingencies.filter(c => c !== 'None');
  if (contingencies.length >= 2) {
    improvements.push({
      suggestion: 'Reducing contingencies is often associated with stronger offer perception',
      impact: 'high',
    });
  } else if (contingencies.length === 1) {
    improvements.push({
      suggestion: 'Waiving remaining contingency may increase appeal, subject to risk tolerance',
      impact: 'medium',
    });
  }

  // Timeline
  if (inputs.closing_timeline === '45+') {
    improvements.push({
      suggestion: 'Shortening closing timeline can signal readiness and increase seller appeal',
      impact: 'medium',
    });
  } else if (inputs.closing_timeline === '31-45') {
    improvements.push({
      suggestion: 'A faster closing timeline (under 30 days) may strengthen the offer',
      impact: 'low',
    });
  }

  // Financing
  if (inputs.financing_type !== 'Cash') {
    if (inputs.down_payment_percent === '<10') {
      improvements.push({
        suggestion: 'A larger down payment may signal financial strength to sellers',
        impact: 'medium',
      });
    }
    if (inputs.financing_type === 'FHA' || inputs.financing_type === 'VA') {
      improvements.push({
        suggestion: 'Conventional or cash financing is sometimes perceived more favorably',
        impact: 'low',
      });
    }
  }

  return improvements;
}

function getSellerImprovements(inputs: SellerInputs, session: Session): Improvement[] {
  const improvements: Improvement[] = [];

  if (inputs.strategy_preference === 'Maximize price') {
    improvements.push({
      suggestion: 'Adjusting strategy toward balanced approach may increase showing activity',
      impact: 'medium',
    });
  }

  if (inputs.desired_timeframe === '30') {
    improvements.push({
      suggestion: 'Extending desired timeframe may allow more market exposure',
      impact: 'medium',
    });
  }

  if (session.condition === 'Dated') {
    improvements.push({
      suggestion: 'Property updates or staging are often associated with stronger market position',
      impact: 'high',
    });
  }

  // Price positioning
  improvements.push({
    suggestion: 'Strategic pricing relative to recent comparable activity can influence buyer interest',
    impact: 'high',
  });

  return improvements;
}

interface ImprovementPanelProps {
  type: 'buyer' | 'seller';
  session: Session;
  className?: string;
}

export function ImprovementPanel({ type, session, className }: ImprovementPanelProps) {
  const improvements = type === 'buyer' && session.buyer_inputs
    ? getBuyerImprovements(session.buyer_inputs)
    : type === 'seller' && session.seller_inputs
    ? getSellerImprovements(session.seller_inputs, session)
    : [];

  if (improvements.length === 0) return null;

  return (
    <Card className={cn('pdf-section pdf-avoid-break', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-accent" />
          What May Strengthen This {type === 'buyer' ? 'Offer' : 'Listing'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {improvements.map((imp, i) => {
            const config = impactConfig[imp.impact];
            const ImpactIcon = config.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                <div className={cn('p-1 rounded shrink-0', config.className)}>
                  <ImpactIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{imp.suggestion}</p>
                  <span className={cn('text-[10px] font-medium mt-0.5 inline-block', config.className, 'bg-transparent')}>
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 italic">
          Impact levels are relative estimates based on market patterns, not guarantees.
        </p>
      </CardContent>
    </Card>
  );
}
