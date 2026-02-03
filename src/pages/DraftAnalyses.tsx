import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Copy, Building2, Users, FileEdit, Calendar, GitCompare, Check, X, Loader2 } from 'lucide-react';
import { Session } from '@/types';
import { useDraftSessions } from '@/hooks/useSessions';
import { useToast } from '@/hooks/use-toast';
import { formatLocation } from '@/lib/utils';
import { SwipeableCard } from '@/components/SwipeableCard';

const DraftAnalyses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessions, loading, upsertSession, deleteSession } = useDraftSessions();
  
  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const handleOpen = (session: Session) => {
    if (compareMode) {
      toggleCompareSelection(session.id);
      return;
    }
    // Store entry context for back navigation
    sessionStorage.setItem('report_entry_context', '/drafts');
    sessionStorage.setItem('current_session', JSON.stringify(session));
    if (session.session_type === 'Seller') {
      navigate('/seller/report');
    } else {
      navigate('/buyer/report');
    }
  };

  const handleDuplicate = async (session: Session) => {
    const now = new Date().toISOString();
    // Clean up duplicate naming - remove existing "(Copy)" suffixes
    const baseName = session.client_name.replace(/\s*\(Copy\)+$/g, '');
    const duplicated: Session = {
      ...session,
      id: crypto.randomUUID(),
      client_name: `${baseName} (Copy)`,
      share_link_created: false,
      pdf_exported: false,
      created_at: now,
      updated_at: now,
    };
    await upsertSession(duplicated);
    toast({
      title: "Draft duplicated",
      description: `Created a copy of "${baseName}"`,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    toast({
      title: "Draft deleted",
      description: "The draft has been removed.",
    });
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
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
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileEdit className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-serif font-bold">Draft Analyses</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">{sessions.length} draft{sessions.length !== 1 ? 's' : ''}</p>
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
                      className="min-h-[44px]"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleCompare}
                      disabled={selectedForCompare.length !== 2}
                      variant="accent"
                      className="min-h-[44px]"
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
                    className="min-h-[44px]"
                  >
                    <GitCompare className="mr-2 h-4 w-4" />
                    Compare
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Compare Mode Instructions */}
          {compareMode && (
            <div className="mt-3 p-3 bg-accent/10 rounded-lg text-sm text-muted-foreground">
              Tap two drafts to compare side-by-side
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Swipe hint for mobile */}
        <p className="text-xs text-muted-foreground mb-4 sm:hidden">
          ← Swipe left to delete
        </p>

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
                    <FileEdit className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">No drafts yet</h3>
                  <p className="text-muted-foreground mb-6">Generate a report and save it as a draft.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pb-safe">
                    <Link to="/seller" className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full min-h-[44px]">
                        <Building2 className="mr-2 h-4 w-4" />
                        New Seller Analysis
                      </Button>
                    </Link>
                    <Link to="/buyer" className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full min-h-[44px]">
                        <Users className="mr-2 h-4 w-4" />
                        New Buyer Analysis
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-3"
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
                    transition={{ delay: index * 0.03 }}
                  >
                    <SwipeableCard onDelete={() => handleDelete(session.id)}>
                      <Card 
                        className={`cursor-pointer transition-all ${
                          compareMode 
                            ? isSelected 
                              ? 'ring-2 ring-accent border-accent' 
                              : 'hover:border-accent/50'
                            : ''
                        }`}
                        onClick={() => handleOpen(session)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {compareMode && (
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isSelected 
                                  ? 'bg-accent border-accent text-accent-foreground' 
                                  : 'border-border'
                              }`}>
                                {isSelected && <Check className="h-4 w-4" />}
                              </div>
                            )}
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
                            </div>
                            {!compareMode && (
                              <div className="flex gap-1 shrink-0">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => { e.stopPropagation(); handleOpen(session); }} 
                                  title="Open"
                                  className="min-h-[44px] min-w-[44px]"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => { e.stopPropagation(); handleDuplicate(session); }} 
                                  title="Duplicate"
                                  className="min-h-[44px] min-w-[44px]"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </SwipeableCard>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DraftAnalyses;
