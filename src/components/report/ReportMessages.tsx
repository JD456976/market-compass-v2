import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportMessage {
  id: string;
  report_id: string;
  sender_role: 'client' | 'agent';
  sender_id: string;
  body: string;
  read_by_client_at: string | null;
  read_by_agent_at: string | null;
  created_at: string;
}

interface ReportMessagesProps {
  reportId: string;
  isAgent?: boolean;
  className?: string;
  authenticatedUserId?: string;
  authenticatedUserName?: string;
}

export function ReportMessages({ reportId, isAgent = false, className = '', authenticatedUserId, authenticatedUserName }: ReportMessagesProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [reportId]);

  useEffect(() => {
    // Mark messages as read when thread is opened
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('report_messages')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as ReportMessage[]);
    }
    setLoading(false);
  };

  const markAsRead = async () => {
    const field = isAgent ? 'read_by_agent_at' : 'read_by_client_at';
    const unreadIds = messages
      .filter(m => !m[field] && m.sender_role !== (isAgent ? 'agent' : 'client'))
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('report_messages')
        .update({ [field]: new Date().toISOString() })
        .in('id', unreadIds);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const effectiveName = authenticatedUserName || senderName.trim();
    if (!isAgent && !effectiveName) {
      toast({ title: 'Please enter your name', variant: 'destructive' });
      return;
    }

    setSending(true);
    const senderId = isAgent ? 'agent' : (authenticatedUserId || effectiveName || 'client');

    const { error } = await supabase.from('report_messages').insert({
      report_id: reportId,
      sender_role: isAgent ? 'agent' : 'client',
      sender_id: senderId,
      body: newMessage.trim(),
      ...(isAgent ? { read_by_agent_at: new Date().toISOString() } : { read_by_client_at: new Date().toISOString() }),
    });

    if (error) {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } else {
      // Send email notification via edge function
      try {
        const notifPayload = {
          type: isAgent ? 'agent_reply' : 'client_message',
          report_id: reportId,
          sender_name: senderId,
          message_snippet: newMessage.trim().slice(0, 200),
          report_url: window.location.href,
        };
        supabase.functions.invoke('report-notifications', { body: notifPayload }).catch(() => {});
      } catch {
        // Non-blocking
      }
      setNewMessage('');
      fetchMessages();
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = messages.filter(m => {
    if (isAgent) return !m.read_by_agent_at && m.sender_role === 'client';
    return !m.read_by_client_at && m.sender_role === 'agent';
  }).length;

  return (
    <Card className={`pdf-hide-agent-notes ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-accent" />
          {isAgent ? 'Client Messages' : 'Messages'}
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-accent/10 text-accent-foreground text-[10px]">
              {unreadCount} unread
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              {isAgent ? 'No messages yet.' : 'Have a question? Send a message to your agent.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border ${
                  msg.sender_role === 'agent'
                    ? 'bg-primary/5 border-primary/10 ml-4'
                    : 'bg-secondary/50 border-border mr-4'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {msg.sender_role === 'agent' ? (
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium">
                      {msg.sender_role === 'agent' ? 'Agent' : msg.sender_id}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input area */}
        <div className="space-y-2 pt-2 border-t">
          {!isAgent && !authenticatedUserId && (
            <Input
              placeholder="Your name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="text-sm"
            />
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder={isAgent ? 'Reply to your client...' : 'Ask a question or leave a note...'}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="text-sm min-h-[60px] resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
              }}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Press ⌘+Enter to send</p>
        </div>
      </CardContent>
    </Card>
  );
}
