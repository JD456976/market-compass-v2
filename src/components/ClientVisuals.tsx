import { LikelihoodBand, BuyerPreference, StrategyPreference } from '@/types';
import { Clock, Target, Scale, Zap } from 'lucide-react';

interface LikelihoodBarProps {
  band: LikelihoodBand;
  showLabels?: boolean;
}

export function LikelihoodBar({ band, showLabels = true }: LikelihoodBarProps) {
  const segments = [
    { key: 'Low', label: 'Low' },
    { key: 'Moderate', label: 'Moderate' },
    { key: 'High', label: 'High' },
  ];
  
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative flex h-2 rounded-full overflow-hidden bg-muted">
        {segments.map((seg, i) => {
          const isActive = seg.key === band;
          return (
            <div
              key={seg.key}
              className={`flex-1 transition-colors ${
                isActive 
                  ? band === 'High' 
                    ? 'bg-emerald-600/80' 
                    : band === 'Moderate' 
                    ? 'bg-amber-500/80' 
                    : 'bg-slate-400/80'
                  : 'bg-muted'
              } ${i < segments.length - 1 ? 'border-r border-background' : ''}`}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-between mt-1.5">
          {segments.map((seg) => (
            <span 
              key={seg.key}
              className={`text-[10px] ${
                seg.key === band 
                  ? 'text-foreground font-medium' 
                  : 'text-muted-foreground/60'
              }`}
            >
              {seg.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface TradeoffPosition {
  x: number; // 0-100, left to right (Speed to Price / Certainty to Flexibility)
  y: number; // 0-100, bottom to top
}

interface TradeoffMatrixProps {
  positions: {
    label?: string;
    position: TradeoffPosition;
    variant?: 'primary' | 'secondary';
  }[];
  xAxis?: { left: string; right: string };
  yAxis?: { top: string; bottom: string };
}

export function TradeoffMatrix({ 
  positions,
  xAxis = { left: 'Speed', right: 'Price' },
  yAxis = { top: 'Certainty', bottom: 'Flexibility' },
}: TradeoffMatrixProps) {
  return (
    <div className="w-full max-w-[200px] mx-auto">
      <div className="relative aspect-square border border-border/60 rounded-lg bg-muted/30">
        {/* Grid lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-px bg-border/40" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-px bg-border/40" />
        </div>
        
        {/* Position dots */}
        {positions.map((pos, i) => (
          <div
            key={i}
            className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all ${
              pos.variant === 'secondary' 
                ? 'bg-muted-foreground/60 ring-2 ring-muted-foreground/20' 
                : 'bg-accent ring-2 ring-accent/30'
            }`}
            style={{
              left: `${pos.position.x}%`,
              top: `${100 - pos.position.y}%`,
            }}
          >
            {pos.label && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-medium whitespace-nowrap text-muted-foreground">
                {pos.label}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Axis labels */}
      <div className="flex justify-between mt-1.5 px-1">
        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
          <Zap className="h-2.5 w-2.5" />
          {xAxis.left}
        </span>
        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
          <Target className="h-2.5 w-2.5" />
          {xAxis.right}
        </span>
      </div>
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 origin-center hidden">
        <span className="text-[9px] text-muted-foreground">{yAxis.top}</span>
      </div>
    </div>
  );
}

// Helper to calculate tradeoff position based on session data
export function getBuyerTradeoffPosition(
  preference: BuyerPreference,
  contingencyCount: number,
  financingType: string,
  closingTimeline: string
): TradeoffPosition {
  // X axis: Speed (left) to Price (right)
  // Y axis: Flexibility (bottom) to Certainty (top)
  
  let x = 50;
  let y = 50;
  
  // Preference affects primary position
  if (preference === 'Must win') {
    x = 25; // Prioritizes speed
    y = 70; // Higher certainty of winning
  } else if (preference === 'Price-protective') {
    x = 75; // Prioritizes price
    y = 40; // More flexible on outcome
  } else {
    x = 50;
    y = 55;
  }
  
  // Contingencies affect flexibility
  if (contingencyCount >= 3) {
    y = Math.max(20, y - 20); // More flexibility needed
  } else if (contingencyCount === 0) {
    y = Math.min(85, y + 15); // Higher certainty
  }
  
  // Cash offers shift toward certainty and speed
  if (financingType === 'Cash') {
    x = Math.max(15, x - 10);
    y = Math.min(90, y + 15);
  }
  
  // Fast close shifts toward speed
  if (closingTimeline === '<21' || closingTimeline === '21-30') {
    x = Math.max(15, x - 10);
  }
  
  return { x, y };
}

export function getSellerTradeoffPosition(
  strategy: StrategyPreference,
  timeframe: string
): TradeoffPosition {
  let x = 50;
  let y = 50;
  
  if (strategy === 'Prioritize speed') {
    x = 25;
    y = 65;
  } else if (strategy === 'Maximize price') {
    x = 75;
    y = 45;
  } else {
    x = 50;
    y = 55;
  }
  
  // Shorter timeframe increases urgency (speed)
  if (timeframe === '30') {
    x = Math.max(15, x - 10);
    y = Math.min(80, y + 10);
  } else if (timeframe === '90+') {
    x = Math.min(85, x + 10);
    y = Math.max(30, y - 10);
  }
  
  return { x, y };
}

// Client-friendly icons for key metrics
interface MetricIconProps {
  type: 'timeline' | 'certainty' | 'tradeoff' | 'pricing';
  className?: string;
}

export function MetricIcon({ type, className = "h-4 w-4" }: MetricIconProps) {
  switch (type) {
    case 'timeline':
      return <Clock className={`${className} text-muted-foreground`} />;
    case 'certainty':
      return <Target className={`${className} text-muted-foreground`} />;
    case 'tradeoff':
      return <Scale className={`${className} text-muted-foreground`} />;
    case 'pricing':
      return <Zap className={`${className} text-muted-foreground`} />;
    default:
      return null;
  }
}
