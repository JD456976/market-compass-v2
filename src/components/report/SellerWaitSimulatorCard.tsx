/**
 * Seller "What If You Wait?" Simulator Card
 * Interactive slider version for seller reports.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Clock, TrendingUp, TrendingDown, Minus, BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SellerWaitScenario, RiskLevel, simulateSellerWaiting } from '@/lib/sellerWaitSimulator';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { LikelihoodBand } from '@/types';

interface SellerWaitSimulatorCardProps {
  likelihood30: LikelihoodBand;
  snapshot?: MarketSnapshot | null;
  className?: string;
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config: Record<RiskLevel, { variant: 'success' | 'warning' | 'destructive' | 'outline' }> = {
    'Very Low': { variant: 'success' },
    'Low': { variant: 'success' },
    'Moderate': { variant: 'warning' },
    'High': { variant: 'destructive' },
    'Very High': { variant: 'destructive' },
  };
  return <Badge variant={config[level].variant} className="text-[10px] px-2 py-0.5">{level}</Badge>;
}

function TrendIcon({ direction }: { direction: 'up' | 'flat' | 'down' }) {
  if (direction === 'up') return <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
  if (direction === 'down') return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function interpolateScenario(scenarios: SellerWaitScenario[], days: number): SellerWaitScenario {
  if (days <= 30) return { ...scenarios[0], days, label: `${days} Days` };
  if (days >= 90) return { ...scenarios[2], days, label: `${days} Days` };
  
  // Interpolate between scenarios
  const idx = days <= 60 ? 0 : 1;
  const next = idx + 1;
  const t = (days - scenarios[idx].days) / (scenarios[next].days - scenarios[idx].days);
  
  // Use the closer scenario's risk levels
  const closer = t < 0.5 ? scenarios[idx] : scenarios[next];
  
  return {
    days,
    label: `${days} Days`,
    marketShiftRisk: closer.marketShiftRisk,
    priceMovement: closer.priceMovement,
    competitionRisk: closer.competitionRisk,
    summary: closer.summary,
  };
}

export function SellerWaitSimulatorCard({ likelihood30, snapshot, className }: SellerWaitSimulatorCardProps) {
  const [days, setDays] = useState(30);
  const baseScenarios = simulateSellerWaiting(likelihood30, snapshot);
  const active = interpolateScenario(baseScenarios, days);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <div className="h-0.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          What If You Wait to List?
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-1">
          Pattern-based estimates if you delay listing
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {/* Interactive slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Delay period</span>
            <span className="text-sm font-semibold text-foreground">{days} days</span>
          </div>
          <Slider
            value={[days]}
            onValueChange={([v]) => setDays(v)}
            min={7}
            max={120}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1 week</span>
            <span>4 months</span>
          </div>
        </div>

        {/* Risk grid */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Market Shift Risk</span>
            </div>
            <RiskBadge level={active.marketShiftRisk} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <TrendIcon direction={active.priceMovement.direction} />
              <span className="text-sm">Price Movement</span>
            </div>
            <span className="text-xs text-muted-foreground max-w-[180px] text-right">
              {active.priceMovement.magnitude}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Competition Risk</span>
            </div>
            <RiskBadge level={active.competitionRisk} />
          </div>
        </div>

        {/* Summary */}
        <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">
          {active.summary}
        </p>

        <p className="text-[10px] text-muted-foreground italic">
          Based on market patterns, not predictions. Actual outcomes may vary.
        </p>
      </CardContent>
    </Card>
  );
}
