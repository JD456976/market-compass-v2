/**
 * Position Meter Components – Clean, professional visual indicators
 * for Offer Position (buyer) and Seller Leverage (seller).
 * 
 * Follows visual discipline: no gamified elements, no gauges, no animated meters.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OfferPositionLevel,
  SellerLeverageLevel,
  OfferPositionResult,
  SellerLeverageResult,
  StrategyInsight,
  OFFER_POSITION_LEVELS,
  SELLER_LEVERAGE_LEVELS,
  getBuyerStrategyInsights,
  getSellerStrategyInsights,
} from '@/lib/positionScoring';

// =============================================
// Shared Meter Bar Component
// =============================================

interface MeterBarProps<T extends string> {
  levels: readonly T[];
  activeLevel: T;
  score: number;
  className?: string;
}

function MeterBar<T extends string>({ levels, activeLevel, score, className }: MeterBarProps<T>) {
  const activeIndex = levels.indexOf(activeLevel);
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Meter track */}
      <div className="relative">
        <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
          {levels.map((level, i) => (
            <div
              key={level}
              className={cn(
                'flex-1 transition-colors duration-300',
                i <= activeIndex
                  ? 'bg-primary/80'
                  : 'bg-secondary'
              )}
            />
          ))}
        </div>
        {/* Position indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-5 rounded-sm bg-accent border-2 border-background shadow-sm transition-all duration-500"
          style={{ left: `${Math.max(2, Math.min(98, score))}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      {/* Level labels */}
      <div className="flex justify-between">
        {levels.map((level) => (
          <span
            key={level}
            className={cn(
              'text-[10px] sm:text-xs transition-colors',
              level === activeLevel
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground'
            )}
          >
            {level}
          </span>
        ))}
      </div>
    </div>
  );
}

// =============================================
// Offer Position Meter (Buyer Reports)
// =============================================

interface OfferPositionMeterProps {
  result: OfferPositionResult;
  className?: string;
}

export function OfferPositionMeter({ result, className }: OfferPositionMeterProps) {
  return (
    <Card className={cn('pdf-section pdf-avoid-break', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="h-5 w-5 text-accent" />
          Offer Position
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MeterBar
          levels={OFFER_POSITION_LEVELS}
          activeLevel={result.level}
          score={result.score}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Represents relative competitiveness in this market based on offer price, financing, contingencies, timeline, and market conditions.
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================
// Seller Leverage Meter (Seller Reports)
// =============================================

interface SellerLeverageMeterProps {
  result: SellerLeverageResult;
  className?: string;
}

export function SellerLeverageMeter({ result, className }: SellerLeverageMeterProps) {
  return (
    <Card className={cn('pdf-section pdf-avoid-break', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-accent" />
          Seller Leverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MeterBar
          levels={SELLER_LEVERAGE_LEVELS}
          activeLevel={result.level}
          score={result.score}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Represents negotiating power based on market velocity, pricing trends, inventory conditions, and property attributes.
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================
// Strategy Insights Module
// =============================================

interface StrategyInsightsProps {
  insights: StrategyInsight[];
  className?: string;
}

export function StrategyInsightsCard({ insights, className }: StrategyInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <Card className={cn('pdf-section pdf-avoid-break border-accent/20 bg-gradient-to-br from-accent/5 to-transparent', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Strategy Insights Based on Current Position
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              {insight.text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// Re-export helpers for convenience
export { getBuyerStrategyInsights, getSellerStrategyInsights };
