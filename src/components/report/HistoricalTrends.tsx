import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, BarChart3, Zap } from 'lucide-react';
import { MarketSnapshot, getMarketContext } from '@/lib/marketSnapshots';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HistoricalTrendsProps {
  snapshot: MarketSnapshot;
  isGenericBaseline: boolean;
  isClientMode: boolean;
}

function getSeasonalNote(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 5) return 'Spring markets typically see 10-15% higher activity and faster sales.';
  if (month >= 6 && month <= 8) return 'Summer markets tend to sustain strong activity with peak inventory.';
  if (month >= 9 && month <= 10) return 'Fall markets typically cool slightly, with motivated buyers remaining active.';
  return 'Winter markets tend to have lower inventory but more motivated participants.';
}

function getMarketVelocity(medianDOM: number): { label: string; color: string } {
  if (medianDOM <= 14) return { label: 'Very Fast', color: 'text-emerald-600' };
  if (medianDOM <= 21) return { label: 'Fast', color: 'text-emerald-600' };
  if (medianDOM <= 30) return { label: 'Average', color: 'text-amber-600' };
  if (medianDOM <= 45) return { label: 'Slow', color: 'text-orange-600' };
  return { label: 'Very Slow', color: 'text-destructive' };
}

function getSaleToListTrend(ratio: number): { label: string; detail: string } {
  if (ratio >= 1.05) return { label: 'Strong Seller\'s Market', detail: 'Homes selling well above asking price' };
  if (ratio >= 1.01) return { label: 'Seller-Favorable', detail: 'Homes selling at or above asking price' };
  if (ratio >= 0.98) return { label: 'Balanced', detail: 'Homes selling near asking price' };
  if (ratio >= 0.95) return { label: 'Buyer-Favorable', detail: 'Homes selling slightly below asking' };
  return { label: 'Buyer\'s Market', detail: 'Homes selling below asking price' };
}

export function HistoricalTrends({ snapshot, isGenericBaseline, isClientMode }: HistoricalTrendsProps) {
  const context = getMarketContext(snapshot);
  const velocity = getMarketVelocity(snapshot.medianDOM);
  const saleTrend = getSaleToListTrend(snapshot.saleToListRatio);
  const seasonalNote = getSeasonalNote();
  const updatedDate = new Date(snapshot.lastUpdated).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card className="pdf-section pdf-avoid-break">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-accent" />
          Market Trends & Context
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on {snapshot.sourceLabel.toLowerCase()} for {snapshot.location}
          {!isGenericBaseline && <> • Updated {updatedDate}</>}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trend Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Market Velocity */}
          <div className="p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Market Velocity</p>
            </div>
            <p className={`text-sm font-semibold ${velocity.color}`}>{velocity.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Median {snapshot.medianDOM} days on market
            </p>
          </div>

          {/* Price Trend */}
          <div className="p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Price Trend</p>
            </div>
            <p className="text-sm font-semibold">{saleTrend.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {Math.round(snapshot.saleToListRatio * 100)}% sale-to-list ratio
            </p>
          </div>

          {/* Inventory Signal */}
          <div className="p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Inventory</p>
            </div>
            <p className="text-sm font-semibold capitalize">{snapshot.inventorySignal}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {snapshot.inventorySignal === 'low' ? 'More competition among buyers' :
               snapshot.inventorySignal === 'high' ? 'More options for buyers' :
               'Typical level of available homes'}
            </p>
          </div>

          {/* Seasonal Context */}
          <div className="p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Seasonal Pattern</p>
            </div>
            <p className="text-sm font-semibold">
              {new Date().toLocaleDateString('en-US', { month: 'long' })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
              {seasonalNote}
            </p>
          </div>
        </div>

        {/* Year-over-Year Context */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{saleTrend.detail}.</span>{' '}
            {context.competitionContext === 'high' 
              ? 'Current conditions favor sellers with limited inventory driving competitive dynamics.'
              : context.competitionContext === 'low'
              ? 'Current conditions provide buyers with more negotiating leverage and choices.'
              : 'Market conditions are balanced between buyers and sellers.'}
          </p>
        </div>

        {isGenericBaseline && (
          <p className="text-[10px] text-amber-600 dark:text-amber-500 italic">
            This location is outside the current dataset. Baseline assumptions are being used.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
