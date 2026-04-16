import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronUp, Eye, Hash, MapPin,
  ArrowDownToLine, Loader2, Building2, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LNRun {
  id: string;
  created_at: string;
  score: number | null;
  property_address: string | null;
  mls_number: string | null;
  listing_label: string | null;
  summary: { critical: number; moderate: number; presentation: number; positive: number } | null;
}

interface ImportedData {
  address?: string;
  price?: number;
  mlsNumber?: string;
  beds?: number;
  sqft?: number;
}

interface ListingNavigatorImportPanelProps {
  onImport: (data: ImportedData) => void;
  reportType: 'seller' | 'buyer';
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-destructive';
}

function scoreLabel(score: number | null) {
  if (score === null) return null;
  if (score >= 80) return { label: 'Strong', variant: 'outline' as const };
  if (score >= 60) return { label: 'Fair', variant: 'outline' as const };
  if (score >= 40) return { label: 'Needs Work', variant: 'outline' as const };
  return { label: 'Critical Issues', variant: 'destructive' as const };
}

export function ListingNavigatorImportPanel({ onImport, reportType }: ListingNavigatorImportPanelProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const { data: runs, isLoading } = useQuery({
    queryKey: ['ln-runs-for-import', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('listing_navigator_runs')
        .select('id, created_at, score, property_address, mls_number, listing_label, summary, property_hint')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
      return (data || []) as (LNRun & { property_hint?: Record<string, unknown> })[];
    },
    enabled: !!user && open,
  });

  const handleImport = async (run: LNRun & { property_hint?: Record<string, unknown> }) => {
    setImporting(run.id);
    try {
      const hint = run.property_hint || {};
      const importData: ImportedData = {
        address: run.property_address || undefined,
        mlsNumber: run.mls_number || undefined,
        price: typeof hint.price === 'number' ? hint.price : undefined,
        beds: typeof hint.beds === 'number' ? hint.beds : undefined,
        sqft: typeof hint.sqft === 'number' ? hint.sqft : undefined,
      };
      onImport(importData);
      setOpen(false);
    } finally {
      setImporting(null);
    }
  };

  if (!user) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Eye className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Import from Listing Navigator</p>
            <p className="text-xs text-muted-foreground">
              {reportType === 'seller'
                ? 'Pre-fill address & list price from a prior audit'
                : 'Pre-fill address & reference price from a prior audit'}
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-primary/15 px-4 py-3 space-y-2 max-h-72 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading audits…
                </div>
              )}
              {!isLoading && !runs?.length && (
                <p className="text-sm text-muted-foreground py-2">
                  No Listing Navigator audits found. Run an audit first on the Listing Navigator page.
                </p>
              )}
              {runs?.map(run => {
                const sl = scoreLabel(run.score);
                const isImporting = importing === run.id;
                const displayName = run.listing_label || run.property_address || `Audit — ${new Date(run.created_at).toLocaleDateString()}`;
                return (
                  <div
                    key={run.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-muted shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {run.mls_number && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Hash className="h-2.5 w-2.5" />{run.mls_number}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString()}
                        </span>
                        {run.score !== null && (
                          <span className={cn('text-[10px] font-semibold', scoreColor(run.score))}>
                            Score: {run.score}/100
                          </span>
                        )}
                        {run.summary && (
                          <>
                            {run.summary.critical > 0 && (
                              <span className="text-[10px] text-destructive flex items-center gap-0.5">
                                <AlertCircle className="h-2.5 w-2.5" />{run.summary.critical} critical
                              </span>
                            )}
                            {run.summary.positive > 0 && (
                              <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" />{run.summary.positive} positive
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
                      disabled={isImporting}
                      onClick={() => handleImport(run)}
                    >
                      {isImporting
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <ArrowDownToLine className="h-3 w-3" />
                      }
                      Import
                    </Button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
