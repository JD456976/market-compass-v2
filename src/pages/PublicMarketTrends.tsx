import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, ArrowUpRight, ArrowDownRight, Minus, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { loadMarketSnapshots, MarketSnapshot, getMarketContext } from '@/lib/marketSnapshots';

interface MarketSummary {
  city: string;
  snapshot: MarketSnapshot;
  context: ReturnType<typeof getMarketContext>;
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getMarketTemp(domMedian: number): { label: string; color: string } {
  if (domMedian < 20) return { label: 'Hot', color: 'bg-destructive/10 text-destructive' };
  if (domMedian < 40) return { label: 'Warm', color: 'bg-accent/10 text-accent-foreground' };
  if (domMedian < 60) return { label: 'Balanced', color: 'bg-primary/10 text-primary' };
  return { label: 'Cool', color: 'bg-muted text-muted-foreground' };
}

export default function PublicMarketTrends() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);

  useEffect(() => {
    const snapshots = loadMarketSnapshots();
    const summaries: MarketSummary[] = snapshots.map((snapshot) => ({
      city: snapshot.location,
      snapshot,
      context: getMarketContext(snapshot),
    }));
    setMarkets(summaries);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Activity className="h-6 w-6 text-accent" />
              <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-0">
                Public Market Data
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-sans font-bold mb-3">
              Real Estate Market Trends
            </h1>
            <p className="text-primary-foreground/70 max-w-lg mx-auto">
              Anonymized market condition snapshots across major metros. 
              Updated regularly to reflect current trends.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl -mt-6">
        {/* Market Cards Grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {markets.map((market, i) => {
            const temp = getMarketTemp(market.snapshot.medianDOM);
            const saleTrend = market.snapshot.saleToListRatio >= 1.0 ? 'up' : market.snapshot.saleToListRatio >= 0.97 ? 'stable' : 'down';
            
            return (
              <motion.div
                key={market.snapshot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-accent" />
                        <CardTitle className="text-base font-sans">{market.city}</CardTitle>
                      </div>
                      <Badge variant="outline" className={`text-xs ${temp.color}`}>
                        {temp.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg bg-secondary/50">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Median DOM</p>
                        <p className="text-lg font-sans font-bold">{market.snapshot.medianDOM}</p>
                        <p className="text-[10px] text-muted-foreground">days</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Sale/List</p>
                          <TrendIndicator trend={saleTrend} />
                        </div>
                        <p className="text-lg font-sans font-bold">
                          {(market.snapshot.saleToListRatio * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-secondary/50">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Competition</p>
                        <p className="text-sm font-semibold capitalize">{market.context.competitionContext}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        {market.context.speedContext === 'faster' 
                          ? '⚡ Fast-moving market — properties sell quickly'
                          : market.context.speedContext === 'slower'
                          ? '🐌 Slower market — more time for decisions'
                          : '⏱ Average pace — typical transaction timelines'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <Card className="mt-8 border-dashed">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground text-center">
              Data is anonymized and derived from publicly available market indicators. 
              This information is for educational purposes only and does not constitute real estate advice. 
              Actual market conditions may vary. Contact a licensed real estate professional for specific guidance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
