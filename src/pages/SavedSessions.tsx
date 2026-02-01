import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Copy, Trash2, Building2, Users, FolderOpen, Calendar, GitCompare, Check, X } from 'lucide-react';
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

const SavedSessions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    refreshSessions();
  }, []);

  const refreshSessions = () => {
    const allSessions = loadSessions().sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    setSessions(allSessions);
  };

  const handleOpen = (session: Session) => {
    if (compareMode) {
      toggleCompareSelection(session.id);
      return;
    }
    sessionStorage.setItem('current_session', JSON.stringify(session));
    if (session.session_type === 'Seller') {
      navigate('/seller/report');
    } else {
      navigate('/buyer/report');
    }
  };

  const handleDuplicate = (session: Session) => {
    const now = new Date().toISOString();
    const duplicated: Session = {
      ...session,
      id: generateId(),
      client_name: `${session.client_name} (Copy)`,
      created_at: now,
      updated_at: now,
    };
    upsertSession(duplicated);
    refreshSessions();
    toast({
      title: "Session duplicated",
      description: `Created a copy of "${session.client_name}"`,
    });
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
        title: "Session deleted",
        description: "The session has been removed.",
      });
    }
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id]; // Keep last selected + new one
      }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2) {
      navigate(`/compare?a=${selectedForCompare[0]}&b=${selectedForCompare[1]}`);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare([]);
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
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Saved Sessions</h1>
                  <p className="text-sm text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? 's' : ''} saved</p>
                </div>
              </div>
            </div>
            
            {/* Compare Actions */}
            {sessions.length >= 2 && (
              <div className="flex items-center gap-2">
                {compareMode ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exitCompareMode}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleCompare}
                      disabled={selectedForCompare.length !== 2}
                      variant="accent"
                    >
                      <GitCompare className="mr-2 h-4 w-4" />
                      Compare ({selectedForCompare.length}/2)
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCompareMode(true)}
                  >
                    <GitCompare className="mr-2 h-4 w-4" />
                    Compare Sessions
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Compare Mode Instructions */}
          {compareMode && (
            <div className="mt-3 p-3 bg-accent/10 rounded-lg text-sm text-muted-foreground">
              Select two sessions to compare side-by-side
            </div>
          )}
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
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">No saved sessions yet</h3>
                  <p className="text-muted-foreground mb-6">Generate a report and click Save Session.</p>
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
                const isSelected = selectedForCompare.includes(session.id);
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`group cursor-pointer transition-all ${
                        compareMode 
                          ? isSelected 
                            ? 'ring-2 ring-accent border-accent' 
                            : 'hover:border-accent/50'
                          : ''
                      }`}
                      onClick={() => compareMode && toggleCompareSelection(session.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {compareMode && (
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected 
                                  ? 'bg-accent border-accent text-accent-foreground' 
                                  : 'border-border'
                              }`}>
                                {isSelected && <Check className="h-4 w-4" />}
                              </div>
                            )}
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
                            </div>
                          </div>
                          {!compareMode && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" size="sm" onClick={() => handleOpen(session)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Open
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDuplicate(session); }} title="Duplicate">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteClick(session.id); }} title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
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
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SavedSessions;
