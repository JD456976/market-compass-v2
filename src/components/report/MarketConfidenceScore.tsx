import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { Session } from '@/types';

interface MarketConfidenceScoreProps {
  snapshot: MarketSnapshot;
  isGenericBaseline: boolean;
  session: Session;
  className?: string;
}

interface ConfidenceFactor {
  label: string;
  met: boolean;
  detail: string;
}

function getConfidenceFactors(
  snapshot: MarketSnapshot,
  isGenericBaseline: boolean,
  session: Session
): ConfidenceFactor[] {
  const factors: ConfidenceFactor[] = [];

  // Data freshness
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(snapshot.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
  );
  factors.push({
    label: 'Data freshness',
    met: daysSinceUpdate <= 90,
    detail: daysSinceUpdate <= 90 
      ? `Updated ${daysSinceUpdate} days ago` 
      : `Data is ${daysSinceUpdate} days old`,
  });

  // Location-specific data
  factors.push({
    label: 'Location-specific data',
    met: !isGenericBaseline,
    detail: isGenericBaseline 
      ? 'Using generic baseline' 
      : `Data specific to ${snapshot.location}`,
  });

  // Market activity (DOM as proxy)
  const hasActiveMarket = snapshot.medianDOM <= 45;
  factors.push({
    label: 'Active market data',
    met: hasActiveMarket,
    detail: hasActiveMarket 
      ? `Active market (${snapshot.medianDOM}d median DOM)` 
      : `Slower market activity (${snapshot.medianDOM}d median DOM)`,
  });

  // Reference price available (buyer)
  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    const hasRef = !!session.buyer_inputs.reference_price && session.buyer_inputs.reference_price > 0;
    factors.push({
      label: 'Reference price provided',
      met: hasRef,
      detail: hasRef ? 'Reference price anchors analysis' : 'No reference price — using offer price as fallback',
    });
  }

  // Market scenario or profile attached
  const hasContext = !!session.market_scenario_id || !!session.selected_market_profile_id;
  factors.push({
    label: 'Market context attached',
    met: hasContext,
    detail: hasContext ? 'Market scenario or profile selected' : 'No market scenario selected',
  });

  return factors;
}

function getScore(factors: ConfidenceFactor[]): number {
  return factors.filter(f => f.met).length;
}

function ConfidenceDots({ score, total }: { score: number; total: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i < score
              ? score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-amber-500' : 'bg-destructive'
              : 'bg-muted-foreground/20'
          }`}
        />
      ))}
    </div>
  );
}

export function MarketConfidenceScore({ snapshot, isGenericBaseline, session, className }: MarketConfidenceScoreProps) {
  const factors = getConfidenceFactors(snapshot, isGenericBaseline, session);
  const score = getScore(factors);
  const total = factors.length;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50 cursor-help ${className || ''}`}>
            <span className="text-xs text-muted-foreground font-medium">Data Confidence</span>
            <ConfidenceDots score={score} total={total} />
            <span className="text-[10px] text-muted-foreground">({score}/{total})</span>
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <p className="text-xs font-medium mb-2">Confidence Factors</p>
          <div className="space-y-1.5">
            {factors.map((factor, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className={factor.met ? 'text-emerald-500' : 'text-muted-foreground'}>
                  {factor.met ? '✓' : '⚠'}
                </span>
                <div>
                  <span className="font-medium">{factor.label}</span>
                  <p className="text-muted-foreground">{factor.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
