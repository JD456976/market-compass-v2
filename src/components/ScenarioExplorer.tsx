import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Info, Compass, X, HelpCircle, ChevronRight, Save, SendHorizonal, HeartCrack, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { BuyerInputs, FinancingType, DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { OfferStrategyPresets } from '@/components/report/OfferStrategyPresets';
import { SCENARIO_EXPLORER_OPEN_EVENT } from '@/lib/scenarioExplorerEvents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateRegretRisk, RegretRiskResult, REGRET_RISK_LEVELS } from '@/lib/regretRiskScoring';
import { simulateWaiting, WaitScenario, RiskLevel } from '@/lib/waitSimulator';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ScenarioExplorerProps {
  originalInputs: BuyerInputs;
  onInputsChange: (inputs: BuyerInputs) => void;
  currentInputs: BuyerInputs;
  reportId?: string;
}

// Tooltip explanation for Scenario Explorer
const SCENARIO_EXPLORER_TOOLTIP = "Explore how changing terms may affect competitiveness.";
const SCENARIO_EXPLORER_DESCRIPTION = "Adjust terms to explore tradeoffs before you decide.";

const CONTINGENCY_OPTIONS: { value: Contingency; label: string }[] = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Financing', label: 'Financing' },
  { value: 'Appraisal', label: 'Appraisal' },
  { value: 'Home sale', label: 'Home Sale' },
  { value: 'None', label: 'None (Waiving all)' },
];

const CONTINGENCY_EXPLANATIONS: Record<Contingency, string> = {
  'Inspection': 'Removing inspection can make your offer more attractive but reduces buyer protections.',
  'Financing': 'Removing financing contingency signals strength but increases risk if financing changes.',
  'Appraisal': 'Waiving appraisal shows commitment but means covering any gap if home appraises low.',
  'Home sale': 'Removing home sale contingency removes a major obstacle for sellers.',
  'None': 'Waiving all contingencies maximizes competitiveness but eliminates buyer protections.',
};

const FINANCING_OPTIONS: { value: FinancingType; label: string }[] = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Conventional', label: 'Conventional' },
  { value: 'FHA', label: 'FHA' },
  { value: 'VA', label: 'VA' },
  { value: 'Other', label: 'Other' },
];

const DOWN_PAYMENT_OPTIONS: { value: DownPaymentPercent; label: string }[] = [
  { value: '<10', label: 'Less than 10%' },
  { value: '10-19', label: '10-19%' },
  { value: '20+', label: '20% or more' },
];

const CLOSING_OPTIONS: { value: ClosingTimeline; label: string }[] = [
  { value: '<21', label: 'Under 21 days' },
  { value: '21-30', label: '21-30 days' },
  { value: '31-45', label: '31-45 days' },
  { value: '45+', label: 'Over 45 days' },
];

const PREFERENCE_OPTIONS: { value: BuyerPreference; label: string }[] = [
  { value: 'Must win', label: 'Must Win' },
  { value: 'Balanced', label: 'Balanced' },
  { value: 'Price-protective', label: 'Price-Protective' },
];

