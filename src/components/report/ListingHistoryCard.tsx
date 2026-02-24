import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListingHistory } from '@/types';
import { History, TrendingDown, AlertTriangle, RotateCcw, Calendar } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

interface ListingHistoryCardProps {
  history: ListingHistory;
  className?: string;
}

export function ListingHistoryCard({ history, className }: ListingHistoryCardProps) {
  const signals = useMemo(() => {
    const s: { icon: typeof History; label: string; detail: string; severity: 'warning' | 'info' | 'positive' }[] = [];

    if (history.wasRelisted) {
      s.push({
        icon: RotateCcw,
        label: 'Re-Listed',
        detail: `This property was previously listed and re-listed — indicates pricing adjustment or changing seller circumstances`,
        severity: 'warning',
      });
    }

    if (history.wasCanceled) {
      s.push({
        icon: AlertTriangle,
        label: 'Previously Canceled',
        detail: 'The prior listing was canceled or withdrawn before selling',
        severity: 'warning',
      });
    }

    if (history.cumulativeDom > 0) {
      s.push({
        icon: Calendar,
        label: `${history.cumulativeDom} Total Days on Market`,
        detail: history.cumulativeDom > 60
          ? 'Extended total market exposure — seller likely motivated to close'
          : history.cumulativeDom > 30
          ? 'Moderate total market time — some negotiation room likely'
          : 'Relatively fresh to market overall',
        severity: history.cumulativeDom > 60 ? 'positive' : 'info',
      });
    }

    if (history.totalPriceDrop > 0 && history.highestPrice > 0) {
      const pct = ((history.totalPriceDrop / history.highestPrice) * 100).toFixed(1);
      s.push({
        icon: TrendingDown,
        label: `${formatCurrency(history.totalPriceDrop)} Price Drop (${pct}%)`,
        detail: `From ${formatCurrency(history.highestPrice)} to ${formatCurrency(history.currentPrice)} across all listings`,
        severity: 'positive',
      });
    }

    return s;
  }, [history]);

  if (signals.length === 0) return null;

  const severityColor = {
    warning: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  };

  const badgeVariant = history.cumulativeDom > 60 || history.wasRelisted
    ? 'destructive'
    : 'secondary';

  return (
    <Card className={`pdf-section pdf-avoid-break ${className || ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <History className="h-5 w-5 text-accent" />
            Listing History
          </span>
          {history.wasRelisted && (
            <Badge variant={badgeVariant as any} className="text-[10px]">
              Re-Listed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timeline */}
        {history.events.length > 0 && (
          <div className="space-y-2">
            {history.events.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    event.action === 'Listed' ? 'bg-accent' :
                    event.action === 'Canceled' || event.action === 'Expired' || event.action === 'Withdrawn' ? 'bg-destructive' :
                    event.action === 'Price Changed' ? 'bg-orange-500' :
                    'bg-muted-foreground'
                  }`} />
                  {idx < history.events.length - 1 && (
                    <div className="w-px h-full bg-border min-h-[16px]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {event.action === 'Listed' && event.price ? `Listed for ${formatCurrency(event.price)}` :
                       event.action === 'Price Changed' && event.price ? `Price changed to ${formatCurrency(event.price)}` :
                       event.action}
                    </span>
                    {event.date && (
                      <span className="text-xs text-muted-foreground">{event.date}</span>
                    )}
                  </div>
                  {event.mlsNumber && event.mlsNumber !== 'CDOM' && (
                    <span className="text-xs text-muted-foreground">MLS# {event.mlsNumber}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Signal summaries */}
        <div className="space-y-2 pt-1 border-t border-border">
          {signals.map((signal, idx) => (
            <div key={idx} className={`flex items-start gap-3 p-2.5 rounded-lg ${severityColor[signal.severity]}`}>
              <signal.icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{signal.label}</p>
                <p className="text-xs opacity-80">{signal.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
