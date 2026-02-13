/**
 * "What Would Happen If You Wait?" Simulator Card
 * Shows 30/60/90-day wait risk projections.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown, Minus, Home, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WaitScenario, RiskLevel } from '@/lib/waitSimulator';

interface WaitSimulatorCardProps {
  scenarios: WaitScenario[];
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
  if (direction === 'up') return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
  if (direction === 'down') return <TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function WaitSimulatorCard({ scenarios, className }: WaitSimulatorCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = scenarios[activeIndex];

  if (!active) return null;

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <div className="h-0.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          What If You Wait?
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-1">
          Pattern-based estimates if you delay your offer
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {/* Period selector */}
        <div className="flex gap-2">
          {scenarios.map((s, i) => (
            <button
              key={s.days}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                i === activeIndex
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Risk grid */}
        <div className="grid gap-3">
          {/* Property Loss Risk */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Losing Property</span>
            </div>
            <RiskBadge level={active.propertyLossRisk} />
          </div>

          {/* Price Movement */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <TrendIcon direction={active.priceMovement.direction} />
              <span className="text-sm">Price Movement</span>
            </div>
            <span className="text-xs text-muted-foreground max-w-[180px] text-right">
              {active.priceMovement.magnitude}
            </span>
          </div>

          {/* Market Trend Risk */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Market Trend Risk</span>
            </div>
            <RiskBadge level={active.marketTrendRisk} />
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
