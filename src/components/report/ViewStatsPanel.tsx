import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Monitor, Smartphone, Tablet, Clock, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useReportViewStats } from '@/hooks/useReportViewStats';

interface ViewStatsPanelProps {
  reportId: string;
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone className="h-3.5 w-3.5" />;
  if (type === 'tablet') return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

export function ViewStatsPanel({ reportId }: ViewStatsPanelProps) {
  const { stats, loading } = useReportViewStats(reportId);
  const [expanded, setExpanded] = useState(false);

  if (loading || !stats || stats.totalViews === 0) return null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Device breakdown
  const deviceCounts = stats.recentViews.reduce<Record<string, number>>((acc, v) => {
    const type = v.device_type || 'desktop';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="pdf-hide-agent-notes border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            View Analytics
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 px-2 text-xs"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {/* Summary Row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{stats.totalViews}</span>
            <span className="text-muted-foreground">view{stats.totalViews !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-border">•</span>
          <span className="text-muted-foreground text-xs">
            {stats.uniqueViewers} unique viewer{stats.uniqueViewers !== 1 ? 's' : ''}
          </span>
          {stats.lastViewedAt && (
            <>
              <span className="text-border">•</span>
              <span className="text-muted-foreground text-xs">
                Last: {formatTime(stats.lastViewedAt)}
              </span>
            </>
          )}
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Device Breakdown */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(deviceCounts).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs gap-1">
                  <DeviceIcon type={type} />
                  {type} ({count})
                </Badge>
              ))}
            </div>

            {/* Recent Views Timeline */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Recent Activity</p>
              {stats.recentViews.slice(0, 5).map((view, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DeviceIcon type={view.device_type} />
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(view.viewed_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
