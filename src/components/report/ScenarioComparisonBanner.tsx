/**
 * Scenario Comparison Banner — displays delta when user ran What-If simulations.
 * Shows changes in acceptance likelihood, risk, and overpay relative to original.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, Minus, GitCompareArrows, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExtendedLikelihoodBand, LikelihoodBand } from '@/types';

const BAND_VALUES: Record<string, number> = {
  'Very Low': 1,
  'Low': 2,
  'Moderate': 3,
  'High': 4,
  'Very High': 5,
};

function bandDelta(original: string, current: string): number {
  return (BAND_VALUES[current] || 3) - (BAND_VALUES[original] || 3);
}

interface ScenarioComparisonBannerProps {
  original: {
    acceptance: ExtendedLikelihoodBand | LikelihoodBand;
    riskOfLosing?: ExtendedLikelihoodBand;
    riskOfOverpaying?: ExtendedLikelihoodBand;
  };
  current: {
    acceptance: ExtendedLikelihoodBand | LikelihoodBand;
    riskOfLosing?: ExtendedLikelihoodBand;
    riskOfOverpaying?: ExtendedLikelihoodBand;
  };
  isModified: boolean;
  labels?: { riskOfLosing?: string; riskOfOverpaying?: string };
  onReset?: () => void;
  className?: string;
}

function DeltaIndicator({ label, delta, invertColor }: { label: string; delta: number; invertColor?: boolean }) {
  const isPositive = invertColor ? delta < 0 : delta > 0;
  const isNegative = invertColor ? delta > 0 : delta < 0;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className={cn(
        'flex items-center gap-0.5 font-medium text-xs px-2 py-0.5 rounded-full',
        delta === 0 && 'text-muted-foreground bg-muted',
        isPositive && 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
        isNegative && 'text-rose-700 dark:text-rose-400 bg-rose-500/10',
      )}>
        {delta > 0 && <ArrowUpRight className="h-3 w-3" />}
        {delta < 0 && <ArrowDownRight className="h-3 w-3" />}
        {delta === 0 && <Minus className="h-3 w-3" />}
        {delta === 0 ? 'No change' : `${Math.abs(delta)} tier${Math.abs(delta) > 1 ? 's' : ''}`}
      </div>
    </div>
  );
}

export function ScenarioComparisonBanner({ original, current, isModified, labels, onReset, className }: ScenarioComparisonBannerProps) {
  if (!isModified) return null;

  const acceptanceDelta = bandDelta(original.acceptance, current.acceptance);
  const losingDelta = original.riskOfLosing && current.riskOfLosing
    ? bandDelta(original.riskOfLosing, current.riskOfLosing)
    : null;
  const overpayDelta = original.riskOfOverpaying && current.riskOfOverpaying
    ? bandDelta(original.riskOfOverpaying, current.riskOfOverpaying)
    : null;

  return (
    <Card className={cn('pdf-section pdf-avoid-break border-accent/30 bg-gradient-to-r from-accent/5 to-transparent', className)}>
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-2 mb-3">
          <GitCompareArrows className="h-4 w-4 text-accent" />
          <p className="text-sm font-medium text-foreground">Compared to Original Scenario</p>
          <div className="flex items-center gap-2 ml-auto">
            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
            <Badge variant="accent" className="text-[10px]">Modified</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <DeltaIndicator label="Acceptance" delta={acceptanceDelta} />
          {losingDelta !== null && (
            <DeltaIndicator label={labels?.riskOfLosing || "Risk of Losing"} delta={losingDelta} invertColor />
          )}
          {overpayDelta !== null && (
            <DeltaIndicator label={labels?.riskOfOverpaying || "Overpay Risk"} delta={overpayDelta} invertColor />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
