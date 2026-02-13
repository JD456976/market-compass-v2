/**
 * Position Meter Components — Premium, executive-grade visual indicators
 * for Offer Position (buyer) and Seller Leverage (seller).
 * 
 * Follows visual discipline: clean gradients, professional typography, no gamification.
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
// Shared Premium Meter Component
// =============================================

interface MeterBarProps<T extends string> {
  levels: readonly T[];
  activeLevel: T;
  score: number;
  accentFrom?: string;
  accentTo?: string;
  className?: string;
}

function MeterBar<T extends string>({ levels, activeLevel, score, className }: MeterBarProps<T>) {
  const activeIndex = levels.indexOf(activeLevel);
  const segmentCount = levels.length;
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Score display */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-serif font-bold text-foreground">{Math.round(score)}</span>
        <span className="text-sm text-muted-foreground font-medium">/ 100</span>
        <span className="ml-auto text-sm font-semibold text-accent">{activeLevel}</span>
      </div>

      {/* Meter track */}
      <div className="relative">
        <div className="flex gap-[2px] h-2.5 rounded-full overflow-hidden bg-secondary/50">
          {levels.map((level, i) => {
            const isActive = i <= activeIndex;
            // Generate gradient intensity based on position
            const opacity = isActive ? 0.5 + (i / segmentCount) * 0.5 : 0;
            return (
              <div
                key={level}
                className={cn(
                  'flex-1 transition-all duration-500 ease-out rounded-sm',
                  !isActive && 'bg-secondary'
                )}
                style={isActive ? {
                  background: `hsl(var(--accent) / ${opacity})`,
                } : undefined}
              />
            );
          })}
        </div>
        {/* Position dot */}
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-accent border-[2.5px] border-background shadow-md transition-all duration-700 ease-out"
          style={{
            left: `${Math.max(3, Math.min(97, score))}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Level labels */}
      <div className="flex justify-between px-0.5">
        {levels.map((level) => (
          <span
            key={level}
            className={cn(
              'text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors font-medium',
              level === activeLevel
                ? 'text-accent font-semibold'
                : 'text-muted-foreground/60'
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
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      {/* Top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Gauge className="h-4 w-4 text-accent" />
          </div>
          Offer Position
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <MeterBar
          levels={OFFER_POSITION_LEVELS}
          activeLevel={result.level}
          score={result.score}
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Represents relative competitiveness in this market based on offer price, financing, contingencies, timeline, and market conditions.
        </p>
        {/* Key factors */}
        {result.factors.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Contributing Factors</p>
            <div className="space-y-1">
              {result.factors.slice(0, 4).map((factor, i) => (
                <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-accent/60 shrink-0" />
                  {factor}
                </p>
              ))}
            </div>
          </div>
        )}
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
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      {/* Top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Scale className="h-4 w-4 text-accent" />
          </div>
          Seller Leverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <MeterBar
          levels={SELLER_LEVERAGE_LEVELS}
          activeLevel={result.level}
          score={result.score}
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Represents negotiating power based on market velocity, pricing trends, inventory conditions, and property attributes.
        </p>
        {/* Key factors */}
        {result.factors.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Contributing Factors</p>
            <div className="space-y-1">
              {result.factors.slice(0, 4).map((factor, i) => (
                <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-accent/60 shrink-0" />
                  {factor}
                </p>
              ))}
            </div>
          </div>
        )}
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
    <Card className={cn('pdf-section pdf-avoid-break border-accent/15 bg-gradient-to-br from-accent/4 to-transparent', className)}>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium text-foreground/80">
          Strategy Insights Based on Current Position
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ul className="space-y-1.5">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-accent shrink-0" />
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
