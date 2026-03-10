/**
 * Address Intelligence Signals — derived from market snapshot + session data
 * Shows neighborhood competitiveness, typical winning patterns, and common terms.
 * Signals vary by property type (SFH, Condo, MFH).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Zap, Trophy, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { Session, PropertyType } from '@/types';

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

/** Property-type adjustments to competitiveness score */
function getPropertyTypeModifier(propertyType: PropertyType): number {
  switch (propertyType) {
    case 'Condo': return -1; // Condos typically have more inventory, less competition
    case 'MFH': return 1;   // Multi-family in short supply, higher competition
    case 'SFH':
    default: return 0;
  }
}

function getPropertyTypeSpeedNote(propertyType: PropertyType, baseSpeed: string): string {
  switch (propertyType) {
    case 'Condo':
      return `${baseSpeed} (condos often have longer review periods due to HOA requirements)`;
    case 'MFH':
      return `${baseSpeed} (multi-family properties attract investor interest and may move faster)`;
    default:
      return baseSpeed;
  }
}

function deriveSignals(snapshot: MarketSnapshot, reportType: 'Buyer' | 'Seller', propertyType: PropertyType): IntelligenceSignals {
  // Competitiveness from DOM + sale-to-list + inventory + property type
  let compScore = 0;
  if (snapshot.medianDOM <= 14) compScore += 2;
  else if (snapshot.medianDOM <= 30) compScore += 1;
  else if (snapshot.medianDOM >= 60) compScore -= 1;

  if (snapshot.saleToListRatio >= 1.03) compScore += 2;
  else if (snapshot.saleToListRatio >= 1.0) compScore += 1;
  else if (snapshot.saleToListRatio <= 0.95) compScore -= 1;

  if (snapshot.inventorySignal === 'low') compScore += 1;
  else if (snapshot.inventorySignal === 'high') compScore -= 1;

  // Apply property type modifier
  compScore += getPropertyTypeModifier(propertyType);

  let competitiveness: CompetitivenessLevel;
  if (compScore >= 4) competitiveness = 'Very High';
  else if (compScore >= 2) competitiveness = 'High';
  else if (compScore >= 0) competitiveness = 'Moderate';
  else competitiveness = 'Low';

  // Typical winning patterns — vary by property type and report type
  const typicalWinningPatterns: string[] = [];
  if (reportType === 'Buyer') {
    if (propertyType === 'Condo') {
      if (compScore >= 3) {
        typicalWinningPatterns.push('HOA-ready financing strengthens offers in competitive condo markets');
        typicalWinningPatterns.push('Quick response times (24-48 hours) are common');
      } else if (compScore >= 1) {
        typicalWinningPatterns.push('Offers near list price with HOA-compatible financing tend to succeed');
        typicalWinningPatterns.push('Condo associations may add review time — plan accordingly');
      } else {
        typicalWinningPatterns.push('Below-list offers have reasonable success rates for condos');
        typicalWinningPatterns.push('Negotiate HOA-related repairs or credits');
      }
    } else if (propertyType === 'MFH') {
      if (compScore >= 3) {
        typicalWinningPatterns.push('Cash or conventional financing preferred — investor competition is high');
        typicalWinningPatterns.push('Offers highlighting rental income potential stand out');
      } else if (compScore >= 1) {
        typicalWinningPatterns.push('Competitive offers with investment-grade financing tend to succeed');
        typicalWinningPatterns.push('Demonstrate familiarity with multi-family operations');
      } else {
        typicalWinningPatterns.push('Below-list offers with favorable cap rates have success');
        typicalWinningPatterns.push('Extended due diligence periods are acceptable');
      }
    } else {
      // SFH
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
    }
  } else {
    // Seller
    if (propertyType === 'Condo') {
      if (compScore >= 3) {
        typicalWinningPatterns.push('Highlight low HOA fees and included amenities');
        typicalWinningPatterns.push('FHA-approved status broadens buyer pool significantly');
      } else if (compScore >= 1) {
        typicalWinningPatterns.push('Competitive pricing relative to similar units in the building');
        typicalWinningPatterns.push('Recent condo association improvements add perceived value');
      } else {
        typicalWinningPatterns.push('Price competitively vs. other units — buyers compare within buildings');
        typicalWinningPatterns.push('Offering HOA fee credits can differentiate your listing');
      }
    } else if (propertyType === 'MFH') {
      if (compScore >= 3) {
        typicalWinningPatterns.push('Strong rental income documentation supports premium pricing');
        typicalWinningPatterns.push('Investor demand supports at or above comparable sales');
      } else if (compScore >= 1) {
        typicalWinningPatterns.push('Highlight cap rate and rent roll stability');
        typicalWinningPatterns.push('Well-maintained multi-family units attract quality offers');
      } else {
        typicalWinningPatterns.push('Competitive cap rate pricing attracts investor interest');
        typicalWinningPatterns.push('Providing rent roll and expense history streamlines offers');
      }
    } else {
      // SFH
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
  }

  // Common winning terms — vary by property type
  const commonWinningTerms: string[] = [];
  if (reportType === 'Buyer') {
    if (propertyType === 'Condo') {
      if (compScore >= 3) {
        commonWinningTerms.push('Minimal contingencies');
        commonWinningTerms.push('HOA doc review waiver');
        commonWinningTerms.push('Flexible closing dates');
      } else if (compScore >= 1) {
        commonWinningTerms.push('Standard contingencies');
        commonWinningTerms.push('HOA document review period');
      } else {
        commonWinningTerms.push('Inspection contingencies common');
        commonWinningTerms.push('HOA assessment review');
        commonWinningTerms.push('Seller concessions negotiable');
      }
    } else if (propertyType === 'MFH') {
      if (compScore >= 3) {
        commonWinningTerms.push('Minimal contingencies');
        commonWinningTerms.push('Quick close (cash preferred)');
        commonWinningTerms.push('Waive rent credit at closing');
      } else if (compScore >= 1) {
        commonWinningTerms.push('Rent roll verification period');
        commonWinningTerms.push('Environmental inspection');
      } else {
        commonWinningTerms.push('Extended due diligence');
        commonWinningTerms.push('Tenant estoppel certificates');
        commonWinningTerms.push('Seller financing negotiable');
      }
    } else {
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
    }
  } else {
    // Seller terms
    if (propertyType === 'Condo') {
      if (compScore >= 3) {
        commonWinningTerms.push('Set offer deadlines to encourage competition');
        commonWinningTerms.push('Highlight FHA approval status');
      } else if (compScore >= 1) {
        commonWinningTerms.push('Professional staging recommended');
        commonWinningTerms.push('Provide HOA docs upfront to speed offers');
      } else {
        commonWinningTerms.push('Consider offering HOA fee credits');
        commonWinningTerms.push('Home warranty inclusion appeals to buyers');
        commonWinningTerms.push('Flexible showing schedules increase traffic');
      }
    } else if (propertyType === 'MFH') {
      if (compScore >= 3) {
        commonWinningTerms.push('Provide rent roll and expense reports upfront');
        commonWinningTerms.push('Set offer deadlines — investor demand is strong');
      } else if (compScore >= 1) {
        commonWinningTerms.push('Highlight recent capital improvements');
        commonWinningTerms.push('Pre-inspection can streamline offers');
      } else {
        commonWinningTerms.push('Consider offering seller financing');
        commonWinningTerms.push('Provide projected ROI for buyers');
        commonWinningTerms.push('Flexible closing timeline attracts investors');
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
  }

  // Market speed with property type context
  let baseSpeed: string;
  if (snapshot.medianDOM <= 14) baseSpeed = 'Very fast — properties move quickly';
  else if (snapshot.medianDOM <= 30) baseSpeed = 'Moderate pace — typical absorption rate';
  else if (snapshot.medianDOM <= 60) baseSpeed = 'Slower pace — buyers have more time';
  else baseSpeed = 'Extended timelines — patience may be needed';

  const marketSpeed = getPropertyTypeSpeedNote(propertyType, baseSpeed);

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

  // Add property-type pricing context
  if (propertyType === 'Condo') {
    pricingContext += '. Condo pricing is influenced by comparable units within the same building or complex';
  } else if (propertyType === 'MFH') {
    pricingContext += '. Multi-family pricing heavily influenced by cap rates and rental income';
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

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  SFH: 'Single-Family',
  Condo: 'Condo/Townhouse',
  MFH: 'Multi-Family',
};

export function AddressIntelligenceCard({ session, snapshot, isGenericBaseline, reportType, className }: AddressIntelligenceCardProps) {
  const signals = deriveSignals(snapshot, reportType, session.property_type);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <div className="h-0.5 bg-gradient-to-r from-accent/40 via-accent to-accent/40" />
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <MapPin className="h-4 w-4 text-accent" />
          </div>
          Neighborhood Intelligence
          <Badge variant="secondary" className="text-[10px] ml-auto font-normal">
            {PROPERTY_TYPE_LABELS[session.property_type]}
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isGenericBaseline
            ? 'Market pattern analysis for this area'
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

      </CardContent>
    </Card>
  );
}
