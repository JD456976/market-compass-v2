import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Users, Send, Calendar, Link2, ExternalLink, FileDown, Loader2, Eye, Clock } from 'lucide-react';
import { Session } from '@/types';
import { useSharedSessions } from '@/hooks/useSessions';
import { useBatchViewStats, useReportViewNotifications } from '@/hooks/useReportViewStats';
import { useToast } from '@/hooks/use-toast';
import { formatLocation } from '@/lib/utils';
import { exportReportToPdf } from '@/lib/pdfExport';
import { calculateSellerReport, calculateBuyerReport } from '@/lib/scoring';
import { getMarketProfileByIdFromSupabase } from '@/lib/supabaseStorage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SharedReports = () => {
  const { toast } = useToast();
  const { sessions, loading } = useSharedSessions();
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Get report IDs for view stats and real-time notifications
  const reportIds = useMemo(() => sessions.map(s => s.id), [sessions]);
  const { stats: viewStats, loading: loadingStats } = useBatchViewStats(reportIds);
  
  // Enable real-time notifications when reports are viewed
  useReportViewNotifications(reportIds);

  const handleCopyLink = (session: Session) => {
    const url = `${window.location.origin}/share/${session.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard.",
    });
  };

  const handleExportPdf = async (session: Session) => {
    setExportingId(session.id);
    try {
      // Get market profile if available
      let marketProfile = undefined;
      if (session.selected_market_profile_id) {
        marketProfile = await getMarketProfileByIdFromSupabase(session.selected_market_profile_id) || undefined;
      }
      
      // Calculate report data for timestamp
      const reportData = session.session_type === 'Seller'
        ? calculateSellerReport(session, marketProfile)
        : calculateBuyerReport(session, marketProfile);
      
      // Create a temporary hidden element to render the report for PDF
      const tempContainer = document.createElement('div');
      tempContainer.id = 'pdf-export-temp';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '794px';
      tempContainer.innerHTML = `
        <div class="pdf-section" style="padding: 20px; font-family: system-ui, sans-serif;">
          <h2 style="margin: 0 0 8px; font-size: 18px;">${session.session_type} Report</h2>
          <p style="margin: 0 0 4px; color: #666;">Prepared for: ${session.client_name}</p>
          <p style="margin: 0 0 16px; color: #666;">Location: ${formatLocation(session.location)}</p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            Please open the full shared report link for detailed content.
          </p>
        </div>
      `;
      document.body.appendChild(tempContainer);
      
      await exportReportToPdf('pdf-export-temp', {
        clientName: session.client_name,
        reportType: session.session_type === 'Seller' ? 'Seller' : 'Buyer',
        snapshotTimestamp: reportData.snapshotTimestamp,
        isClientMode: true,
      });
      
      document.body.removeChild(tempContainer);
      
      toast({
        title: "PDF exported",
        description: "Your report has been downloaded.",
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export failed",
        description: "Could not generate PDF. Please try opening the shared report link instead.",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
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
    return formatDate(dateString);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shared reports...</p>
        </div>
      </div>
    );
  }

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
                          <div className="flex gap-2 mt-2 flex-wrap items-center">
                            {getStatusBadges(session)}
                            {/* View stats */}
                            {viewStats.get(session.id) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Eye className="h-3 w-3" />
                                      {viewStats.get(session.id)!.totalViews}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      {viewStats.get(session.id)!.totalViews} view{viewStats.get(session.id)!.totalViews !== 1 ? 's' : ''}
                                      {viewStats.get(session.id)!.lastViewedAt && (
                                        <><br />Last: {formatRelativeTime(viewStats.get(session.id)!.lastViewedAt!)}</>
                                      )}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleExportPdf(session)}
                            disabled={exportingId === session.id}
                            title="Export PDF"
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
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
