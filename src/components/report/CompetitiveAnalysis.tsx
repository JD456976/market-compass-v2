import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { Session, ExtendedLikelihoodBand } from '@/types';
import { MarketSnapshot, getMarketContext } from '@/lib/marketSnapshots';

interface CompetitiveAnalysisProps {
  session: Session;
  snapshot: MarketSnapshot;
  isGenericBaseline: boolean;
  acceptanceLikelihood?: ExtendedLikelihoodBand;
}

function estimateCompetingOffers(snapshot: MarketSnapshot): { min: number; max: number; label: string } {
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

export function BuyerCompetitiveAnalysis({ session, snapshot, isGenericBaseline }: CompetitiveAnalysisProps) {
  const inputs = session.buyer_inputs;
  if (!inputs) return null;

  const competing = estimateCompetingOffers(snapshot);
  const premium = getWinningPremium(snapshot);
  const referencePrice = inputs.reference_price || inputs.offer_price;
  const recommendedMin = Math.round(referencePrice * snapshot.saleToListRatio * 0.99);
  const recommendedMax = Math.round(referencePrice * snapshot.saleToListRatio * 1.02);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  return (
    <Card className="pdf-section pdf-avoid-break">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-accent" />
          Competitive Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-secondary/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Est. Competing Offers</p>
            <p className="text-xl font-serif font-bold">{competing.min}–{competing.max}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{competing.label}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg. Winning Premium</p>
            <p className="text-xl font-serif font-bold">
              {premium.percent > 0 ? `+${premium.percent}%` : premium.percent === 0 ? '~0%' : `${premium.percent}%`}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{premium.label}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Recommended Range</p>
            <p className="text-base font-serif font-bold break-words">
              {formatCurrency(recommendedMin)} – {formatCurrency(recommendedMax)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Based on market data</p>
          </div>
        </div>

        {isGenericBaseline && (
          <p className="text-[10px] text-amber-600 dark:text-amber-500 italic">
            Estimates based on generic baseline. Location-specific data would improve accuracy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SellerCompetitiveAnalysis({ session, snapshot, isGenericBaseline }: CompetitiveAnalysisProps) {
  const inputs = session.seller_inputs;
  if (!inputs) return null;

  const context = getMarketContext(snapshot);
  const competing = estimateCompetingOffers(snapshot);

  const typicalOffers = context.competitionContext === 'high'
    ? `Properties in this price range typically receive ${competing.min}–${competing.max} offers.`
    : context.competitionContext === 'moderate'
    ? `Properties in this price range typically receive ${competing.min}–${competing.max} offers.`
    : 'Competition is limited — properties may take longer to attract offers.';

  const expectedDOM = snapshot.medianDOM;
  const domContext = expectedDOM <= 21
    ? 'Homes in this area sell quickly. Price competitively to attract early offers.'
    : expectedDOM <= 35
    ? 'Homes sell at a moderate pace. Strategic pricing can accelerate timeline.'
    : 'Market pace is slower. Patience and pricing flexibility may be needed.';

  return (
    <Card className="pdf-section pdf-avoid-break">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-accent" />
          Competitive Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Typical Offer Volume</p>
            </div>
            <p className="text-sm font-semibold">{competing.min}–{competing.max} offers</p>
            <p className="text-[10px] text-muted-foreground mt-1">{typicalOffers}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Expected Days on Market</p>
            </div>
            <p className="text-sm font-semibold">~{expectedDOM} days</p>
            <p className="text-[10px] text-muted-foreground mt-1">{domContext}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Market positioning:</span>{' '}
            {snapshot.saleToListRatio >= 1.01
              ? `Homes in ${snapshot.location} are selling at ${Math.round(snapshot.saleToListRatio * 100)}% of list price. Strategic pricing below market ceiling may generate competitive interest.`
              : `Homes in ${snapshot.location} are selling at ${Math.round(snapshot.saleToListRatio * 100)}% of list price. Competitive pricing is important to attract serious buyers.`}
          </p>
        </div>

        {isGenericBaseline && (
          <p className="text-[10px] text-amber-600 dark:text-amber-500 italic">
            Estimates based on generic baseline. Location-specific data would improve accuracy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
