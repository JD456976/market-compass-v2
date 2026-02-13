/**
 * Seller Scenario Explorer
 * Allows sellers to adjust list price, strategy, and timeframe
 * with live risk previews (regret risk + wait simulator).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Compass, X, HelpCircle, ChevronRight, Save, SendHorizonal, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerDescription,
} from '@/components/ui/drawer';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { SellerInputs, DesiredTimeframe, StrategyPreference, LikelihoodBand } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateSellerRegretRisk, SellerRegretRiskResult, SELLER_REGRET_RISK_LEVELS } from '@/lib/sellerRegretRiskScoring';
import { simulateSellerWaiting, SellerWaitScenario, RiskLevel } from '@/lib/sellerWaitSimulator';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { cn } from '@/lib/utils';

const SELLER_SCENARIO_OPEN_EVENT = 'mc:seller-scenario-explorer:open';

export function openSellerScenarioExplorer() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SELLER_SCENARIO_OPEN_EVENT));
}

interface SellerScenarioExplorerProps {
  originalInputs: SellerInputs;
  onInputsChange: (inputs: SellerInputs) => void;
  currentInputs: SellerInputs;
  likelihood30: LikelihoodBand;
  snapshot?: MarketSnapshot | null;
  reportId?: string;
}

const TIMEFRAME_OPTIONS: { value: DesiredTimeframe; label: string }[] = [
  { value: '30', label: '30 Days' },
  { value: '60', label: '60 Days' },
  { value: '90+', label: '90+ Days' },
];

const STRATEGY_OPTIONS: { value: StrategyPreference; label: string; desc: string }[] = [
  { value: 'Maximize price', label: 'Maximize Price', desc: 'Hold for highest possible price' },
  { value: 'Balanced', label: 'Balanced', desc: 'Optimize both price and timing' },
  { value: 'Prioritize speed', label: 'Prioritize Speed', desc: 'Sell quickly, accept lower price' },
];

// Compact regret risk badge
function RegretRiskBadge({ level, score }: { level: string; score: number }) {
  const idx = SELLER_REGRET_RISK_LEVELS.indexOf(level as any);
  const color = idx >= 3 ? 'text-destructive' : idx >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <span className={cn('text-lg font-serif font-bold', color)}>{Math.round(score)}</span>
      <span className="text-xs text-muted-foreground">/100</span>
      <span className={cn('text-xs font-medium', color)}>{level}</span>
    </div>
  );
}

function WaitRiskBadge({ level }: { level: RiskLevel }) {
  const colors: Record<RiskLevel, string> = {
    'Very Low': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Low': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Moderate': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'High': 'bg-destructive/10 text-destructive',
    'Very High': 'bg-destructive/10 text-destructive',
  };
  return <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', colors[level])}>{level}</span>;
}

function interpolateSellerWait(scenarios: SellerWaitScenario[], days: number): SellerWaitScenario {
  if (days <= 30) return { ...scenarios[0], days, label: `${days}d` };
  if (days >= 90) return { ...scenarios[2], days, label: `${days}d` };
  const idx = days <= 60 ? 0 : 1;
  const next = idx + 1;
  const t = (days - scenarios[idx].days) / (scenarios[next].days - scenarios[idx].days);
  const closer = t < 0.5 ? scenarios[idx] : scenarios[next];
  return { ...closer, days, label: `${days}d` };
}

// Live risk preview for seller scenarios
function SellerLiveRiskPreview({ inputs, likelihood30, snapshot }: { inputs: SellerInputs; likelihood30: LikelihoodBand; snapshot?: MarketSnapshot | null }) {
  const [waitDays, setWaitDays] = useState(30);

  const regretRisk = useMemo(() => {
    return calculateSellerRegretRisk(inputs, likelihood30, snapshot);
  }, [inputs, likelihood30, snapshot]);

  const waitScenarios = useMemo(() => {
    return simulateSellerWaiting(likelihood30, snapshot);
  }, [likelihood30, snapshot]);

  const activeWait = useMemo(() => interpolateSellerWait(waitScenarios, waitDays), [waitScenarios, waitDays]);

  return (
    <div className="space-y-4 pt-2 border-t border-border/40">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        <span>Live Risk Preview</span>
        <span className="text-[10px] text-accent font-normal">(updates as you adjust)</span>
      </h4>

      {/* Regret Risk */}
      <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pricing Regret Risk</span>
        </div>
        <RegretRiskBadge level={regretRisk.level} score={regretRisk.score} />
        {/* Mini meter */}
        <div className="flex gap-[2px] h-1.5 rounded-full overflow-hidden">
          {SELLER_REGRET_RISK_LEVELS.map((level, i) => {
            const activeIdx = SELLER_REGRET_RISK_LEVELS.indexOf(regretRisk.level);
            const isActive = i <= activeIdx;
            const hue = isActive
              ? i <= 1 ? 'hsl(var(--accent))' : i <= 2 ? 'hsl(40 90% 55%)' : 'hsl(var(--destructive))'
              : undefined;
            return (
              <div
                key={level}
                className={cn('flex-1 rounded-sm', !isActive && 'bg-secondary')}
                style={isActive ? { background: hue, opacity: 0.5 + (i / 5) * 0.5 } : undefined}
              />
            );
          })}
        </div>
        {regretRisk.factors.length > 0 && (
          <p className="text-[10px] text-muted-foreground">{regretRisk.factors[0]}</p>
        )}
      </div>

      {/* Wait Simulator */}
      <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">What If You Wait?</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Delay</span>
            <span className="text-xs font-semibold">{waitDays} days</span>
          </div>
          <Slider
            value={[waitDays]}
            onValueChange={([v]) => setWaitDays(v)}
            min={7}
            max={120}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>1 wk</span>
            <span>4 mo</span>
          </div>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Market Shift</span>
            <WaitRiskBadge level={activeWait.marketShiftRisk} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Price Movement</span>
            <span className="text-[10px] text-muted-foreground max-w-[150px] text-right">{activeWait.priceMovement.magnitude}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Competition</span>
            <WaitRiskBadge level={activeWait.competitionRisk} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SellerScenarioForm({
  localInputs,
  setLocalInputs,
  originalInputs,
  changedFields,
  likelihood30,
  snapshot,
}: {
  localInputs: SellerInputs;
  setLocalInputs: React.Dispatch<React.SetStateAction<SellerInputs>>;
  originalInputs: SellerInputs;
  changedFields: Set<string>;
  likelihood30: LikelihoodBand;
  snapshot?: MarketSnapshot | null;
}) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const priceMin = Math.round(originalInputs.seller_selected_list_price * 0.80);
  const priceMax = Math.round(originalInputs.seller_selected_list_price * 1.30);
  const priceStep = Math.max(1000, Math.round(originalInputs.seller_selected_list_price * 0.005 / 1000) * 1000);

  return (
    <TooltipProvider>
      <div className="space-y-6 overflow-x-hidden">
        {/* Strategy Presets */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Strategy Presets</h4>
          <div className="grid grid-cols-3 gap-2">
            {STRATEGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLocalInputs(prev => ({ ...prev, strategy_preference: opt.value }))}
                className={cn(
                  'p-3 rounded-lg text-center transition-all border text-xs',
                  localInputs.strategy_preference === opt.value
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border bg-secondary/30 text-muted-foreground hover:border-accent/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* List Price Slider */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Listing Details</h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-1">
                List Price
                {changedFields.has('seller_selected_list_price') && (
                  <span className="text-xs text-accent">Changed</span>
                )}
              </Label>
              <span className="text-sm font-semibold">{formatCurrency(localInputs.seller_selected_list_price)}</span>
            </div>
            <Slider
              min={priceMin}
              max={priceMax}
              step={priceStep}
              value={[localInputs.seller_selected_list_price]}
              onValueChange={([val]) => setLocalInputs(prev => ({ ...prev, seller_selected_list_price: val }))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatCurrency(priceMin)}</span>
              <span className="text-accent">{formatCurrency(originalInputs.seller_selected_list_price)} (original)</span>
              <span>{formatCurrency(priceMax)}</span>
            </div>
          </div>

          {/* Timeframe */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              Desired Timeframe
              {changedFields.has('desired_timeframe') && (
                <span className="text-xs text-accent">Changed</span>
              )}
            </Label>
            <Select
              value={localInputs.desired_timeframe}
              onValueChange={(value: DesiredTimeframe) =>
                setLocalInputs(prev => ({ ...prev, desired_timeframe: value }))
              }
            >
              <SelectTrigger className="h-11 min-h-[44px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Strategy */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              Strategy
              {changedFields.has('strategy_preference') && (
                <span className="text-xs text-accent">Changed</span>
              )}
            </Label>
            <Select
              value={localInputs.strategy_preference}
              onValueChange={(value: StrategyPreference) =>
                setLocalInputs(prev => ({ ...prev, strategy_preference: value }))
              }
            >
              <SelectTrigger className="h-11 min-h-[44px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Live Risk Preview */}
        <SellerLiveRiskPreview inputs={localInputs} likelihood30={likelihood30} snapshot={snapshot} />
      </div>
    </TooltipProvider>
  );
}

export function SellerScenarioExplorer({ originalInputs, onInputsChange, currentInputs, likelihood30, snapshot, reportId }: SellerScenarioExplorerProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [localInputs, setLocalInputs] = useState<SellerInputs>(currentInputs);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [submitTitle, setSubmitTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Listen for external open events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOpen = () => setIsOpen(true);
    window.addEventListener(SELLER_SCENARIO_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SELLER_SCENARIO_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => { setLocalInputs(currentInputs); }, [currentInputs]);

  useEffect(() => {
    const changed = new Set<string>();
    if (localInputs.seller_selected_list_price !== originalInputs.seller_selected_list_price) changed.add('seller_selected_list_price');
    if (localInputs.desired_timeframe !== originalInputs.desired_timeframe) changed.add('desired_timeframe');
    if (localInputs.strategy_preference !== originalInputs.strategy_preference) changed.add('strategy_preference');
    setChangedFields(changed);
  }, [localInputs, originalInputs]);

  // Auto-apply on desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      const timer = setTimeout(() => { onInputsChange(localInputs); }, 300);
      return () => clearTimeout(timer);
    }
  }, [localInputs, onInputsChange, isMobile, isOpen]);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setTimeout(() => { contentRef.current?.scrollTo({ top: 0, behavior: 'instant' }); }, 50);
    }
  }, [isOpen]);

  const handleReset = useCallback(() => {
    setLocalInputs({ ...originalInputs });
    if (!isMobile) onInputsChange({ ...originalInputs });
  }, [originalInputs, onInputsChange, isMobile]);

  const handleApply = useCallback(() => {
    setIsApplying(true);
    setTimeout(() => {
      onInputsChange(localInputs);
      setIsApplying(false);
      setIsOpen(false);
    }, 200);
  }, [localInputs, onInputsChange]);

  const handleSaveScenario = useCallback(async () => {
    if (!reportId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('report_scenarios').insert({
        report_id: reportId,
        created_by_role: 'client',
        created_by_id: 'client',
        scenario_payload: localInputs as any,
      });
      if (error) throw error;
      toast({ title: 'Scenario saved' });
    } catch {
      toast({ title: 'Failed to save scenario', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [reportId, localInputs, toast]);

  const handleSubmitToAgent = useCallback(async () => {
    if (!reportId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('report_scenarios').insert({
        report_id: reportId,
        created_by_role: 'client',
        created_by_id: 'client',
        title: submitTitle.trim() || null,
        note_to_agent: submitNote.trim() || null,
        scenario_payload: localInputs as any,
        submitted_to_agent: true,
        submitted_at: new Date().toISOString(),
        reviewed_status: 'pending',
      });
      if (error) throw error;
      supabase.functions.invoke('report-notifications', {
        body: { type: 'scenario_submitted', report_id: reportId, scenario_title: submitTitle.trim() || 'Untitled Scenario' },
      }).catch(() => {});
      toast({ title: 'Scenario sent to agent for review' });
      setShowSubmitDialog(false);
      setSubmitNote('');
      setSubmitTitle('');
    } catch {
      toast({ title: 'Failed to submit scenario', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [reportId, localInputs, submitTitle, submitNote, toast]);

  const hasChanges = changedFields.size > 0;

  const panelContent = (
    <>
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-4 scenario-drawer-content">
        <SellerScenarioForm
          localInputs={localInputs}
          setLocalInputs={setLocalInputs}
          originalInputs={originalInputs}
          changedFields={changedFields}
          likelihood30={likelihood30}
          snapshot={snapshot}
        />
      </div>

      {/* Footer */}
      <div
        className="border-t p-4 space-y-2 bg-background shrink-0"
        style={{ paddingBottom: isMobile ? 'max(1rem, env(safe-area-inset-bottom))' : '1rem' }}
      >
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges} className="flex-1 h-12 min-h-[44px]">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleApply} disabled={isApplying} className="flex-1 h-12 min-h-[44px]">
            {isApplying ? <span className="animate-pulse">Applying...</span> : 'Apply Changes'}
          </Button>
        </div>
        {reportId && hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveScenario} disabled={isSaving} className="flex-1 min-h-[40px] text-xs">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save Scenario'}
            </Button>
            <Button variant="accent" size="sm" onClick={() => setShowSubmitDialog(true)} className="flex-1 min-h-[40px] text-xs">
              <SendHorizonal className="h-3.5 w-3.5 mr-1.5" />
              Send to Agent
            </Button>
          </div>
        )}
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Scenario to Agent</DialogTitle>
            <DialogDescription>Your agent will review this scenario and respond.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Title (optional)</Label>
              <Input placeholder="e.g., Lower price for faster sale" value={submitTitle} onChange={(e) => setSubmitTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Note to Agent (optional)</Label>
              <Textarea placeholder="Any context or questions for your agent..." value={submitNote} onChange={(e) => setSubmitNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitToAgent} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
          style={{ paddingBottom: 'calc(max(0.75rem, env(safe-area-inset-bottom)) + 4.5rem)' }}
        >
          <button
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 min-h-[48px] rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all touch-manipulation"
          >
            <Compass className="h-4 w-4 shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap">Explore Listing Scenarios</span>
            {hasChanges && (
              <Badge variant="accent" className="text-[10px] px-1.5 py-0 ml-1 shrink-0">Modified</Badge>
            )}
          </button>
        </div>

        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[85vh] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <DrawerHeader className="border-b pb-4 shrink-0 sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Compass className="h-5 w-5 text-accent shrink-0" />
                  <DrawerTitle className="font-serif text-lg truncate">Listing Scenario Explorer</DrawerTitle>
                  {hasChanges && <Badge variant="secondary" className="text-xs shrink-0">Modified</Badge>}
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0">
                    <X className="h-5 w-5" />
                  </Button>
                </DrawerClose>
              </div>
              <DrawerDescription className="text-sm text-muted-foreground mt-1">
                Adjust listing strategy to explore pricing tradeoffs.
              </DrawerDescription>
            </DrawerHeader>
            {panelContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] flex flex-col p-0">
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-accent" />
            <SheetTitle className="font-serif text-lg">Listing Scenario Explorer</SheetTitle>
            {hasChanges && <Badge variant="secondary" className="text-xs">Modified</Badge>}
          </div>
          <SheetDescription className="text-sm text-muted-foreground">
            Adjust listing strategy to explore pricing tradeoffs.
          </SheetDescription>
        </SheetHeader>
        {panelContent}
      </SheetContent>
    </Sheet>
  );
}

// Card trigger for desktop
export function SellerScenarioExplorerCard({ hasChanges, onClick, className }: { hasChanges?: boolean; onClick: () => void; className?: string }) {
  return (
    <TooltipProvider>
      <Card
        className={cn('pdf-exclude cursor-pointer group hover:border-accent/50 transition-colors', className)}
        onClick={onClick}
      >
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-accent/10 shrink-0">
              <Compass className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">Listing Scenario Explorer</h3>
                {hasChanges && <Badge variant="secondary" className="text-xs">Modified</Badge>}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="h-5 w-5 flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px]">
                    <p className="text-xs">Explore how changing list price and strategy may affect outcomes.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Explore how changing list price and strategy may affect outcomes.
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
