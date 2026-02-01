import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Copy, Trash2, Building2, Users, Send, Calendar, Link2, FileDown, Check, X } from 'lucide-react';
import { Session } from '@/types';
import { loadSessions, upsertSession, deleteSession, generateId } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { formatLocation } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ClientDeliverables = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    refreshSessions();
  }, []);

  const refreshSessions = () => {
    // Only show sessions that have been shared or exported
    const allSessions = loadSessions()
      .filter(s => s.share_link_created || s.pdf_exported)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setSessions(allSessions);
  };

  const handleOpen = (session: Session) => {
    sessionStorage.setItem('current_session', JSON.stringify(session));
    if (session.session_type === 'Seller') {
      navigate('/seller/report');
    } else {
      navigate('/buyer/report');
    }
  };

  const handleCopyLink = async (session: Session) => {
    const shareUrl = `${window.location.origin}/share/${session.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setSessionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (sessionToDelete) {
      deleteSession(sessionToDelete);
      refreshSessions();
      toast({
        title: "Deliverable removed",
        description: "The report has been removed from deliverables.",
      });
    }
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeliverableStatus = (session: Session) => {
    const statuses: string[] = [];
    if (session.share_link_created) statuses.push('Shared');
    if (session.pdf_exported) statuses.push('PDF Exported');
    return statuses;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Client Deliverables</h1>
                  <p className="text-sm text-muted-foreground">{sessions.length} report{sessions.length !== 1 ? 's' : ''} shared or exported</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {sessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Send className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">No deliverables yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    When you share a report link or export a PDF, it will appear here for easy tracking.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link to="/seller">
                      <Button variant="outline">
                        <Building2 className="mr-2 h-4 w-4" />
                        New Seller Report
                      </Button>
                    </Link>
                    <Link to="/buyer">
                      <Button variant="outline">
                        <Users className="mr-2 h-4 w-4" />
                        New Buyer Report
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {sessions.map((session, index) => {
                const statuses = getDeliverableStatus(session);
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${session.session_type === 'Seller' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                              {session.session_type === 'Seller' ? (
                                <Building2 className="h-6 w-6 text-primary" />
                              ) : (
                                <Users className="h-6 w-6 text-accent" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-serif text-lg font-semibold">{session.client_name}</h3>
                                <Badge variant={session.session_type === 'Seller' ? 'default' : 'accent'}>
                                  {session.session_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{formatLocation(session.location)}</span>
                                <span>•</span>
                                <span>{session.property_type}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(session.updated_at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {statuses.map((status) => (
                                  <Badge key={status} variant="outline" className="text-xs">
                                    {status === 'Shared' && <Link2 className="mr-1 h-3 w-3" />}
                                    {status === 'PDF Exported' && <FileDown className="mr-1 h-3 w-3" />}
                                    {status}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="sm" onClick={() => handleOpen(session)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Open
                            </Button>
                            {session.share_link_created && (
                              <Button variant="ghost" size="icon" onClick={() => handleCopyLink(session)} title="Copy Link">
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(session.id)} title="Remove">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Deliverable</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the report from this list. The saved session will remain in Saved Sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientDeliverables;
