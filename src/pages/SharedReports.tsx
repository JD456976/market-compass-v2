import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Users, Send, Calendar, Link2, ExternalLink, GitCompare } from 'lucide-react';
import { Session } from '@/types';
import { loadSessions } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { formatLocation } from '@/lib/utils';

const SharedReports = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    // Only show sessions that have been shared or exported
    const allSessions = loadSessions()
      .filter(s => s.share_link_created || s.pdf_exported)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setSessions(allSessions);
  }, []);

  const handleCopyLink = (session: Session) => {
    const url = `${window.location.origin}/share/${session.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard.",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadges = (session: Session) => {
    const badges = [];
    if (session.share_link_created) {
      badges.push(
        <Badge key="shared" variant="success" className="text-xs">
          <Link2 className="h-3 w-3 mr-1" />
          Shared
        </Badge>
      );
    }
    if (session.pdf_exported) {
      badges.push(
        <Badge key="pdf" variant="secondary" className="text-xs">
          PDF
        </Badge>
      );
    }
    return badges;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Send className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold">Shared Reports</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {sessions.length} report{sessions.length !== 1 ? 's' : ''} shared
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <AnimatePresence mode="wait">
          {sessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Send className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">No shared reports yet</h3>
                  <p className="text-muted-foreground mb-2">
                    Reports you share or export will appear here.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Switch to <span className="font-medium">Client mode</span> in a report to share or export.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${session.session_type === 'Seller' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                          {session.session_type === 'Seller' ? (
                            <Building2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Users className="h-5 w-5 text-accent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-serif font-semibold truncate">{session.client_name}</h3>
                            <Badge variant={session.session_type === 'Seller' ? 'default' : 'accent'} className="text-xs shrink-0">
                              {session.session_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="truncate">{formatLocation(session.location)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Calendar className="h-3 w-3" />
                              {formatDate(session.updated_at)}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {getStatusBadges(session)}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {session.share_link_created && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleCopyLink(session)} 
                              title="Copy share link"
                              className="min-h-[44px] min-w-[44px]"
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Link to={`/share/${session.id}`} target="_blank">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Open shared report"
                              className="min-h-[44px] min-w-[44px]"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SharedReports;