// Compact inline Regret Risk badge for live preview
function RegretRiskBadge({ level, score }: { level: string; score: number }) {
  const idx = REGRET_RISK_LEVELS.indexOf(level as any);
  const color = idx >= 3 ? 'text-destructive' : idx >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <span className={cn('text-lg font-sans font-bold', color)}>{Math.round(score)}</span>
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

function interpolateWaitScenario(scenarios: WaitScenario[], days: number): WaitScenario {
  if (days <= 30) return { ...scenarios[0], days, label: `${days}d` };
  if (days >= 90) return { ...scenarios[2], days, label: `${days}d` };
  const idx = days <= 60 ? 0 : 1;
  const next = idx + 1;
  const t = (days - scenarios[idx].days) / (scenarios[next].days - scenarios[idx].days);
  const closer = t < 0.5 ? scenarios[idx] : scenarios[next];
  return { ...closer, days, label: `${days}d` };
}

// Live risk preview that updates as scenario inputs change
function LiveRiskPreview({ inputs }: { inputs: BuyerInputs }) {
  const [waitDays, setWaitDays] = useState(30);

  const regretRisk = useMemo(() => {
    return calculateRegretRisk(inputs, 'Moderate', undefined);
  }, [inputs]);

  const waitScenarios = useMemo(() => {
    return simulateWaiting(
      inputs.market_conditions || 'Balanced',
      inputs.days_on_market ?? null,
      inputs.offer_price,
      inputs.reference_price || inputs.offer_price,
      undefined
    );
  }, [inputs]);

  const activeWait = useMemo(() => interpolateWaitScenario(waitScenarios, waitDays), [waitScenarios, waitDays]);

  return (
    <div className="space-y-4 pt-2 border-t border-border/40">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        <span>Live Risk Preview</span>
        <span className="text-[10px] text-accent font-normal">(updates as you adjust)</span>
      </h4>

      {/* Regret Risk */}
      <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
        <div className="flex items-center gap-1.5">
          <HeartCrack className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Regret Risk</span>
        </div>
        <RegretRiskBadge level={regretRisk.level} score={regretRisk.score} />
        {/* Mini meter */}
        <div className="flex gap-[2px] h-1.5 rounded-full overflow-hidden">
          {REGRET_RISK_LEVELS.map((level, i) => {
            const activeIdx = REGRET_RISK_LEVELS.indexOf(regretRisk.level);
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
            <span className="text-[11px] text-muted-foreground">Property Loss</span>
            <WaitRiskBadge level={activeWait.propertyLossRisk} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Price Movement</span>
            <span className="text-[10px] text-muted-foreground">{activeWait.priceMovement.magnitude}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Market Trend</span>
            <WaitRiskBadge level={activeWait.marketTrendRisk} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioForm({
  localInputs,
  setLocalInputs,
  originalInputs,
  changedFields,
}: {
  localInputs: BuyerInputs;
  setLocalInputs: React.Dispatch<React.SetStateAction<BuyerInputs>>;
  originalInputs: BuyerInputs;
  changedFields: Set<string>;
}) {
  const isCash = localInputs.financing_type === 'Cash';

  const handleContingencyChange = (contingency: Contingency, checked: boolean) => {
    setLocalInputs(prev => {
      let newContingencies: Contingency[];
      
      if (contingency === 'None') {
        newContingencies = checked ? ['None'] : [];
      } else {
        const filtered = prev.contingencies.filter(c => c !== 'None' && c !== contingency);
        if (checked) {
          newContingencies = [...filtered, contingency];
        } else {
          newContingencies = filtered;
        }
      }
      
      return { ...prev, contingencies: newContingencies };
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  // Slider ranges based on original values, fallback to reference_price if offer_price is 0
  const basePrice = originalInputs.offer_price || originalInputs.reference_price || 0;
  const priceMin = Math.round(basePrice * 0.80);
  const priceMax = Math.round(basePrice * 1.30);
  const priceStep = Math.max(1000, Math.round(basePrice * 0.005 / 1000) * 1000);

  return (
    <TooltipProvider>
      <div className="space-y-6 overflow-x-hidden">
        {/* Strategy Presets */}
        <OfferStrategyPresets
          currentInputs={localInputs}
          onApplyPreset={(newInputs) => setLocalInputs(newInputs)}
        />

        {/* Offer Price Slider */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Offer Details</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-1">
                Offer Price
                {changedFields.has('offer_price') && (
                  <span className="text-xs text-accent">Changed</span>
                )}
              </Label>
              <span className="text-sm font-semibold">{formatCurrency(localInputs.offer_price)}</span>
            </div>
            <Slider
              min={priceMin}
              max={priceMax}
              step={priceStep}
              value={[localInputs.offer_price]}
              onValueChange={([val]) => setLocalInputs(prev => ({ ...prev, offer_price: val }))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatCurrency(priceMin)}</span>
              <span className="text-accent">{formatCurrency(originalInputs.offer_price)} (original)</span>
              <span>{formatCurrency(priceMax)}</span>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {/* Financing Type */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center flex-wrap gap-1">
                <span>Financing Type</span>
                {changedFields.has('financing_type') && (
                  <span className="text-xs text-accent">Changed</span>
                )}
              </Label>
              <Select
                value={localInputs.financing_type}
                onValueChange={(value: FinancingType) => 
                  setLocalInputs(prev => ({
                    ...prev,
                    financing_type: value,
                    contingencies: value === 'Cash'
                      ? (prev.contingencies || []).filter(c => c !== 'Financing')
                      : prev.contingencies,
                  }))
                }
              >
                <SelectTrigger className="h-11 min-h-[44px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCING_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Down Payment Slider */}
            {!isCash && (
              <div className="space-y-2">
                <Label className="text-sm flex items-center flex-wrap gap-1">
                  <span>Down Payment</span>
                  {changedFields.has('down_payment_percent') && (
                    <span className="text-xs text-accent">Changed</span>
                  )}
                </Label>
                <Select
                  value={localInputs.down_payment_percent}
                  onValueChange={(value: DownPaymentPercent) => 
                    setLocalInputs(prev => ({ ...prev, down_payment_percent: value }))
                  }
                >
                  <SelectTrigger className="h-11 min-h-[44px] w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOWN_PAYMENT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Contingencies & Terms Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center flex-wrap gap-1">
            <span>Contingencies & Terms</span>
            {changedFields.has('contingencies') && (
              <span className="text-xs text-accent">Changed</span>
            )}
          </h4>
          
          <div className="space-y-2">
            {CONTINGENCY_OPTIONS
              .filter(opt => !(isCash && opt.value === 'Financing'))
              .map((opt) => {
              const isChecked = localInputs.contingencies.includes(opt.value);
              const wasOriginallyChecked = originalInputs.contingencies.includes(opt.value);
              const isChanged = isChecked !== wasOriginallyChecked;
              
              return (
                <div key={opt.value} className="min-h-[44px] flex items-center">
                  <div className="flex items-center gap-3 w-full py-1">
                    <Checkbox
                      id={`scenario-${opt.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => 
                        handleContingencyChange(opt.value, checked === true)
                      }
                      className="h-5 w-5 shrink-0"
                    />
                    <Label 
                      htmlFor={`scenario-${opt.value}`} 
                      className="text-sm cursor-pointer flex items-center gap-2 flex-wrap flex-1 min-w-0"
                    >
                      <span className="break-words">{opt.label}</span>
                      {isChanged && (
                        <span className="text-xs text-accent whitespace-nowrap">
                          {isChecked ? 'Added' : 'Removed'}
                        </span>
                      )}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          type="button" 
                          className="h-8 w-8 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 touch-manipulation"
                          aria-label={`Info about ${opt.label}`}
                        >
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="text-xs">{CONTINGENCY_EXPLANATIONS[opt.value]}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 pt-2">
            {/* Closing Timeline */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center flex-wrap gap-1">
                <span>Closing Timeline</span>
                {changedFields.has('closing_timeline') && (
                  <span className="text-xs text-accent">Changed</span>
                )}
              </Label>
              <Select
                value={localInputs.closing_timeline}
                onValueChange={(value: ClosingTimeline) => 
                  setLocalInputs(prev => ({ ...prev, closing_timeline: value }))
                }
              >
                <SelectTrigger className="h-11 min-h-[44px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLOSING_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Buyer Preference */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center flex-wrap gap-1">
                <span>Buyer Preference</span>
                {changedFields.has('buyer_preference') && (
                  <span className="text-xs text-accent">Changed</span>
                )}
              </Label>
              <Select
                value={localInputs.buyer_preference}
                onValueChange={(value: BuyerPreference) => 
                  setLocalInputs(prev => ({ ...prev, buyer_preference: value }))
                }
              >
                <SelectTrigger className="h-11 min-h-[44px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREFERENCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Live Risk Preview */}
        <LiveRiskPreview inputs={localInputs} />
      </div>
    </TooltipProvider>
  );
}

export function ScenarioExplorer({ originalInputs, onInputsChange, currentInputs, reportId }: ScenarioExplorerProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [localInputs, setLocalInputs] = useState<BuyerInputs>(currentInputs);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [submitTitle, setSubmitTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listen for external open events (from header buttons, etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOpen = () => setIsOpen(true);
    window.addEventListener(SCENARIO_EXPLORER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SCENARIO_EXPLORER_OPEN_EVENT, onOpen);
  }, []);

  // Sync local inputs when currentInputs changes (e.g., after reset)
  useEffect(() => {
    setLocalInputs(currentInputs);
  }, [currentInputs]);

  // Track which fields have been changed from original
  useEffect(() => {
    const changed = new Set<string>();
    if (localInputs.offer_price !== originalInputs.offer_price) changed.add('offer_price');
    if (localInputs.financing_type !== originalInputs.financing_type) changed.add('financing_type');
    if (localInputs.down_payment_percent !== originalInputs.down_payment_percent) changed.add('down_payment_percent');
    if (localInputs.closing_timeline !== originalInputs.closing_timeline) changed.add('closing_timeline');
    if (localInputs.buyer_preference !== originalInputs.buyer_preference) changed.add('buyer_preference');
    
    const originalContingencies = new Set(originalInputs.contingencies);
    const currentContingencies = new Set(localInputs.contingencies);
    if (originalContingencies.size !== currentContingencies.size ||
        [...originalContingencies].some(c => !currentContingencies.has(c))) {
      changed.add('contingencies');
    }
    
    setChangedFields(changed);
  }, [localInputs, originalInputs]);

  // Debounced auto-apply for desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      const timer = setTimeout(() => {
        onInputsChange(localInputs);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [localInputs, onInputsChange, isMobile, isOpen]);

  const handleReset = useCallback(() => {
    setLocalInputs({ ...originalInputs });
    if (!isMobile) {
      onInputsChange({ ...originalInputs });
    }
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

      // Notify agent
      supabase.functions.invoke('report-notifications', {
        body: {
          type: 'scenario_submitted',
          report_id: reportId,
          scenario_title: submitTitle.trim() || 'Untitled Scenario',
        },
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

  // Ref for auto-scrolling content to top
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll content to top when opened
  useEffect(() => {
    if (isOpen && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      }, 50);
    }
  }, [isOpen]);

  // Panel content (shared between mobile drawer and desktop sheet)
  const panelContent = (
    <>
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto px-4 py-4 scenario-drawer-content"
      >
        <ScenarioForm
          localInputs={localInputs}
          setLocalInputs={setLocalInputs}
          originalInputs={originalInputs}
          changedFields={changedFields}
        />
      </div>
      
      {/* Footer with Apply/Reset/Save/Submit buttons */}
      <div 
        className="border-t p-4 space-y-2 bg-background shrink-0"
        style={{ paddingBottom: isMobile ? 'max(1rem, env(safe-area-inset-bottom))' : '1rem' }}
      >
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex-1 h-12 min-h-[44px]"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1 h-12 min-h-[44px]"
          >
            {isApplying ? (
              <span className="animate-pulse">Applying...</span>
            ) : (
              'Apply Changes'
            )}
          </Button>
        </div>
        {reportId && hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveScenario}
              disabled={isSaving}
              className="flex-1 min-h-[40px] text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save Scenario'}
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setShowSubmitDialog(true)}
              className="flex-1 min-h-[40px] text-xs"
            >
              <SendHorizonal className="h-3.5 w-3.5 mr-1.5" />
              Send to Agent
            </Button>
          </div>
        )}
      </div>

      {/* Submit to Agent Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Scenario to Agent</DialogTitle>
            <DialogDescription>
              Your agent will review this scenario and respond.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Title (optional)</Label>
              <Input
                placeholder="e.g., Higher offer with fewer contingencies"
                value={submitTitle}
                onChange={(e) => setSubmitTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Note to Agent (optional)</Label>
              <Textarea
                placeholder="Any context or questions for your agent..."
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                rows={3}
              />
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

  // Mobile: Bottom Drawer
  if (isMobile) {
    return (
      <>
        {/* Sticky bottom pill - positioned above other bottom actions */}
        <div 
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
          style={{ paddingBottom: 'calc(max(0.75rem, env(safe-area-inset-bottom)) + 4.5rem)' }}
        >
          <button
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 min-h-[48px] rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all touch-manipulation"
          >
            <Compass className="h-4 w-4 shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap">Explore Scenarios</span>
            {hasChanges && (
              <Badge variant="accent" className="text-[10px] px-1.5 py-0 ml-1 shrink-0">
                Modified
              </Badge>
            )}
          </button>
        </div>

        {/* Bottom drawer */}
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent 
            className="h-[85vh] flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <DrawerHeader className="border-b pb-4 shrink-0 sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Compass className="h-5 w-5 text-accent shrink-0" />
                  <DrawerTitle className="font-sans text-lg truncate">Scenario Explorer</DrawerTitle>
                  {hasChanges && (
                    <Badge variant="secondary" className="text-xs shrink-0">Modified</Badge>
                  )}
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0">
                    <X className="h-5 w-5" />
                  </Button>
                </DrawerClose>
              </div>
              <DrawerDescription className="text-sm text-muted-foreground mt-1">
                {SCENARIO_EXPLORER_DESCRIPTION}
              </DrawerDescription>
            </DrawerHeader>
            
            {panelContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Right-side Sheet
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] flex flex-col p-0">
        <SheetHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-accent" />
            <SheetTitle className="font-sans text-lg">Scenario Explorer</SheetTitle>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">Modified</Badge>
            )}
          </div>
          <SheetDescription className="text-sm text-muted-foreground">
            {SCENARIO_EXPLORER_DESCRIPTION}
          </SheetDescription>
        </SheetHeader>
        
        {panelContent}
      </SheetContent>
    </Sheet>
  );
}

// Top-of-report entry card for desktop
interface ScenarioExplorerCardProps {
  hasChanges?: boolean;
  onClick: () => void;
  className?: string;
}

export function ScenarioExplorerCard({ hasChanges, onClick, className }: ScenarioExplorerCardProps) {
  return (
    <TooltipProvider>
      <Card 
        className={`pdf-exclude cursor-pointer group hover:border-accent/50 transition-colors ${className || ''}`}
        onClick={onClick}
      >
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-accent/10 shrink-0">
              <Compass className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">Scenario Explorer</h3>
                {hasChanges && (
                  <Badge variant="secondary" className="text-xs">Modified</Badge>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      className="h-5 w-5 flex items-center justify-center shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="What is Scenario Explorer?"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px]">
                    <p className="text-xs">{SCENARIO_EXPLORER_TOOLTIP}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {SCENARIO_EXPLORER_TOOLTIP}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Inline trigger button (legacy, kept for flexibility)
interface ScenarioExplorerTriggerProps {
  hasChanges?: boolean;
  onClick: () => void;
  className?: string;
}

export function ScenarioExplorerTrigger({ hasChanges, onClick, className }: ScenarioExplorerTriggerProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            variant="outline"
            className={`relative gap-2 ${className || ''}`}
          >
            <Compass className="h-4 w-4" />
            <span>Explore Scenarios</span>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            {hasChanges && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <p className="text-xs">{SCENARIO_EXPLORER_TOOLTIP}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Re-export for backwards compatibility
export { ScenarioExplorer as WhatIfPanel };
