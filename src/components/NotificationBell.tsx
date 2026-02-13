import { useState, useEffect, useCallback } from 'react';
import { Bell, MessageSquare, FileText, Layers, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface NotificationItem {
  id: string;
  type: 'message' | 'report' | 'scenario';
  title: string;
  subtitle: string;
  timestamp: string;
  reportId?: string;
}

interface NotificationBellProps {
  role: 'agent' | 'client';
  viewerId?: string;
}

export function NotificationBell({ role, viewerId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const items: NotificationItem[] = [];

    if (role === 'agent') {
      const { data: messages } = await supabase
        .from('report_messages')
        .select('id, body, sender_id, created_at, report_id, read_by_agent_at')
        .eq('sender_role', 'client')
        .is('read_by_agent_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: scenarios } = await supabase
        .from('report_scenarios')
        .select('id, report_id, title, submitted_at, created_at')
        .eq('submitted_to_agent', true)
        .eq('reviewed_status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(10);

      const reportIds = [
        ...new Set([
          ...(messages?.map(m => m.report_id) || []),
          ...(scenarios?.map(s => s.report_id) || []),
        ]),
      ];

      let sessionMap = new Map<string, string>();
      if (reportIds.length > 0) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, client_name')
          .in('id', reportIds);
        sessionMap = new Map(sessions?.map(s => [s.id, s.client_name]) || []);
      }

      messages?.forEach(m => {
        items.push({ id: m.id, type: 'message', title: 'New client message', subtitle: sessionMap.get(m.report_id) || 'Report', timestamp: m.created_at, reportId: m.report_id });
      });

      scenarios?.forEach(s => {
        items.push({ id: s.id, type: 'scenario', title: s.title || 'New scenario submitted', subtitle: sessionMap.get(s.report_id) || 'Report', timestamp: s.submitted_at || s.created_at, reportId: s.report_id });
      });
    } else if (role === 'client' && viewerId) {
      const { data: views } = await supabase
        .from('shared_report_views')
        .select('report_id')
        .eq('viewer_id', viewerId);

      const reportIds = [...new Set(views?.map(v => v.report_id) || [])];
      if (reportIds.length === 0) {
        setNotifications([]);
        return;
      }

      const { data: messages } = await supabase
        .from('report_messages')
        .select('id, body, created_at, report_id, read_by_client_at')
        .eq('sender_role', 'agent')
        .is('read_by_client_at', null)
        .in('report_id', reportIds)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: scenarios } = await supabase
        .from('report_scenarios')
        .select('id, report_id, title, reviewed_status, reviewed_at, created_at')
        .eq('created_by_role', 'client')
        .in('reviewed_status', ['accepted', 'needs_changes'])
        .in('report_id', reportIds)
        .order('reviewed_at', { ascending: false })
        .limit(10);

      const allIds = [
        ...new Set([
          ...(messages?.map(m => m.report_id) || []),
          ...(scenarios?.map(s => s.report_id) || []),
        ]),
      ];

      let sessionMap = new Map<string, string>();
      if (allIds.length > 0) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, client_name')
          .in('id', allIds);
        sessionMap = new Map(sessions?.map(s => [s.id, s.client_name]) || []);
      }

      messages?.forEach(m => {
        items.push({ id: m.id, type: 'message', title: 'New message from agent', subtitle: sessionMap.get(m.report_id) || 'Report', timestamp: m.created_at, reportId: m.report_id });
      });

      scenarios?.forEach(s => {
        items.push({ id: s.id, type: 'scenario', title: `Scenario ${s.reviewed_status === 'accepted' ? 'accepted' : 'needs changes'}`, subtitle: sessionMap.get(s.report_id) || 'Report', timestamp: s.reviewed_at || s.created_at, reportId: s.report_id });
      });
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(items);
  }, [role, viewerId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const messagesChannel = supabase
      .channel(`notif-bell-messages-${role}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'report_messages' }, () => { fetchNotifications(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'report_messages' }, () => { fetchNotifications(); })
      .subscribe();

    const scenariosChannel = supabase
      .channel(`notif-bell-scenarios-${role}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'report_scenarios' }, () => { fetchNotifications(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'report_scenarios' }, () => { fetchNotifications(); })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(scenariosChannel);
    };
  }, [role, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setClearing(true);
    const now = new Date().toISOString();
    const readField = role === 'agent' ? 'read_by_agent_at' : 'read_by_client_at';
    const senderRole = role === 'agent' ? 'client' : 'agent';

    // Mark all unread messages as read
    const messageIds = notifications.filter(n => n.type === 'message').map(n => n.id);
    if (messageIds.length > 0) {
      await supabase
        .from('report_messages')
        .update({ [readField]: now })
        .eq('sender_role', senderRole)
        .is(readField, null)
        .in('id', messageIds);
    }

    // For agent: mark pending scenarios as reviewed (dismissed)
    if (role === 'agent') {
      const scenarioIds = notifications.filter(n => n.type === 'scenario').map(n => n.id);
      if (scenarioIds.length > 0) {
        // Don't auto-accept/reject—just clear from notification list by not changing status
        // We just clear the local state
      }
    }

    setNotifications([]);
    setClearing(false);
  };

  const handleClearAll = () => {
    // Clear local state only (notifications will re-appear on next fetch if still unread)
    setNotifications([]);
  };

  const count = notifications.length;

  const iconForType = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-3.5 w-3.5 text-accent" />;
      case 'scenario': return <Layers className="h-3.5 w-3.5 text-primary" />;
      default: return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={`Notifications${count > 0 ? ` (${count} new)` : ''}`}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-1 animate-in fade-in zoom-in duration-200">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[400px] overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-serif font-semibold">Notifications</p>
          {count > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
                disabled={clearing}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark All Read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                onClick={handleClearAll}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All caught up</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[320px] divide-y divide-border/50">
            {notifications.slice(0, 15).map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-default">
                <div className="p-1.5 rounded-full bg-secondary/50 shrink-0 mt-0.5">
                  {iconForType(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{n.subtitle}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {formatTime(n.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
