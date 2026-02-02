// Reality Anchors - Agent-only accuracy guardrails
// Non-blocking notes that explain market context and potential tensions

import { AlertTriangle, Info, Compass } from 'lucide-react';
import { Session, LikelihoodBand } from '@/types';
import { MarketSnapshot, getMarketContext, getTimelineAnchor, getContingencyAnchor } from '@/lib/marketSnapshots';

interface RealityAnchorsProps {
  session: Session;
  snapshot: MarketSnapshot;
  isGenericBaseline: boolean;
}

// Detect internal consistency conflicts
export function getConsistencyIssues(session: Session): string[] {
  const issues: string[] = [];
  
  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    const inputs = session.buyer_inputs;
    
    // Cash + heavy contingencies + slow close in hot market
    if (inputs.financing_type === 'Cash' && 
        inputs.contingencies.length >= 3 && 
        (inputs.closing_timeline === '45+' || inputs.closing_timeline === '31-45')) {
      issues.push('Cash offer with heavy contingencies and slow close reduces the advantage of cash financing.');
    }
    
    // "Must win" + multiple contingencies
    if (inputs.buyer_preference === 'Must win' && inputs.contingencies.length >= 3) {
      issues.push('"Must win" preference paired with multiple contingencies may create tension.');
    }
    
    // Price-protective + fast close (unusual combination)
    if (inputs.buyer_preference === 'Price-protective' && inputs.closing_timeline === '<21') {
      issues.push('Price-protective stance with very fast close may limit negotiation flexibility.');
    }
  }
  
  if (session.session_type === 'Seller' && session.seller_inputs) {
    const inputs = session.seller_inputs;
    
    // Maximize price + short timeline
    if (inputs.strategy_preference === 'Maximize price' && inputs.desired_timeframe === '30') {
      issues.push('Maximizing price within 30 days may require trade-offs if market conditions don\'t align.');
    }
    
    // Prioritize speed + 90+ day timeline
    if (inputs.strategy_preference === 'Prioritize speed' && inputs.desired_timeframe === '90+') {
      issues.push('Speed-priority strategy with 90+ day timeline may not align with urgency goals.');
    }
  }
  
  return issues;
}

// Identify the primary limiting factor
export function getPrimaryLimitingFactor(
  session: Session, 
  snapshot: MarketSnapshot,
  likelihood: LikelihoodBand
): { factor: string; lever: string } | null {
  if (likelihood === 'High') return null; // No limiting factor if already high
  
  const context = getMarketContext(snapshot);
  
  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    const inputs = session.buyer_inputs;
    
    // Priority order based on impact
    if (inputs.contingencies.includes('Home sale')) {
      return {
        factor: 'Home sale contingency',
        lever: 'Remove or modify home sale contingency',
      };
    }
    
    if (inputs.contingencies.length >= 3) {
      return {
        factor: 'Multiple contingencies',
        lever: 'Reduce contingencies to essential protections only',
      };
    }
    
    if (inputs.closing_timeline === '45+' && context.speedContext === 'faster') {
      return {
        factor: 'Extended closing timeline',
        lever: 'Shorten closing timeline to match market pace',
      };
    }
    
    if (inputs.financing_type === 'FHA' || inputs.financing_type === 'VA') {
      if (context.competitionContext === 'high') {
        return {
          factor: 'Financing type in competitive market',
          lever: 'Consider conventional financing if eligible, or strengthen other terms',
        };
      }
    }
    
    if (inputs.financing_type !== 'Cash' && inputs.down_payment_percent === '<10') {
      return {
        factor: 'Lower down payment',
        lever: 'Increase down payment percentage if possible',
      };
    }
    
    // Default for moderate offers
    if (inputs.contingencies.length > 0 && !inputs.contingencies.includes('None')) {
      return {
        factor: 'Contingency structure',
        lever: 'Streamline contingencies for stronger positioning',
      };
    }
  }
  
  if (session.session_type === 'Seller' && session.seller_inputs) {
    const inputs = session.seller_inputs;
    
    if (inputs.strategy_preference === 'Maximize price' && context.priceContext === 'below') {
      return {
        factor: 'Pricing strategy vs. market conditions',
        lever: 'Consider balanced pricing approach for current market',
      };
    }
    
    if (inputs.desired_timeframe === '30' && context.speedContext === 'slower') {
      return {
        factor: 'Timeline expectation',
        lever: 'Extend timeline or price more aggressively',
      };
    }
    
    if (session.condition === 'Dated') {
      return {
        factor: 'Property condition',
        lever: 'Consider strategic updates or price adjustment',
      };
    }
  }
  
  return null;
}

