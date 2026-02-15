/**
 * Unified Competitive Intelligence Card — merges market context stats with
 * the interactive Competing Offer Simulator (buyer) / Expected Interest (seller).
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Swords, Users, TrendingUp, Shield, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BuyerInputs, SellerInputs, LikelihoodBand } from '@/types';
import { MarketSnapshot, getMarketContext } from '@/lib/marketSnapshots';
import { 
  simulateCompetingOffers, 
  estimateSellerCompetingOffers, 
  CompetingOfferParams, 
  CompetitorAggressiveness 
} from '@/lib/competingOffers';

function RiskPill({ label, level }: { label: string; level: string }) {
  const color = level === 'Very High' || level === 'High' 
    ? 'text-destructive' 
    : level === 'Moderate' 
    ? 'text-accent' 
    : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', color)}>{level}</span>
    </div>
  );
}

// ── Market Context Helpers ──

function estimateCompetingOfferCount(snapshot: MarketSnapshot): { min: number; max: number; label: string } {
  const context = getMarketContext(snapshot);
  if (context.competitionContext === 'high') {
    if (snapshot.medianDOM <= 14) return { min: 4, max: 8, label: 'Very Competitive' };
    return { min: 2, max: 5, label: 'Competitive' };
  }
  if (context.competitionContext === 'moderate') {
    return { min: 1, max: 3, label: 'Moderate' };
  }
  return { min: 0, max: 2, label: 'Limited' };
}

function getWinningPremium(snapshot: MarketSnapshot): { percent: number; label: string } {
  const ratio = snapshot.saleToListRatio;
  if (ratio >= 1.05) return { percent: Math.round((ratio - 1) * 100), label: 'Strong premium needed' };
  if (ratio >= 1.01) return { percent: Math.round((ratio - 1) * 100), label: 'Modest premium typical' };
  if (ratio >= 0.98) return { percent: 0, label: 'Near asking price typical' };
  return { percent: Math.round((1 - ratio) * 100) * -1, label: 'Below asking typical' };
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

// ── Buyer Side ──
interface BuyerCompetingOffersCardProps {
  inputs: BuyerInputs;
  snapshot?: MarketSnapshot;
  className?: string;
  isGenericBaseline?: boolean;
}

export function BuyerCompetingOffersCard({ inputs, snapshot, className, isGenericBaseline }: BuyerCompetingOffersCardProps) {
  const [numCompetitors, setNumCompetitors] = useState(2);
  const [aggressiveness, setAggressiveness] = useState<CompetitorAggressiveness>('moderate');
  const [waiveContingencies, setWaiveContingencies] = useState(false);

  const params: CompetingOfferParams = { numCompetitors, aggressiveness, likelyContingencyWaivers: waiveContingencies };
  const result = useMemo(() => simulateCompetingOffers(inputs, params, snapshot), [inputs, params, snapshot]);

  // Market context stats
  const marketStats = useMemo(() => {
    if (!snapshot) return null;
    const competing = estimateCompetingOfferCount(snapshot);
    const premium = getWinningPremium(snapshot);
    const referencePrice = inputs.reference_price || inputs.offer_price;
    const recommendedMin = Math.round(referencePrice * snapshot.saleToListRatio * 0.99);
    const recommendedMax = Math.round(referencePrice * snapshot.saleToListRatio * 1.02);
    return { competing, premium, recommendedMin, recommendedMax };
  }, [snapshot, inputs]);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Swords className="h-5 w-5 text-accent" />
          Competitive Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Market Context Summary */}
        {marketStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Est. Competing Offers</p>
              <p className="text-xl font-serif font-bold">{marketStats.competing.min}–{marketStats.competing.max}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{marketStats.competing.label}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg. Winning Premium</p>
              <p className="text-xl font-serif font-bold">
                {marketStats.premium.percent > 0 ? `+${marketStats.premium.percent}%` : marketStats.premium.percent === 0 ? '~0%' : `${marketStats.premium.percent}%`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{marketStats.premium.label}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Recommended Range</p>
              <p className="text-base font-serif font-bold break-words">
                {formatCurrency(marketStats.recommendedMin)} – {formatCurrency(marketStats.recommendedMax)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Based on market data</p>
            </div>
          </div>
        )}

        {isGenericBaseline && (
          <p className="text-[10px] text-amber-600 dark:text-amber-500 italic">
            Estimates based on generic baseline. Location-specific data would improve accuracy.
          </p>
        )}

        {/* Interactive Simulator Controls */}
        <div className="space-y-4 pt-2 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Offer Simulator</p>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">Competing Buyers</label>
              <span className="text-sm font-medium">{numCompetitors}</span>
            </div>
            <Slider
              value={[numCompetitors]}
              onValueChange={([v]) => setNumCompetitors(v)}
              min={0}
              max={5}
              step={1}
              className="touch-manipulation"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Market Aggressiveness</label>
            <div className="flex gap-2">
              {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setAggressiveness(level)}
                  className={cn(
                    'flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors min-h-[44px]',
                    aggressiveness === level
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/50 text-foreground border-border hover:bg-secondary'
                  )}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setWaiveContingencies(!waiveContingencies)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors min-h-[44px]',
              waiveContingencies
                ? 'bg-destructive/10 border-destructive/30 text-foreground'
                : 'bg-secondary/50 border-border text-muted-foreground'
            )}
          >
            <span>Competitors likely to waive contingencies</span>
            <span className="font-medium">{waiveContingencies ? 'Yes' : 'No'}</span>
          </button>
        </div>

        {/* Results */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Competitive Position</span>
            <Badge variant={result.competitivePosition === 'Dominant' || result.competitivePosition === 'Strong' ? 'success' : result.competitivePosition === 'Competitive' ? 'warning' : 'destructive'}>
              {result.competitivePosition}
            </Badge>
          </div>

          {result.priceGap > 0 && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-sm">
                <span className="text-muted-foreground">Estimated price to compete: </span>
                <span className="font-serif font-bold">{formatCurrency(result.neededPriceToCompete)}</span>
                <span className="text-xs text-muted-foreground ml-1">(+{result.priceGapPercent.toFixed(1)}%)</span>
              </p>
            </div>
          )}

          <RiskPill label="Risk of Losing" level={result.riskOfLosing} />
          <RiskPill label="Overpay Risk" level={result.riskOfOverpaying} />
        </div>

        {/* Insights */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          {result.insights.map((insight, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {insight}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Seller Side ──
interface SellerCompetingOffersCardProps {
  inputs: SellerInputs;
  likelihood30: LikelihoodBand;
  snapshot?: MarketSnapshot;
  className?: string;
  isGenericBaseline?: boolean;
}

export function SellerCompetingOffersCard({ inputs, likelihood30, snapshot, className, isGenericBaseline }: SellerCompetingOffersCardProps) {
  const result = useMemo(() => estimateSellerCompetingOffers(inputs, likelihood30, snapshot), [inputs, likelihood30, snapshot]);

  // Market context for seller
  const marketContext = useMemo(() => {
    if (!snapshot) return null;
    const context = getMarketContext(snapshot);
    const competing = estimateCompetingOfferCount(snapshot);
    
    const typicalOffers = context.competitionContext === 'high' || context.competitionContext === 'moderate'
      ? `Properties typically receive ${competing.min}–${competing.max} offers.`
      : 'Competition is limited — properties may take longer to attract offers.';

    const expectedDOM = snapshot.medianDOM;
    const domContext = expectedDOM <= 21
      ? 'Homes sell quickly. Price competitively to attract early offers.'
      : expectedDOM <= 35
      ? 'Homes sell at a moderate pace. Strategic pricing can accelerate timeline.'
      : 'Market pace is slower. Patience and pricing flexibility may be needed.';

    const positioning = snapshot.saleToListRatio >= 1.01
      ? `Homes in ${snapshot.location} sell at ${Math.round(snapshot.saleToListRatio * 100)}% of list price. Strategic pricing below market ceiling may generate competitive interest.`
      : `Homes in ${snapshot.location} sell at ${Math.round(snapshot.saleToListRatio * 100)}% of list price. Competitive pricing is important to attract serious buyers.`;

    return { competing, typicalOffers, expectedDOM, domContext, positioning };
  }, [snapshot]);

  return (
    <Card className={cn('pdf-section pdf-avoid-break overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-accent" />
          Competitive Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Context */}
        {marketContext && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Typical Offer Volume</p>
                </div>
                <p className="text-sm font-semibold">{marketContext.competing.min}–{marketContext.competing.max} offers</p>
                <p className="text-[10px] text-muted-foreground mt-1">{marketContext.typicalOffers}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Expected Days on Market</p>
                </div>
                <p className="text-sm font-semibold">~{marketContext.expectedDOM} days</p>
                <p className="text-[10px] text-muted-foreground mt-1">{marketContext.domContext}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Market positioning:</span>{' '}
                {marketContext.positioning}
              </p>
            </div>
          </>
        )}

        {isGenericBaseline && (
          <p className="text-[10px] text-amber-600 dark:text-amber-500 italic">
            Estimates based on generic baseline. Location-specific data would improve accuracy.
          </p>
        )}

        {/* Expected Interest Stats */}
        <div className="pt-2 border-t border-border/50 space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expected Buyer Interest</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
              <p className="text-xs text-muted-foreground mb-1">Expected Offers</p>
              <p className="text-xl font-serif font-bold">{result.expectedOffers.toFixed(1)}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
              <p className="text-xs text-muted-foreground mb-1">Demand Level</p>
              <Badge variant={result.demandLevel === 'High' || result.demandLevel === 'Very High' ? 'success' : result.demandLevel === 'Moderate' ? 'warning' : 'outline'}>
                {result.demandLevel}
              </Badge>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm">
              <span className="text-muted-foreground">Expected offer range: </span>
              <span className="font-serif font-bold">{formatCurrency(result.offerRange.low)}</span>
              <span className="text-muted-foreground"> – </span>
              <span className="font-serif font-bold">{formatCurrency(result.offerRange.high)}</span>
            </p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Buyer Urgency</span>
            <Badge variant={result.buyerUrgency === 'High' ? 'success' : result.buyerUrgency === 'Moderate' ? 'warning' : 'outline'}>
              {result.buyerUrgency}
            </Badge>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          {result.insights.map((insight, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {insight}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
