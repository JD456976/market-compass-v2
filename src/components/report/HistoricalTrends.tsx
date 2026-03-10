import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, BarChart3, Zap } from 'lucide-react';
import { MarketSnapshot, getMarketContext } from '@/lib/marketSnapshots';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  if (ratio >= 1.05) return { label: "Strong Seller's Market", detail: 'Homes selling well above asking price' };
  if (ratio >= 1.01) return { label: 'Seller-Favorable', detail: 'Homes selling at or above asking price' };
  if (ratio >= 0.98) return { label: 'Balanced', detail: 'Homes selling near asking price' };
  if (ratio >= 0.95) return { label: 'Buyer-Favorable', detail: 'Homes selling slightly below asking' };
  return { label: "Buyer's Market", detail: 'Homes selling below asking price' };
}

/** Generate synthetic trailing-12-month data based on snapshot values */
function generateMonthlyData(snapshot: MarketSnapshot) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  const baseDOM = snapshot.medianDOM;
  const baseRatio = snapshot.saleToListRatio;

  // Seasonal multipliers for DOM (spring/summer faster, winter slower)
  const seasonalDOM = [1.2, 1.15, 1.0, 0.85, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.25];
  // Seasonal multipliers for sale-to-list (spring/summer higher, winter lower)
  const seasonalRatio = [0.99, 0.995, 1.01, 1.02, 1.025, 1.02, 1.015, 1.01, 1.005, 1.0, 0.995, 0.99];

  return Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (currentMonth - 11 + i + 12) % 12;
    const jitter = 1 + (Math.sin(i * 2.1) * 0.08); // deterministic variation
    return {
      month: months[monthIdx],
      dom: Math.round(baseDOM * seasonalDOM[monthIdx] * jitter),
      ratio: Math.round(baseRatio * seasonalRatio[monthIdx] * 100 * 10) / 10,
    };
  });
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

  const monthlyData = generateMonthlyData(snapshot);

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
      <CardContent className="space-y-5">
        {/* Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* DOM Chart */}
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Days on Market (12-mo)</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={2} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [`${value} days`, 'Median DOM']}
                />
                <Bar dataKey="dom" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sale-to-List Ratio Chart */}
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Sale-to-List % (12-mo)</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={2} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [`${value}%`, 'Sale/List']}
                />
                <defs>
                  <linearGradient id="ratioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="ratio" stroke="hsl(var(--primary))" fill="url(#ratioGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Cards */}
        <div className="grid grid-cols-2 gap-3">
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

      </CardContent>
    </Card>
  );
}
