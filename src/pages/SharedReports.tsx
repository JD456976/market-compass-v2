import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Users, Send, Calendar, Link2, ExternalLink, FileDown, Loader2, Eye, Archive, ArchiveRestore, Search, Trash2, GitCompare, CheckSquare, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NotificationPrePrompt } from '@/components/NotificationPrePrompt';
import { Session } from '@/types';
import { useSharedSessions } from '@/hooks/useSessions';
import { useBatchViewStats, useReportViewNotifications } from '@/hooks/useReportViewStats';
import { useToast } from '@/hooks/use-toast';
import { formatLocation } from '@/lib/utils';
import { getShareUrl } from '@/lib/shareUrl';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SwipeableCard } from '@/components/SwipeableCard';
import { Checkbox } from '@/components/ui/checkbox';

const SharedReports = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sessions, loading, activeSessions, archivedSessions, archiveSession, unarchiveSession, deleteSession } = useSharedSessions();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Seller' | 'Buyer' | 'touring_brief'>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [confirmBulkAction, setConfirmBulkAction] = useState<'archive' | 'delete' | null>(null);

  // Filtered sessions
  const filteredActive = useMemo(() => {
    return activeSessions.filter(s => {
      const matchesSearch = !searchTerm || 
        s.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || s.session_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activeSessions, searchTerm, typeFilter]);

  const filteredArchived = useMemo(() => {
    return archivedSessions.filter(s => {
      const matchesSearch = !searchTerm || 
        s.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || s.session_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [archivedSessions, searchTerm, typeFilter]);

  // Get report IDs for view stats and real-time notifications
  const reportIds = useMemo(() => sessions.map(s => s.id), [sessions]);
  const { stats: viewStats, loading: loadingStats } = useBatchViewStats(reportIds);
  
  // Enable real-time notifications when reports are viewed
  useReportViewNotifications(reportIds);

  // Enable push notifications for agent
  const { showPrePrompt, confirmPermission, dismissPrePrompt } = usePushNotifications('agent', reportIds);

  const handleCopyLink = (session: Session) => {
    const token = (session as any).share_token || session.id;
    const url = getShareUrl(token);
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard.",
    });
  };

  const handleArchive = async (session: Session) => {
    await archiveSession(session.id);
    toast({
      title: "Report archived",
      description: `"${session.client_name}" moved to Archived.`,
    });
  };

  const handleDeleteArchived = async (session: Session) => {
    await deleteSession(session.id);
    toast({
      title: "Report deleted",
      description: `"${session.client_name}" has been permanently deleted.`,
    });
  };

  const handleUnarchive = async (session: Session) => {
    await unarchiveSession(session.id);
    toast({
      title: "Report restored",
      description: `"${session.client_name}" moved back to Active.`,
    });
  };

  const toggleCompareSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedIds.length < 2) return;
    navigate(`/compare?a=${selectedIds[0]}&b=${selectedIds[1]}&from=/shared-reports`);
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const currentList = activeTab === 'active' ? filteredActive : filteredArchived;
  const allCurrentSelected = currentList.length > 0 && currentList.every(s => bulkSelectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setBulkSelectedIds(prev => prev.filter(id => !currentList.some(s => s.id === id)));
    } else {
      setBulkSelectedIds(prev => [...new Set([...prev, ...currentList.map(s => s.id)])]);
    }
  };

  const handleBulkArchive = async () => {
    setConfirmBulkAction(null);
    const toArchive = bulkSelectedIds.filter(id => activeSessions.some(s => s.id === id));
    for (const id of toArchive) {
      await archiveSession(id);
    }
    toast({ title: `${toArchive.length} report${toArchive.length !== 1 ? 's' : ''} archived` });
    setBulkSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    setConfirmBulkAction(null);
    const toDelete = bulkSelectedIds.filter(id => archivedSessions.some(s => s.id === id));
    for (const id of toDelete) {
      await deleteSession(id);
    }
    toast({ title: `${toDelete.length} report${toDelete.length !== 1 ? 's' : ''} deleted` });
    setBulkSelectedIds([]);
  };

  const handleBulkUnarchive = async () => {
    const toRestore = bulkSelectedIds.filter(id => archivedSessions.some(s => s.id === id));
    for (const id of toRestore) {
      await unarchiveSession(id);
    }
    toast({ title: `${toRestore.length} report${toRestore.length !== 1 ? 's' : ''} restored` });
    setBulkSelectedIds([]);
  };


  const handleExportPdf = async (session: Session) => {
    // Navigate to the full report page which has proper pdf-section markup
    // and let the user export from there with the built-in export button
    sessionStorage.setItem('current_session', JSON.stringify(session));
    sessionStorage.setItem('auto_export_pdf', 'true');
    
    if (session.session_type === 'Seller') {
      navigate('/seller-report');
    } else if (session.session_type === 'touring_brief') {
      navigate('/touring-report');
    } else {
      navigate('/buyer-report');
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

  const renderSessionCard = (session: Session, index: number, isArchived: boolean) => (
    <motion.div
      key={session.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <SwipeableCard
        onDelete={() => isArchived ? handleDeleteArchived(session) : handleArchive(session)}
        deleteLabel={isArchived ? 'Delete' : 'Archive'}
      >
        <Card className={`${compareMode && selectedIds.includes(session.id) ? 'border-accent ring-1 ring-accent/30' : ''} ${bulkMode && bulkSelectedIds.includes(session.id) ? 'border-accent ring-1 ring-accent/30 bg-accent/5' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {bulkMode && (
                <Checkbox
                  checked={bulkSelectedIds.includes(session.id)}
                  onCheckedChange={() => toggleBulkSelect(session.id)}
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {compareMode && !bulkMode && (
                <Checkbox
                  checked={selectedIds.includes(session.id)}
                  onCheckedChange={() => toggleCompareSelect(session.id)}
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className={`p-2.5 rounded-xl shrink-0 ${session.session_type === 'Seller' ? 'bg-primary/10' : session.session_type === 'touring_brief' ? 'bg-violet-500/10' : 'bg-accent/10'}`}>
                {session.session_type === 'Seller' ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : session.session_type === 'touring_brief' ? (
                  <Eye className="h-5 w-5 text-violet-600" />
                ) : (
                  <Users className="h-5 w-5 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-serif font-semibold truncate">{session.client_name}</h3>
                  <Badge variant={session.session_type === 'Seller' ? 'default' : 'accent'} className="text-xs shrink-0">
                    {session.session_type === 'touring_brief' ? 'Touring' : session.session_type}
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
                    onClick={(e) => { e.stopPropagation(); handleCopyLink(session); }} 
                    title="Copy share link"
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => { e.stopPropagation(); handleExportPdf(session); }}
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
                {isArchived ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleUnarchive(session); }}
                      title="Restore"
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleDeleteArchived(session); }}
                      title="Delete permanently"
                      className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleArchive(session); }}
                    title="Archive"
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </SwipeableCard>
    </motion.div>
  );

  const renderEmptyState = (isArchived: boolean) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-dashed border-2">
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            {isArchived ? <Archive className="h-8 w-8 text-muted-foreground" /> : <Send className="h-8 w-8 text-muted-foreground" />}
          </div>
          <h3 className="font-serif text-xl font-semibold mb-2">
            {isArchived ? 'No archived reports' : 'No shared reports yet'}
          </h3>
          <p className="text-muted-foreground">
            {isArchived 
              ? 'Archived reports will appear here.'
              : 'Reports you share or export will appear here.'}
          </p>
          {!isArchived && (
            <p className="text-sm text-muted-foreground mt-2">
              Tap <span className="font-medium">Share</span> on any report to send it to your client.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
                  <p className="text-xs sm:text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <SkeletonList count={4} showBadge />
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
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-accent/10">
                <Send className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold">Shared Reports</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {activeSessions.length} active · {archivedSessions.length} archived
                </p>
              </div>
            </div>
            {sessions.length >= 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={bulkMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setBulkMode(!bulkMode); setBulkSelectedIds([]); if (compareMode) { setCompareMode(false); setSelectedIds([]); } }}
                >
                  <CheckSquare className="h-4 w-4 mr-1.5" />
                  {bulkMode ? 'Cancel' : 'Select'}
                </Button>
                {!bulkMode && activeSessions.length >= 2 && (
                  <>
                    <Button
                      variant={compareMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setCompareMode(!compareMode); setSelectedIds([]); }}
                    >
                      <GitCompare className="h-4 w-4 mr-1.5" />
                      {compareMode ? 'Cancel' : 'Compare'}
                    </Button>
                    {compareMode && selectedIds.length >= 2 && (
                      <Button size="sm" onClick={handleCompare}>
                        Compare {selectedIds.length}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search & Filter Bar */}
        {sessions.length > 0 && (
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or location..."
                className="pl-9 h-11"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v: 'all' | 'Seller' | 'Buyer' | 'touring_brief') => setTypeFilter(v)}>
              <SelectTrigger className="w-[140px] h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Seller">Seller</SelectItem>
                <SelectItem value="Buyer">Buyer</SelectItem>
                <SelectItem value="touring_brief">Touring</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Compare mode hint */}
        {compareMode && (
          <p className="text-xs text-muted-foreground mb-4">
            Select 2–3 reports to compare side by side · {selectedIds.length}/3 selected
          </p>
        )}

        {/* Swipe hint for mobile */}
        {!compareMode && (
          <p className="text-xs text-muted-foreground mb-4 sm:hidden">
            ← Swipe left to {activeTab === 'active' ? 'archive' : 'restore'}
          </p>
        )}

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (bulkMode) setBulkSelectedIds([]); }} className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">
              Active ({activeSessions.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex-1">
              <Archive className="h-4 w-4 mr-1.5" />
              Archived ({archivedSessions.length})
            </TabsTrigger>
          </TabsList>

          {/* Bulk mode select-all bar */}
          {bulkMode && currentList.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <Checkbox
                checked={allCurrentSelected}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {allCurrentSelected ? 'Deselect all' : 'Select all'} ({currentList.length})
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {bulkSelectedIds.length} selected
              </span>
            </div>
          )}

          <TabsContent value="active">
            <AnimatePresence mode="wait">
              {filteredActive.length === 0 
                ? renderEmptyState(false)
                : (
                  <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {filteredActive.map((session, index) => renderSessionCard(session, index, false))}
                  </motion.div>
                )
              }
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="archived">
            <AnimatePresence mode="wait">
              {filteredArchived.length === 0 
                ? renderEmptyState(true)
                : (
                  <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {filteredArchived.map((session, index) => renderSessionCard(session, index, true))}
                  </motion.div>
                )
              }
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky bulk action bar */}
      <AnimatePresence>
        {bulkMode && bulkSelectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm shadow-lg"
          >
            <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {bulkSelectedIds.length} selected
              </span>
              <div className="flex items-center gap-2">
                {activeTab === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmBulkAction('archive')}
                  >
                    <Archive className="h-4 w-4 mr-1.5" />
                    Archive
                  </Button>
                )}
                {activeTab === 'archived' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkUnarchive}
                    >
                      <ArchiveRestore className="h-4 w-4 mr-1.5" />
                      Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmBulkAction('delete')}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action confirmation dialogs */}
      <AlertDialog open={confirmBulkAction === 'archive'} onOpenChange={() => setConfirmBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {bulkSelectedIds.length} report{bulkSelectedIds.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              These reports will be moved to the Archived tab. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkAction === 'delete'} onOpenChange={() => setConfirmBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {bulkSelectedIds.length} report{bulkSelectedIds.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These reports will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NotificationPrePrompt open={showPrePrompt} onConfirm={confirmPermission} onDismiss={dismissPrePrompt} role="agent" />
    </div>
  );
};

export default SharedReports;
