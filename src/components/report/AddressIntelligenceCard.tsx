/**
 * Address Intelligence Signals — derived from market snapshot + session data
 * Shows neighborhood competitiveness, typical winning patterns, and common terms.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Zap, Trophy, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { Session } from '@/types';

interface AddressIntelligenceCardProps {
  session: Session;
  snapshot: MarketSnapshot;
  isGenericBaseline: boolean;
  reportType: 'Buyer' | 'Seller';
  className?: string;
}

type CompetitivenessLevel = 'Low' | 'Moderate' | 'High' | 'Very High';

interface IntelligenceSignals {
  competitiveness: CompetitivenessLevel;
  typicalWinningPatterns: string[];
  commonWinningTerms: string[];
  marketSpeed: string;
  pricingContext: string;
}

function deriveSignals(snapshot: MarketSnapshot, reportType: 'Buyer' | 'Seller'): IntelligenceSignals {
  // Competitiveness from DOM + sale-to-list + inventory
  let compScore = 0;
  if (snapshot.medianDOM <= 14) compScore += 2;
  else if (snapshot.medianDOM <= 30) compScore += 1;
  else if (snapshot.medianDOM >= 60) compScore -= 1;

  if (snapshot.saleToListRatio >= 1.03) compScore += 2;
  else if (snapshot.saleToListRatio >= 1.0) compScore += 1;
  else if (snapshot.saleToListRatio <= 0.95) compScore -= 1;

  if (snapshot.inventorySignal === 'low') compScore += 1;
  else if (snapshot.inventorySignal === 'high') compScore -= 1;

  let competitiveness: CompetitivenessLevel;
  if (compScore >= 4) competitiveness = 'Very High';
  else if (compScore >= 2) competitiveness = 'High';
  else if (compScore >= 0) competitiveness = 'Moderate';
  else competitiveness = 'Low';

  // Typical winning patterns
  const typicalWinningPatterns: string[] = [];
  if (reportType === 'Buyer') {
    if (compScore >= 3) {
      typicalWinningPatterns.push('Offers typically need to be at or above list price');
      typicalWinningPatterns.push('Quick response times (24-48 hours) are common');
    } else if (compScore >= 1) {
      typicalWinningPatterns.push('Competitive offers near list price tend to succeed');
      typicalWinningPatterns.push('Standard response windows (3-5 days) are typical');
    } else {
      typicalWinningPatterns.push('Below-list offers have reasonable success rates');
      typicalWinningPatterns.push('Extended negotiation periods are common');
    }
  } else {
    if (compScore >= 3) {
      typicalWinningPatterns.push('Strong demand supports pricing at or above recent comparables');
      typicalWinningPatterns.push('Multiple offer situations are common');
    } else if (compScore >= 1) {
      typicalWinningPatterns.push('Competitive pricing near market value attracts attention');
      typicalWinningPatterns.push('Well-presented listings tend to sell within median timeframes');
    } else {
      typicalWinningPatterns.push('Strategic pricing below recent comparables may attract interest');
      typicalWinningPatterns.push('Offering incentives (closing costs, repairs) can differentiate');
    }
  }

  // Common winning terms
  const commonWinningTerms: string[] = [];
  if (reportType === 'Buyer') {
    if (compScore >= 3) {
      commonWinningTerms.push('Minimal contingencies');
      commonWinningTerms.push('Flexible closing dates');
      commonWinningTerms.push('Strong earnest money deposits');
    } else if (compScore >= 1) {
      commonWinningTerms.push('Standard contingencies');
      commonWinningTerms.push('Conventional financing preferred');
    } else {
      commonWinningTerms.push('Inspection contingencies common');
      commonWinningTerms.push('Financing and appraisal contingencies typical');
      commonWinningTerms.push('Seller concessions negotiable');
    }
  } else {
    if (compScore >= 3) {
      commonWinningTerms.push('Set offer deadlines to encourage competition');
      commonWinningTerms.push('Highlight unique property features');
    } else if (compScore >= 1) {
      commonWinningTerms.push('Professional staging recommended');
      commonWinningTerms.push('Pre-inspection can streamline offers');
    } else {
      commonWinningTerms.push('Consider offering closing cost assistance');
      commonWinningTerms.push('Home warranty inclusion appeals to buyers');
      commonWinningTerms.push('Flexible showing schedules increase traffic');
    }
  }

  // Market speed
  let marketSpeed: string;
  if (snapshot.medianDOM <= 14) marketSpeed = 'Very fast — properties move quickly';
  else if (snapshot.medianDOM <= 30) marketSpeed = 'Moderate pace — typical absorption rate';
  else if (snapshot.medianDOM <= 60) marketSpeed = 'Slower pace — buyers have more time';
  else marketSpeed = 'Extended timelines — patience may be needed';

  // Pricing context
  const ratio = Math.round(snapshot.saleToListRatio * 100);
  let pricingContext: string;
  if (snapshot.saleToListRatio >= 1.03) {
    pricingContext = `Homes selling at ~${ratio}% of list price — above-ask offers are common`;
  } else if (snapshot.saleToListRatio >= 0.99) {
    pricingContext = `Homes selling at ~${ratio}% of list price — near full asking`;
  } else {
    pricingContext = `Homes selling at ~${ratio}% of list price — negotiation expected`;
  }

  return {
    competitiveness,
    typicalWinningPatterns,
    commonWinningTerms,
    marketSpeed,
    pricingContext,
  };
}

function CompetitivenessBadge({ level }: { level: CompetitivenessLevel }) {
  const config: Record<CompetitivenessLevel, { variant: 'success' | 'warning' | 'destructive' | 'outline'; label: string }> = {
    'Low': { variant: 'success', label: 'Low Competition' },
    'Moderate': { variant: 'outline', label: 'Moderate Competition' },
    'High': { variant: 'warning', label: 'High Competition' },
    'Very High': { variant: 'destructive', label: 'Very High Competition' },
  };
  const c = config[level];
  return <Badge variant={c.variant} className="text-[10px] px-2 py-0.5">{c.label}</Badge>;
}

export function AddressIntelligenceCard({ session, snapshot, isGenericBaseline, reportType, className }: AddressIntelligenceCardProps) {
  const signals = deriveSignals(snapshot, reportType);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <div className="h-0.5 bg-gradient-to-r from-accent/40 via-accent to-accent/40" />
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <MapPin className="h-4 w-4 text-accent" />
          </div>
          Neighborhood Intelligence
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isGenericBaseline
            ? 'Estimated signals based on general market patterns'
            : `Derived from market data for ${snapshot.location}`
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {/* Competitiveness + Speed */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Area Competitiveness</span>
            </div>
            <CompetitivenessBadge level={signals.competitiveness} />
          </div>

          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Market Speed</span>
            </div>
            <p className="text-sm">{signals.marketSpeed}</p>
          </div>

          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pricing Context</span>
            </div>
            <p className="text-sm">{signals.pricingContext}</p>
          </div>
        </div>

        {/* Winning Patterns */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="h-3.5 w-3.5 text-accent" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {reportType === 'Buyer' ? 'Typical Winning Offer Patterns' : 'Effective Listing Strategies'}
            </p>
          </div>
          <div className="space-y-1">
            {signals.typicalWinningPatterns.map((pattern, i) => (
              <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-accent/60 shrink-0" />
                {pattern}
              </p>
            ))}
          </div>
        </div>

        {/* Common Terms */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-3.5 w-3.5 text-accent" />
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {reportType === 'Buyer' ? 'Most Common Winning Terms' : 'Recommended Terms & Tactics'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {signals.commonWinningTerms.map((term, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                {term}
              </Badge>
            ))}
          </div>
        </div>

        {isGenericBaseline && (
          <p className="text-[10px] text-muted-foreground italic">
            Add a market snapshot for this area to improve signal accuracy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
