/**
 * Seller Pricing Regret Risk Meter
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SellerRegretRiskResult, SELLER_REGRET_RISK_LEVELS } from '@/lib/sellerRegretRiskScoring';

interface SellerRegretRiskMeterProps {
  result: SellerRegretRiskResult;
  className?: string;
}

export function SellerRegretRiskMeter({ result, className }: SellerRegretRiskMeterProps) {
  const activeIndex = SELLER_REGRET_RISK_LEVELS.indexOf(result.level);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <div className="h-0.5 bg-gradient-to-r from-destructive/40 via-destructive/80 to-destructive/40" />
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div className="p-1.5 rounded-lg bg-destructive/10">
            <DollarSign className="h-4 w-4 text-destructive" />
          </div>
          Pricing Regret Risk
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-1">
          How likely you may second-guess this list price later
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {/* Score */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-sans font-bold text-foreground">{Math.round(result.score)}</span>
          <span className="text-sm text-muted-foreground font-medium">/ 100</span>
          <span className={cn(
            'ml-auto text-sm font-semibold',
            activeIndex >= 3 ? 'text-destructive' : activeIndex >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          )}>
            {result.level}
          </span>
        </div>

        {/* Meter track */}
        <div className="relative">
          <div className="flex gap-[2px] h-2.5 rounded-full overflow-hidden bg-secondary/50">
            {SELLER_REGRET_RISK_LEVELS.map((level, i) => {
              const isActive = i <= activeIndex;
              const hue = isActive
                ? i <= 1 ? 'hsl(var(--accent))' : i <= 2 ? 'hsl(40 90% 55%)' : 'hsl(var(--destructive))'
                : undefined;
              return (
                <div
                  key={level}
                  className={cn(
                    'flex-1 transition-all duration-500 ease-out rounded-sm',
                    !isActive && 'bg-secondary'
                  )}
                  style={isActive ? { background: hue, opacity: 0.5 + (i / 5) * 0.5 } : undefined}
                />
              );
            })}
          </div>
          <div
            className={cn(
              'absolute top-1/2 w-4 h-4 rounded-full border-[2.5px] border-background shadow-md transition-all duration-700 ease-out',
              activeIndex >= 3 ? 'bg-destructive' : activeIndex >= 2 ? 'bg-amber-500' : 'bg-accent'
            )}
            style={{
              left: `${Math.max(3, Math.min(97, result.score))}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>

        {/* Level labels */}
        <div className="flex justify-between px-0.5">
          {SELLER_REGRET_RISK_LEVELS.map((level) => (
            <span
              key={level}
              className={cn(
                'text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors font-medium',
                level === result.level ? 'text-foreground font-semibold' : 'text-muted-foreground/60'
              )}
            >
              {level}
            </span>
          ))}
        </div>

        {/* Factors */}
        {result.factors.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Contributing Factors</p>
            <div className="space-y-1">
              {result.factors.slice(0, 4).map((factor, i) => (
                <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-destructive/60 shrink-0" />
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
