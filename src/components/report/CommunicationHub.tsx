import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Pin, User, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportNote {
  id: string;
  report_id: string;
  author_type: 'agent' | 'client';
  author_name: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

interface CommunicationHubProps {
  reportId: string;
  isAgent?: boolean;
  className?: string;
}

export function CommunicationHub({ reportId, isAgent = false, className = '' }: CommunicationHubProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<ReportNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [reportId]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('report_notes')
      .select('*')
      .eq('report_id', reportId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data) {
      setNotes(data as ReportNote[]);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newNote.trim()) return;
    if (!isAgent && !authorName.trim()) {
      toast({ title: 'Please enter your name', variant: 'destructive' });
      return;
    }

    setSending(true);
    const { error } = await supabase.from('report_notes').insert({
      report_id: reportId,
      author_type: isAgent ? 'agent' : 'client',
      author_name: isAgent ? 'Agent' : authorName.trim(),
      content: newNote.trim(),
    });

    if (error) {
      toast({ title: 'Failed to send note', variant: 'destructive' });
    } else {
      setNewNote('');
      fetchNotes();
    }
    setSending(false);
  };

  const togglePin = async (noteId: string, currentPinned: boolean) => {
    await supabase
      .from('report_notes')
      .update({ is_pinned: !currentPinned })
      .eq('id', noteId);
    fetchNotes();
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

  return (
    <Card className={`pdf-hide-agent-notes ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-accent" />
          {isAgent ? 'Client Communication' : 'Questions & Notes'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes list */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading notes...</p>
        ) : notes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              {isAgent ? 'No messages yet. Add a note for your client.' : 'Have a question? Leave a note for your agent.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg border ${
                  note.author_type === 'agent'
                    ? 'bg-primary/5 border-primary/10'
                    : 'bg-secondary/50 border-border'
                } ${note.is_pinned ? 'ring-1 ring-accent/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {note.author_type === 'agent' ? (
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium">
                      {note.author_name || (note.author_type === 'agent' ? 'Agent' : 'Client')}
                    </span>
                    {note.is_pinned && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Pin className="h-2.5 w-2.5 mr-0.5" /> Pinned
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{formatTime(note.created_at)}</span>
                    {isAgent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => togglePin(note.id, note.is_pinned)}
                      >
                        <Pin className={`h-3 w-3 ${note.is_pinned ? 'text-accent' : 'text-muted-foreground'}`} />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm">{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="space-y-2 pt-2 border-t">
          {!isAgent && (
            <Input
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="text-sm"
            />
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder={isAgent ? 'Add a note for your client...' : 'Ask a question or leave a note...'}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-sm min-h-[60px] resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
              }}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !newNote.trim()}
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
