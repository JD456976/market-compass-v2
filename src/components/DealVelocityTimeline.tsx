import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  FileSearch, DollarSign, Home, Key, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Zap, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';

interface Milestone {
  id: string;
  label: string;
  icon: React.ReactNode;
  dayOffset: number;
  category: 'inspection' | 'finance' | 'legal' | 'closing';
  isMarketAdjusted?: boolean;
  tip: string;
}

interface DealVelocityTimelineProps {
  offerDate?: Date;
  marketScore?: number; // Lead Finder opportunity score
  isHotMarket?: boolean;
  sessionType?: 'buyer' | 'seller';
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  inspection: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  finance: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  legal: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  closing: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
};

function buildMilestones(
  closingDays: number,
  isHotMarket: boolean,
  hasMortgage: boolean,
  hasInspection: boolean
): Milestone[] {
  const inspDays = isHotMarket ? 5 : 10;
  const mortDays = Math.max(3, Math.round(closingDays * 0.15));
  const apprDays = Math.max(7, Math.round(closingDays * 0.4));
  const titleDays = Math.max(5, Math.round(closingDays * 0.25));
  const clearDays = Math.max(3, Math.round(closingDays * 0.85));

  const milestones: Milestone[] = [];

  milestones.push({
    id: 'offer',
    label: 'Offer Accepted',
    icon: <CheckCircle2 className="h-4 w-4" />,
    dayOffset: 0,
    category: 'legal',
    tip: 'Start the clock — every contingency deadline runs from this date.',
  });

  if (hasInspection) {
    milestones.push({
      id: 'inspection',
      label: `Inspection Deadline`,
      icon: <FileSearch className="h-4 w-4" />,
      dayOffset: inspDays,
      category: 'inspection',
      isMarketAdjusted: isHotMarket,
      tip: isHotMarket
        ? 'Hot market: compressed to 5 days. Schedule inspector immediately after offer acceptance.'
        : 'Book your inspector as soon as the offer is accepted — availability fills fast.',
    });
  }

  if (hasMortgage) {
    milestones.push({
      id: 'mortgage_app',
      label: 'Full Mortgage Application',
      icon: <DollarSign className="h-4 w-4" />,
      dayOffset: mortDays,
      category: 'finance',
      tip: 'Submit full application within days — lender needs time to process before appraisal.',
    });

    milestones.push({
      id: 'appraisal',
      label: 'Appraisal Ordered',
      icon: <Home className="h-4 w-4" />,
      dayOffset: apprDays,
      category: 'finance',
      tip: 'Appraisers can take 10–14 days. Lender needs this before final approval.',
    });

    milestones.push({
      id: 'financing_contingency',
      label: `Financing Contingency Removal`,
      icon: <CheckCircle2 className="h-4 w-4" />,
      dayOffset: Math.round(closingDays * 0.6),
      category: 'finance',
      isMarketAdjusted: isHotMarket,
      tip: 'Confirm loan commitment before this date or negotiate an extension.',
    });
  }

  milestones.push({
    id: 'title_search',
    label: 'Title Search Ordered',
    icon: <FileSearch className="h-4 w-4" />,
    dayOffset: titleDays,
    category: 'legal',
    tip: 'Attorney orders title search to confirm clear ownership chain.',
  });

  milestones.push({
    id: 'final_walkthrough',
    label: 'Final Walk-Through',
    icon: <Home className="h-4 w-4" />,
    dayOffset: closingDays - 1,
    category: 'inspection',
    tip: 'Verify property condition matches contract. Note any changes since inspection.',
  });

  milestones.push({
    id: 'clear_to_close',
    label: 'Clear to Close',
    icon: <CheckCircle2 className="h-4 w-4" />,
    dayOffset: clearDays,
    category: 'finance',
    tip: 'Lender issues final approval. Wire funds — closing is near.',
  });

  milestones.push({
    id: 'closing',
    label: 'Closing Day 🎉',
    icon: <Key className="h-4 w-4" />,
    dayOffset: closingDays,
    category: 'closing',
    tip: 'Keys are transferred. Congratulations!',
  });

  return milestones.sort((a, b) => a.dayOffset - b.dayOffset);
}

export function DealVelocityTimeline({ offerDate, marketScore = 50, isHotMarket, sessionType = 'buyer' }: DealVelocityTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const [closingDays, setClosingDays] = useState(isHotMarket ?? marketScore >= 71 ? 30 : 45);
  const [hasMortgage, setHasMortgage] = useState(true);
  const [hasInspection, setHasInspection] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const hotMarket = isHotMarket ?? marketScore >= 71;
  const startDate = offerDate ?? new Date();
  const milestones = buildMilestones(closingDays, hotMarket, hasMortgage, hasInspection);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Deal Velocity Timeline</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-normal">
                {closingDays}-day close · {milestones.length} milestones
                {hotMarket && <span className="text-amber-500 ml-1">· Hot Market</span>}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 space-y-4">
              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-muted/30 border border-border/40 p-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs text-muted-foreground">Closing Timeline</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[closingDays]}
                      onValueChange={([v]) => setClosingDays(v)}
                      min={21}
                      max={60}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs font-medium w-12 text-right">{closingDays}d</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="mortgage" checked={hasMortgage} onCheckedChange={setHasMortgage} className="scale-75" />
                    <Label htmlFor="mortgage" className="text-xs cursor-pointer">Financing</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="inspection" checked={hasInspection} onCheckedChange={setHasInspection} className="scale-75" />
                    <Label htmlFor="inspection" className="text-xs cursor-pointer">Inspection</Label>
                  </div>
                </div>
                {hotMarket && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-xs sm:justify-end">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Timelines compressed for hot market
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="relative pl-5">
                <div className="absolute left-[9px] top-4 bottom-4 w-0.5 bg-border/50" />
                <div className="space-y-0">
                  {milestones.map((m, i) => {
                    const date = addDays(startDate, m.dayOffset);
                    const styles = CATEGORY_STYLES[m.category];
                    const isLast = i === milestones.length - 1;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative"
                      >
                        <div
                          className={cn(
                            'absolute left-[-14px] h-5 w-5 rounded-full border-2 bg-background flex items-center justify-center',
                            isLast ? 'border-emerald-500' : 'border-border',
                          )}
                        >
                          <div className={cn('h-2 w-2 rounded-full', isLast ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                        </div>

                        <button
                          className={cn(
                            'w-full text-left ml-3 mb-4 rounded-lg border p-3 transition-all',
                            activeId === m.id ? `${styles.border} ${styles.bg}` : 'border-border/30 hover:border-border/60',
                            isLast && 'border-emerald-500/30 bg-emerald-500/5'
                          )}
                          onClick={() => setActiveId(activeId === m.id ? null : m.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={cn('h-6 w-6 rounded-md flex items-center justify-center shrink-0', styles.bg, styles.text)}>
                                {m.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-medium">{m.label}</span>
                                  {m.isMarketAdjusted && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-500 border-amber-500/30">
                                      Market-adjusted
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[11px] font-medium">{format(date, 'MMM d')}</div>
                              <div className="text-[10px] text-muted-foreground">Day {m.dayOffset}</div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {activeId === m.id && (
                              <motion.p
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="text-[11px] text-muted-foreground mt-2 pl-8 overflow-hidden"
                              >
                                {m.tip}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/60 text-center">
                Tap any milestone for guidance · Dates are estimates starting from offer acceptance
              </p>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
