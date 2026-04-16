import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, Layers, Star, Clock, Activity } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface TimelineEvent {
  id: string;
  type: 'view' | 'message' | 'scenario' | 'feedback';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ClientActivityTimelineProps {
  reportId: string;
  className?: string;
}

export function ClientActivityTimeline({ reportId, className }: ClientActivityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      const [viewsRes, messagesRes, scenariosRes, feedbackRes] = await Promise.all([
        supabase
          .from('shared_report_views')
          .select('id, viewed_at, device_type, viewer_id')
          .eq('report_id', reportId)
          .order('viewed_at', { ascending: false })
          .limit(20),
        supabase
          .from('report_messages')
          .select('id, created_at, sender_role, body')
          .eq('report_id', reportId)
          .eq('sender_role', 'client')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('report_scenarios')
          .select('id, created_at, title, reviewed_status, submitted_to_agent')
          .eq('report_id', reportId)
          .eq('created_by_role', 'client')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('report_feedback')
          .select('id, created_at, rating, comment')
          .eq('report_id', reportId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const allEvents: TimelineEvent[] = [];

      (viewsRes.data || []).forEach(v => {
        allEvents.push({
          id: `view-${v.id}`,
          type: 'view',
          description: `Viewed report${v.device_type ? ` on ${v.device_type}` : ''}`,
          timestamp: v.viewed_at,
        });
      });

      (messagesRes.data || []).forEach(m => {
        allEvents.push({
          id: `msg-${m.id}`,
          type: 'message',
          description: m.body.length > 60 ? m.body.substring(0, 60) + '…' : m.body,
          timestamp: m.created_at,
        });
      });

      (scenariosRes.data || []).forEach(s => {
        const statusText = s.submitted_to_agent
          ? `Submitted "${s.title || 'Untitled'}" for review`
          : `Saved scenario "${s.title || 'Untitled'}"`;
        allEvents.push({
          id: `scenario-${s.id}`,
          type: 'scenario',
          description: statusText,
          timestamp: s.created_at,
          metadata: { reviewed_status: s.reviewed_status },
        });
      });

      (feedbackRes.data || []).forEach(f => {
        allEvents.push({
          id: `feedback-${f.id}`,
          type: 'feedback',
          description: `Rated ${f.rating}${f.comment ? `: "${f.comment.substring(0, 40)}…"` : ''}`,
          timestamp: f.created_at,
        });
      });

      // Sort by timestamp descending
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Group consecutive "Viewed report" events on the same day to reduce noise
      const grouped: TimelineEvent[] = [];
      let pendingViewGroup: { count: number; latest: TimelineEvent } | null = null;

      for (const event of allEvents) {
        if (event.type === 'view') {
          if (pendingViewGroup) {
            const latestDate = new Date(pendingViewGroup.latest.timestamp).toDateString();
            const currentDate = new Date(event.timestamp).toDateString();
            if (latestDate === currentDate) {
              pendingViewGroup.count++;
              continue;
            } else {
              // Flush previous group
              if (pendingViewGroup.count > 1) {
                pendingViewGroup.latest.description = `Viewed report ${pendingViewGroup.count} times`;
              }
              grouped.push(pendingViewGroup.latest);
            }
          }
          pendingViewGroup = { count: 1, latest: event };
        } else {
          if (pendingViewGroup) {
            if (pendingViewGroup.count > 1) {
              pendingViewGroup.latest.description = `Viewed report ${pendingViewGroup.count} times`;
            }
            grouped.push(pendingViewGroup.latest);
            pendingViewGroup = null;
          }
          grouped.push(event);
        }
      }
      if (pendingViewGroup) {
        if (pendingViewGroup.count > 1) {
          pendingViewGroup.latest.description = `Viewed report ${pendingViewGroup.count} times`;
        }
        grouped.push(pendingViewGroup.latest);
      }

      setEvents(grouped.slice(0, 25));
      setLoading(false);
    };

    fetchActivity();
  }, [reportId]);

  const iconMap = {
    view: Eye,
    message: MessageSquare,
    scenario: Layers,
    feedback: Star,
  };

  const colorMap = {
    view: 'text-muted-foreground',
    message: 'text-accent',
    scenario: 'text-primary',
    feedback: 'text-amber-500',
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Client Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Client Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center">
            <Clock className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No client activity yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Client Activity
          <Badge variant="secondary" className="text-[10px] ml-1">{events.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {events.map((event) => {
              const Icon = iconMap[event.type];
              return (
                <div key={event.id} className="flex items-start gap-3 relative">
                  <div className={`z-10 p-1.5 rounded-full bg-background border border-border shrink-0 ${colorMap[event.type]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm text-foreground leading-snug">{event.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