// Market grounding display for agent mode
export function MarketGrounding({ 
  session, 
  snapshot, 
  isGenericBaseline 
}: RealityAnchorsProps) {
  const context = getMarketContext(snapshot);
  const city = snapshot.location;
  const updatedDate = new Date(snapshot.lastUpdated).toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
  
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
      <div className="flex items-start gap-2">
        <Compass className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="space-y-1">
          {/* Trust cue - always visible in agent mode */}
          <p className="text-[10px] text-muted-foreground italic mb-1">
            Analysis based on public market trends and transaction structure.
          </p>
          <p className="text-xs font-medium text-foreground">
            Market assumptions based on {snapshot.sourceLabel.toLowerCase()} for {city}
            {!isGenericBaseline && <span className="text-muted-foreground">, updated {updatedDate}</span>}
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span>Median DOM: {snapshot.medianDOM} days</span>
            <span>•</span>
            <span>Sale-to-list: {Math.round(snapshot.saleToListRatio * 100)}%</span>
            <span>•</span>
            <span>Inventory: {snapshot.inventorySignal}</span>
          </div>
          {isGenericBaseline && (
            <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">
              This town is outside the current Market Compass dataset. Baseline assumptions are being used.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Reality anchor notes (timeline, contingencies, etc.)
export function RealityAnchorNotes({ 
  session, 
  snapshot 
}: { session: Session; snapshot: MarketSnapshot }) {
  const anchors: { type: 'info' | 'warning'; message: string }[] = [];
  
  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    const inputs = session.buyer_inputs;
    
    // Timeline anchor
    const closingDays = inputs.closing_timeline === '<21' ? 18 
      : inputs.closing_timeline === '21-30' ? 25
      : inputs.closing_timeline === '31-45' ? 38
      : 50;
    
    const timelineAnchor = getTimelineAnchor(closingDays, snapshot);
    if (timelineAnchor.hasAnchor) {
      anchors.push({ type: 'info', message: timelineAnchor.message });
    }
    
    // Contingency anchor
    const contAnchor = getContingencyAnchor(
      inputs.contingencies.length,
      inputs.contingencies.includes('Home sale'),
      snapshot
    );
    if (contAnchor.hasAnchor) {
      anchors.push({ 
        type: inputs.contingencies.includes('Home sale') ? 'warning' : 'info', 
        message: contAnchor.message 
      });
    }
  }
  
  if (session.session_type === 'Seller' && session.seller_inputs) {
    const inputs = session.seller_inputs;
    
    // Timeline anchor for sellers
    const desiredDays = inputs.desired_timeframe === '30' ? 30
      : inputs.desired_timeframe === '60' ? 60
      : 90;
    
    const timelineAnchor = getTimelineAnchor(desiredDays, snapshot);
    if (timelineAnchor.hasAnchor) {
      anchors.push({ type: 'info', message: timelineAnchor.message });
    }
  }
  
  if (anchors.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {anchors.map((anchor, index) => (
        <div 
          key={index} 
          className={`flex items-start gap-2 text-xs p-2 rounded-md ${
            anchor.type === 'warning' 
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' 
              : 'bg-muted/50 text-muted-foreground'
          }`}
        >
          {anchor.type === 'warning' ? (
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          )}
          <span>{anchor.message}</span>
        </div>
      ))}
    </div>
  );
}

// Consistency warning display
export function ConsistencyWarning({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  
  return (
    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
            Some inputs pull in different directions
          </p>
          <ul className="text-[11px] text-amber-600 dark:text-amber-500 space-y-0.5 list-disc list-inside">
            {issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 mt-1.5">
            Likelihood reflects this tension.
          </p>
        </div>
      </div>
    </div>
  );
}

// Primary limiting factor display
export function PrimaryLimitingFactor({ 
  factor, 
  lever 
}: { factor: string; lever: string }) {
  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
      <p className="text-xs font-medium text-foreground mb-1">
        Primary limiting factor: <span className="text-primary">{factor}</span>
      </p>
      <p className="text-[11px] text-muted-foreground">
        Most effective lever: {lever}
      </p>
    </div>
  );
}
