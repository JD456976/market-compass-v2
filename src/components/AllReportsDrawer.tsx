import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDraftSessions, useSharedSessions } from '@/hooks/useSessions';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  Building2, Users, FolderOpen, Send, Eye, FileText,
  ChevronRight, Trash2, Loader2, LayoutList, Hash,
  TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2,
  ClipboardList, Search, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LNRun {
  id: string;
  created_at: string;
  score: number | null;
  property_address: string | null;
  mls_number: string | null;
  listing_label: string | null;
  summary: { critical: number; moderate: number; presentation: number; positive: number } | null;
}

interface AllReportsDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreLabel(score: number | null) {
  if (score === null) return { label: '—', color: 'text-muted-foreground' };
  if (score >= 80) return { label: 'Strong', color: 'text-emerald-600' };
  if (score >= 60) return { label: 'Fair', color: 'text-yellow-600' };
  if (score >= 40) return { label: 'Needs Work', color: 'text-orange-500' };
  return { label: 'Critical', color: 'text-destructive' };
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, count, color }: { icon: React.ElementType; label: string; count?: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <div className={cn('p-1.5 rounded-lg', color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{count}</Badge>
      )}
    </div>
  );
}

// ─── Draft Report Row ─────────────────────────────────────────────────────────
function DraftRow({ session, onNavigate, onDelete }: { session: any; onNavigate: () => void; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const Icon = session.session_type === 'Seller' ? Building2 : Users;
  const color = session.session_type === 'Seller' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-background px-3 py-2.5 hover:bg-muted/30 transition-colors group"
    >
      <div className={cn('p-1.5 rounded-lg shrink-0', color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <button className="flex-1 min-w-0 text-left" onClick={onNavigate}>
        <p className="text-xs font-medium truncate">{session.client_name || session.location || 'Unnamed report'}</p>
        <p className="text-[10px] text-muted-foreground">{session.location} · {relativeDate(session.updated_at)}</p>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">{session.session_type}</Badge>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            setDeleting(true);
            await onDelete();
            setDeleting(false);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
          title="Delete draft"
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />}
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

// ─── Shared Report Row ────────────────────────────────────────────────────────
function SharedRow({ session, onNavigate }: { session: any; onNavigate: () => void }) {
  const Icon = session.session_type === 'Seller' ? Building2 : Users;
  const color = session.session_type === 'Seller' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-background px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onNavigate}
    >
      <div className={cn('p-1.5 rounded-lg shrink-0', color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{session.client_name || session.location || 'Shared report'}</p>
        <p className="text-[10px] text-muted-foreground">{session.location} · Shared {relativeDate(session.updated_at)}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="h-1.5 w-1.5 rounded-full bg-[hsl(142,72%,40%)]" title="Live share link active" />
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

// ─── Listing Audit Row ────────────────────────────────────────────────────────
function AuditRow({ run, onNavigate, onDelete }: { run: LNRun; onNavigate: () => void; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const sl = scoreLabel(run.score);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-background px-3 py-2.5 hover:bg-muted/30 transition-colors group"
    >
      <div className="p-1.5 rounded-lg bg-secondary shrink-0">
        <ClipboardList className="h-3.5 w-3.5 text-secondary-foreground" />
      </div>
      <button className="flex-1 min-w-0 text-left" onClick={onNavigate}>
        <p className="text-xs font-medium truncate">
          {run.listing_label || run.property_address || `Audit ${relativeDate(run.created_at)}`}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {run.mls_number && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Hash className="h-2.5 w-2.5" />{run.mls_number}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{relativeDate(run.created_at)}</span>
          {run.summary && run.summary.critical > 0 && (
            <span className="text-[10px] text-destructive flex items-center gap-0.5">
              <AlertCircle className="h-2.5 w-2.5" />{run.summary.critical} critical
            </span>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1.5 shrink-0">
        {run.score !== null && (
          <span className={cn('text-xs font-bold', sl.color)} title={`Audit Score: ${sl.label}`}>
            {run.score}<span className="text-[9px] font-normal text-muted-foreground">/100</span>
          </span>
        )}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            setDeleting(true);
            await onDelete();
            setDeleting(false);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
          title="Delete audit"
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />}
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export function AllReportsDrawer({ open, onClose }: AllReportsDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { sessions: drafts, deleteSession: deleteDraft } = useDraftSessions();
  const { activeSessions: shared } = useSharedSessions();

  // Listing Navigator runs
  const { data: auditRuns, isLoading: auditsLoading } = useQuery({
    queryKey: ['all-reports-drawer-audits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('listing_navigator_runs')
        .select('id, created_at, score, property_address, mls_number, listing_label, summary')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);
      return (data || []) as LNRun[];
    },
    enabled: !!user && open,
  });

  // Filter logic
  const q = search.toLowerCase();
  const filteredDrafts = useMemo(() => drafts.filter(s =>
    !q || s.client_name?.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q)
  ), [drafts, q]);
  const filteredShared = useMemo(() => shared.filter(s =>
    !q || s.client_name?.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q)
  ), [shared, q]);
  const filteredAudits = useMemo(() => (auditRuns || []).filter(r =>
    !q || r.listing_label?.toLowerCase().includes(q) || r.property_address?.toLowerCase().includes(q) || r.mls_number?.toLowerCase().includes(q)
  ), [auditRuns, q]);

  const deleteAudit = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('listing_navigator_flags').delete().eq('run_id', id);
      await supabase.from('listing_navigator_runs').delete().eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-reports-drawer-audits'] });
      toast({ title: 'Audit deleted' });
    },
  });

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const totalCount = drafts.length + shared.length + (auditRuns?.length ?? 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10">
              <LayoutList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">All Reports</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalCount > 0 ? `${totalCount} item${totalCount !== 1 ? 's' : ''} across all types` : 'No reports yet'}
              </p>
            </div>
          </div>
          {/* Search */}
          {totalCount > 3 && (
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search reports…"
                className="h-8 pl-8 pr-8 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          {/* ── Drafts ── */}
          {filteredDrafts.length > 0 && (
            <div>
              <SectionHeader icon={FolderOpen} label="Draft Analyses" count={filteredDrafts.length} color="bg-muted text-muted-foreground" />
              <div className="space-y-1.5">
                {filteredDrafts.slice(0, 20).map(s => (
                  <DraftRow
                    key={s.id}
                    session={s}
                    onNavigate={() => handleNav(s.session_type === 'Seller' ? `/seller/report?sessionId=${s.id}` : `/buyer/report?sessionId=${s.id}`)}
                    onDelete={async () => { await deleteDraft(s.id); }}
                  />
                ))}
              </div>
              {filteredDrafts.length > 20 && (
                <button onClick={() => handleNav('/drafts')} className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  View all {filteredDrafts.length} drafts <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* ── Shared Reports ── */}
          {filteredShared.length > 0 && (
            <div>
              {filteredDrafts.length > 0 && <Separator className="my-4" />}
              <SectionHeader icon={Send} label="Shared Reports" count={filteredShared.length} color="bg-emerald-500/10 text-emerald-600" />
              <div className="space-y-1.5">
                {filteredShared.slice(0, 20).map(s => (
                  <SharedRow
                    key={s.id}
                    session={s}
                    onNavigate={() => handleNav(`/shared-reports`)}
                  />
                ))}
              </div>
              {filteredShared.length > 20 && (
                <button onClick={() => handleNav('/shared-reports')} className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  View all {filteredShared.length} shared <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* ── Listing Audits ── */}
          {(auditsLoading || filteredAudits.length > 0) && (
            <div>
              {(filteredDrafts.length > 0 || filteredShared.length > 0) && <Separator className="my-4" />}
              <SectionHeader icon={ClipboardList} label="Listing Audits" count={filteredAudits.length} color="bg-violet-500/10 text-violet-600" />
              {auditsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading audits…
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAudits.slice(0, 20).map(run => (
                    <AuditRow
                      key={run.id}
                      run={run}
                      onNavigate={() => handleNav('/listing-navigator')}
                      onDelete={() => deleteAudit.mutateAsync(run.id)}
                    />
                  ))}
                </div>
              )}
              {filteredAudits.length > 20 && (
                <button onClick={() => handleNav('/listing-navigator')} className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  View all in Listing Navigator <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {!auditsLoading && filteredDrafts.length === 0 && filteredShared.length === 0 && filteredAudits.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{search ? 'No matching reports' : 'No reports yet'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? 'Try a different search term.' : 'Start a Seller or Buyer analysis to see reports here.'}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer actions */}
        <div className="border-t border-border/60 px-4 py-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => handleNav('/drafts')}
          >
            <FolderOpen className="h-3.5 w-3.5" /> All Drafts
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => handleNav('/shared-reports')}
          >
            <Send className="h-3.5 w-3.5" /> Shared
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => handleNav('/listing-navigator')}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Audits
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
