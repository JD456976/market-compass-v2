/**
 * SavedPlaybooks — Agent-only page listing all saved prospecting playbooks
 * across all ZIP codes, with filtering by lead type and date.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BookmarkCheck, Trash2, ExternalLink, Search, Filter,
  Sparkles, BookmarkPlus, Calendar, MapPin, TrendingUp,
  TrendingDown, Minus, Loader2, ChevronDown, ChevronUp,
  Copy, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonalizationConfig {
  agentName: string;
  brokerage: string;
  phone: string;
  licenseNum: string;
  cta: string;
}

interface PlaybookItem {
  platform: string;
  label: string;
  headline: string;
  body: string;
  hook: string;
  emoji?: string;
}

interface SavedPlaybook {
  id: string;
  zip_code: string;
  city_state: string | null;
  lead_type: string;
  opportunity_score: number | null;
  playbook_items: PlaybookItem[];
  personalization: PersonalizationConfig | null;
  label: string | null;
  created_at: string;
  analysis_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEAD_TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  seller: {
    label: 'Seller Market',
    color: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  buyer: {
    label: 'Buyer Market',
    color: 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30',
    icon: <TrendingDown className="h-3 w-3" />,
  },
  transitional: {
    label: 'Transitional',
    color: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30',
    icon: <Minus className="h-3 w-3" />,
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 px-1.5 text-[10px] gap-1"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: 'Copied!' });
      }}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

// ─── Playbook card ────────────────────────────────────────────────────────────

function PlaybookCard({
  playbook,
  onDelete,
}: {
  playbook: SavedPlaybook;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = LEAD_TYPE_META[playbook.lead_type] ?? LEAD_TYPE_META.transitional;
  const title = playbook.label || `${playbook.city_state || playbook.zip_code} — ${new Date(playbook.created_at).toLocaleDateString()}`;
  const hasPersonalization = !!(playbook.personalization?.agentName || playbook.personalization?.brokerage);

  return (
    <>
      <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-colors">
        {/* Card header */}
        <div
          className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          {/* ZIP badge */}
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground font-mono">{playbook.zip_code}</span>
              {playbook.city_state && (
                <span className="text-[11px] text-muted-foreground">· {playbook.city_state}</span>
              )}
              <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 gap-0.5 inline-flex items-center', meta.color)}>
                {meta.icon}
                {meta.label}
              </Badge>
              {playbook.opportunity_score != null && (
                <span className="text-[11px] text-muted-foreground">Score {playbook.opportunity_score}/100</span>
              )}
              {hasPersonalization && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-primary border-primary/30">
                  Personalized
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              {playbook.playbook_items.length} assets
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            {expanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Expanded assets */}
        {expanded && (
          <CardContent className="p-0 border-t border-border/50">
            {/* Personalization summary */}
            {hasPersonalization && (
              <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/10 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Personalized for:</span>
                {playbook.personalization?.agentName && <span>{playbook.personalization.agentName}</span>}
                {playbook.personalization?.brokerage && <span>· {playbook.personalization.brokerage}</span>}
                {playbook.personalization?.phone && <span>· {playbook.personalization.phone}</span>}
              </div>
            )}

            {/* Asset list */}
            <div className="divide-y divide-border/40">
              {playbook.playbook_items.map((item, i) => (
                <div key={i} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.emoji && <span className="text-sm">{item.emoji}</span>}
                      <span className="text-xs font-semibold text-foreground/80">{item.label}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 hidden sm:inline-flex">
                        {item.hook}
                      </Badge>
                    </div>
                    <CopyButton text={item.body} />
                  </div>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-foreground/75 bg-muted/30 rounded-lg p-3 border border-border/40 max-h-40 overflow-y-auto">
                    {item.body}
                  </pre>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Saved {new Date(playbook.created_at).toLocaleString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
                onClick={() => window.open(`/lead-finder?zip=${playbook.zip_code}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
                Re-run in Lead Finder
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Delete confirm */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this playbook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { setConfirmDelete(false); onDelete(playbook.id); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SavedPlaybooks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const { data: playbooks = [], isLoading } = useQuery<SavedPlaybook[]>({
    queryKey: ['all-saved-playbooks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_playbooks')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({
        ...r,
        playbook_items: (r.playbook_items as unknown as PlaybookItem[]) ?? [],
        personalization: r.personalization as unknown as PersonalizationConfig | null,
      }));
    },
  });

  const handleDelete = async (id: string) => {
    await supabase.from('saved_playbooks').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['all-saved-playbooks', user?.id] });
    toast({ title: 'Playbook deleted' });
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const now = new Date();
  const filtered = playbooks.filter(p => {
    // Search: ZIP, city/state, label
    if (search) {
      const q = search.toLowerCase();
      const matches =
        p.zip_code.includes(q) ||
        (p.city_state ?? '').toLowerCase().includes(q) ||
        (p.label ?? '').toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Lead type
    if (leadTypeFilter !== 'all' && p.lead_type !== leadTypeFilter) return false;

    // Date range
    if (dateFilter !== 'all') {
      const created = new Date(p.created_at);
      const diffMs = now.getTime() - created.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (dateFilter === '7d' && diffDays > 7) return false;
      if (dateFilter === '30d' && diffDays > 30) return false;
      if (dateFilter === '90d' && diffDays > 90) return false;
    }

    return true;
  });

  // ── Grouped by ZIP ─────────────────────────────────────────────────────────

  const totalZips = new Set(playbooks.map(p => p.zip_code)).size;
  const totalAssets = playbooks.reduce((sum, p) => sum + (p.playbook_items?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">

        {/* Page header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookmarkCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold leading-tight">Saved Playbooks</h1>
              <p className="text-xs text-muted-foreground">Your library of market-grounded prospecting assets</p>
            </div>
          </div>

          {/* Stats row */}
          {playbooks.length > 0 && (
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookmarkPlus className="h-3.5 w-3.5" />
                <span><strong className="text-foreground">{playbooks.length}</strong> playbooks saved</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>Across <strong className="text-foreground">{totalZips}</strong> ZIP codes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                <span><strong className="text-foreground">{totalAssets}</strong> total assets</span>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ZIP, city, or label…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={leadTypeFilter} onValueChange={setLeadTypeFilter}>
            <SelectTrigger className="h-9 w-full sm:w-44 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Lead type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All market types</SelectItem>
              <SelectItem value="seller">Seller Market</SelectItem>
              <SelectItem value="buyer">Buyer Market</SelectItem>
              <SelectItem value="transitional">Transitional</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-9 w-full sm:w-40 text-sm">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading your playbooks…</p>
          </div>
        ) : playbooks.length === 0 ? (
          /* Empty state */
          <div className="text-center py-24 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <BookmarkCheck className="h-8 w-8 text-primary/50" />
            </div>
            <div className="space-y-1">
              <h3 className="font-sans text-xl font-semibold">No saved playbooks yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                After running a ZIP analysis in the Lead Finder, scroll to the Prospecting Playbook section and click <strong>Save</strong> to add it here.
              </p>
            </div>
            <Button onClick={() => navigate('/lead-finder')} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Go to Lead Finder
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          /* No results state */
          <div className="text-center py-16 space-y-2">
            <p className="text-sm text-muted-foreground">No playbooks match your filters.</p>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setLeadTypeFilter('all'); setDateFilter('all'); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          /* Playbook list */
          <div className="space-y-3">
            {filtered.length < playbooks.length && (
              <p className="text-xs text-muted-foreground">
                Showing {filtered.length} of {playbooks.length} playbooks
              </p>
            )}
            {filtered.map(p => (
              <PlaybookCard key={p.id} playbook={p} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
