import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { useMortgageRate } from '@/hooks/useMortgageRate';
import { SignalBadge } from './SignalBadge';

export function MortgageRateCard() {
  const { data, loading, error } = useMortgageRate();

  if (error || (!loading && !data?.current_rate)) return null;

  const TrendIcon = data?.trend === 'rising' ? TrendingUp 
    : data?.trend === 'falling' ? TrendingDown 
    : Minus;
  
  const trendColor = data?.trend === 'rising' ? 'text-destructive' 
    : data?.trend === 'falling' ? 'text-emerald-600'
    : 'text-muted-foreground';

  const trendLabel = data?.trend === 'rising' ? 'Rising' 
    : data?.trend === 'falling' ? 'Falling' 
    : 'Stable';

  return (
    <Card className="border-accent/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">30-Year Fixed Mortgage Rate</CardTitle>
          <SignalBadge source="fred" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : data?.current_rate ? (
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold tracking-tight">{data.current_rate.toFixed(2)}%</span>
              <div className={`flex items-center gap-1 text-sm ${trendColor} mb-1`}>
                <TrendIcon className="h-4 w-4" />
                <span className="font-medium">{trendLabel}</span>
                {data.previous_rate && (
                  <span className="text-muted-foreground text-xs">
                    from {data.previous_rate.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            
            {/* Mini sparkline using simple bars */}
            {data.history.length > 1 && (
              <div className="flex items-end gap-0.5 h-8">
                {data.history.map((point, i) => {
                  const min = Math.min(...data.history.map(h => h.rate));
                  const max = Math.max(...data.history.map(h => h.rate));
                  const range = max - min || 1;
                  const height = ((point.rate - min) / range) * 100;
                  const isLast = i === data.history.length - 1;
                  return (
                    <div
                      key={point.date}
                      className={`flex-1 rounded-sm transition-all ${isLast ? 'bg-accent' : 'bg-muted-foreground/20'}`}
                      style={{ height: `${Math.max(15, height)}%` }}
                      title={`${point.date}: ${point.rate}%`}
                    />
                  );
                })}
              </div>
            )}
            
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>As of {data.as_of_date}</span>
              <a 
                href={data.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {data.source}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
