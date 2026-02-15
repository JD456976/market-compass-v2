import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, ArrowRight, Building2, Home, Sparkles, DollarSign, RotateCcw, Check, FileText, ClipboardList, Pencil, Save, Loader2 } from 'lucide-react';
import { MLSVoiceCameraInput } from '@/components/MLSVoiceCameraInput';
import { ReportTemplateSelector, ReportTemplate } from '@/components/report/ReportTemplateSelector';
import { Session, PropertyType, Condition, DesiredTimeframe, StrategyPreference, ShowingTrafficLevel, PriceChangeDirection } from '@/types';
import { generateId } from '@/lib/storage';
import { upsertSessionAsync } from '@/lib/storage';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { formatPriceDisplay, parsePriceValue, stripCurrencyChars } from '@/lib/currencyFormat';
import { AddressInput, parseAddressComponents } from '@/components/AddressInput';
import { AutoSaveIndicator } from '@/components/AutoSaveIndicator';
import { MarketScenarioTooltip } from '@/components/MarketScenarioTooltip';
import { SessionTemplate } from '@/lib/templates';
import { loadMarketScenarios, MarketScenario, getMarketScenarioById } from '@/lib/marketScenarios';
import { useToast } from '@/hooks/use-toast';
import { ReviewSection, ReviewRow } from '@/components/ReviewStep';

const STEPS = [
  { label: 'Property', icon: Home },
  { label: 'Strategy', icon: Sparkles },
  { label: 'Notes', icon: FileText },
  { label: 'Review', icon: ClipboardList },
] as const;

// Default form values
const DEFAULT_VALUES = {
  clientName: '',
  location: '',
  propertyType: 'SFH' as PropertyType,
  condition: 'Maintained' as Condition,
  selectedScenarioId: undefined as string | undefined,
  listPrice: '',
  timeframe: '60' as DesiredTimeframe,
  strategy: 'Balanced' as StrategyPreference,
  agentNotes: '',
  clientNotes: '',
  showingTraffic: 'Unknown' as ShowingTrafficLevel,
  offerDeadline: '',
  priceChangeDirection: 'None' as PriceChangeDirection,
  priceChangeAmount: '',
};

const SellerFlow = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [stepDirection, setStepDirection] = useState(1);
  const [marketScenarios, setMarketScenarios] = useState<MarketScenario[]>([]);
  const [appliedTemplate, setAppliedTemplate] = useState<SessionTemplate | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string>(() => generateId());
  
  const [clientName, setClientName] = useState(DEFAULT_VALUES.clientName);
  const [location, setLocation] = useState(DEFAULT_VALUES.location);
  const [fullAddress, setFullAddress] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>(DEFAULT_VALUES.propertyType);
  const [condition, setCondition] = useState<Condition>(DEFAULT_VALUES.condition);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>(DEFAULT_VALUES.selectedScenarioId);
  const [listPrice, setListPrice] = useState<string>(DEFAULT_VALUES.listPrice);
  const [timeframe, setTimeframe] = useState<DesiredTimeframe>(DEFAULT_VALUES.timeframe);
  const [strategy, setStrategy] = useState<StrategyPreference>(DEFAULT_VALUES.strategy);
  const [agentNotes, setAgentNotes] = useState(DEFAULT_VALUES.agentNotes);
  const [clientNotes, setClientNotes] = useState(DEFAULT_VALUES.clientNotes);
  const [showingTraffic, setShowingTraffic] = useState<ShowingTrafficLevel>(DEFAULT_VALUES.showingTraffic);
  const [offerDeadline, setOfferDeadline] = useState(DEFAULT_VALUES.offerDeadline);
  const [priceChangeDirection, setPriceChangeDirection] = useState<PriceChangeDirection>(DEFAULT_VALUES.priceChangeDirection);
  const [priceChangeAmount, setPriceChangeAmount] = useState(DEFAULT_VALUES.priceChangeAmount);
  const [propertyFactors, setPropertyFactors] = useState<import('@/types').PropertyFactor[]>([]);
  const [reportTemplate, setReportTemplate] = useState<ReportTemplate>('modern');
  
  // Scenario overrides
  const [showOverrides, setShowOverrides] = useState(false);
  const [demandOverride, setDemandOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [competitionOverride, setCompetitionOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [pricingOverride, setPricingOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);

  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setMarketScenarios(loadMarketScenarios());
    
    // Only restore session if explicitly returning from report (flag set by report page)
    const returningToEdit = sessionStorage.getItem('returning_to_edit');
    const sessionData = sessionStorage.getItem('current_session');
    if (returningToEdit && sessionData) {
      sessionStorage.removeItem('returning_to_edit');
      try {
        const session: Session = JSON.parse(sessionData);
        if (session.session_type === 'Seller') {
          setClientName(session.client_name || '');
          setLocation(session.location || '');
          if (session.address_fields?.address_line) setFullAddress(session.address_fields.address_line);
          setPropertyType(session.property_type);
          setCondition(session.condition);
          if (session.market_scenario_id) setSelectedScenarioId(session.market_scenario_id);
          setDraftId(session.id);
          if (session.property_factors) setPropertyFactors(session.property_factors);
          const si = session.seller_inputs;
          if (si) {
            if (si.seller_selected_list_price) setListPrice(String(si.seller_selected_list_price));
            if (si.desired_timeframe) setTimeframe(si.desired_timeframe);
            if (si.strategy_preference) setStrategy(si.strategy_preference);
            if (si.agent_notes) setAgentNotes(si.agent_notes);
            if (si.client_notes) setClientNotes(si.client_notes);
          }
          // Navigate to review step so user can re-generate or edit
          setStep(STEPS.length - 1);
          return; // Skip template prefill
        }
      } catch {
        // Ignore parse errors
      }
    }

    const templateData = sessionStorage.getItem('prefill_template');
    if (templateData) {
      try {
        const template: SessionTemplate = JSON.parse(templateData);
        if (template.session_type === 'Seller') {
          setAppliedTemplate(template);
          setPropertyType(template.property_type);
          setCondition(template.condition);
          if (template.market_scenario_id) {
            setSelectedScenarioId(template.market_scenario_id);
          }
          if (template.notes_boilerplate) {
            setClientNotes(template.notes_boilerplate);
          }
          if (template.seller_defaults) {
            setTimeframe(template.seller_defaults.desired_timeframe);
            setStrategy(template.seller_defaults.strategy_preference);
          }
        }
        sessionStorage.removeItem('prefill_template');
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleResetToTemplate = () => {
    if (!appliedTemplate) return;
    setPropertyType(appliedTemplate.property_type);
    setCondition(appliedTemplate.condition);
    if (appliedTemplate.market_scenario_id) {
      setSelectedScenarioId(appliedTemplate.market_scenario_id);
    }
    if (appliedTemplate.notes_boilerplate) {
      setClientNotes(appliedTemplate.notes_boilerplate);
    }
    if (appliedTemplate.seller_defaults) {
      setTimeframe(appliedTemplate.seller_defaults.desired_timeframe);
      setStrategy(appliedTemplate.seller_defaults.strategy_preference);
    }
    setDemandOverride(undefined);
    setCompetitionOverride(undefined);
    setPricingOverride(undefined);
  };

  const handleFullReset = useCallback(() => {
    setClientName(DEFAULT_VALUES.clientName);
    setLocation(DEFAULT_VALUES.location);
    setFullAddress('');
    setPropertyType(DEFAULT_VALUES.propertyType);
    setCondition(DEFAULT_VALUES.condition);
    setSelectedScenarioId(DEFAULT_VALUES.selectedScenarioId);
    setListPrice(DEFAULT_VALUES.listPrice);
    setTimeframe(DEFAULT_VALUES.timeframe);
    setStrategy(DEFAULT_VALUES.strategy);
    setAgentNotes(DEFAULT_VALUES.agentNotes);
    setClientNotes(DEFAULT_VALUES.clientNotes);
    setDemandOverride(undefined);
    setCompetitionOverride(undefined);
    setPricingOverride(undefined);
    setShowOverrides(false);
    setAttempted(false);
    setAppliedTemplate(null);
    setDraftId(generateId());
    setStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
      title: "Form cleared",
      description: "All fields have been reset to defaults.",
    });
  }, [toast]);

  const buildSession = (): Session => ({
    id: draftId,
    session_type: 'Seller',
    client_name: clientName,
    location,
    property_type: propertyType,
    condition,
    market_scenario_id: selectedScenarioId || undefined,
    market_scenario_overrides: (demandOverride || competitionOverride || pricingOverride) ? {
      demandLevel: demandOverride,
      competitionLevel: competitionOverride,
      pricingSensitivity: pricingOverride,
    } : undefined,
    address_fields: fullAddress ? {
      address_line: fullAddress,
      city: location.split(',')[0]?.trim(),
      state: location.split(',')[1]?.trim(),
    } : undefined,
    property_factors: propertyFactors.length > 0 ? propertyFactors : undefined,
    seller_inputs: {
      seller_selected_list_price: parsePriceValue(listPrice),
      desired_timeframe: timeframe,
      strategy_preference: strategy,
      agent_notes: agentNotes || undefined,
      client_notes: clientNotes || undefined,
      showing_traffic: showingTraffic !== 'Unknown' ? showingTraffic : undefined,
      offer_deadline: offerDeadline || undefined,
      price_change_direction: priceChangeDirection !== 'None' ? priceChangeDirection : undefined,
      price_change_amount: priceChangeAmount ? parsePriceValue(priceChangeAmount) : undefined,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const handleGenerate = () => {
    const session = buildSession();
    sessionStorage.removeItem('report_entry_context');
    sessionStorage.setItem('current_session', JSON.stringify(session));
    navigate('/seller/report');
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const session = buildSession();
      await upsertSessionAsync(session);
      toast({
        title: "Draft saved",
        description: `"${clientName || 'Untitled'}" saved to Drafts.`,
      });
      navigate('/drafts');
    } catch {
      toast({
        title: "Save failed",
        description: "Could not save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Per-step validation
  const stepErrors: Record<number, string[]> = {
    0: [
      ...(!clientName.trim() ? ['client_name'] : []),
      ...(!location.trim() ? ['location'] : []),
    ],
    1: [
      ...(!listPrice || parsePriceValue(listPrice) <= 0 ? ['list_price'] : []),
    ],
    2: [], // Notes step has no required fields
    3: [], // Review step — no fields
  };

  const currentStepValid = stepErrors[step]?.length === 0;
  const allValid = Object.values(stepErrors).every(e => e.length === 0);

  const goNext = () => {
    setAttempted(true);
    if (!currentStepValid) return;
    if (step < STEPS.length - 1) {
      setStepDirection(1);
      setStep(s => s + 1);
      setAttempted(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setStepDirection(-1);
      setStep(s => s - 1);
      setAttempted(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (target: number) => {
    if (target < step) {
      setStepDirection(-1);
      setStep(target);
      setAttempted(false);
    } else if (target > step) {
      setAttempted(true);
      if (currentStepValid) {
        setStepDirection(1);
        setStep(target);
        setAttempted(false);
      }
    }
  };

  const onGenerateReport = () => {
    setAttempted(true);
    if (!allValid) return;
    handleGenerate();
  };

  // Keyboard navigation: Enter = next/generate, Escape = back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA') return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (step < STEPS.length - 1) goNext();
        else onGenerateReport();
      } else if (e.key === 'Escape') {
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentStepValid, allValid]);

  // Auto-save draft on any input change (debounced 1.5s) + on unmount
  const hasMeaningfulInput = !!(clientName.trim() || location.trim() || listPrice);
  useAutoSaveDraft(
    buildSession,
    hasMeaningfulInput,
    [clientName, location, propertyType, condition, selectedScenarioId, listPrice, timeframe, strategy, agentNotes, clientNotes, draftId],
  );

  const selectedScenario = selectedScenarioId ? getMarketScenarioById(selectedScenarioId) : undefined;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
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
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Seller Analysis</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
                    {hasMeaningfulInput && <AutoSaveIndicator deps={[clientName, location, listPrice, agentNotes, clientNotes]} />}
                  </div>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowResetDialog(true)} className="min-h-[44px]">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          {/* Progress Stepper */}
          <div className="mt-4 flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isCompleted = i < step;
              const isCurrent = i === step;
              const hasErrors = attempted && i === step && !currentStepValid;
              return (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className="flex-1 group"
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <div className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                      ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                      ${isCurrent ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                      ${hasErrors ? 'ring-2 ring-destructive/50' : ''}
                    `}>
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className={`
                    h-1 rounded-full transition-all
                    ${isCompleted ? 'bg-primary' : ''}
                    ${isCurrent ? 'bg-accent' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-muted' : ''}
                  `} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <AnimatePresence mode="wait" custom={stepDirection}>
          <motion.div
            key={step}
            custom={stepDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* Step 0: Property & Client */}
            {step === 0 && (
              <>
              {/* Smart Input - Voice & Camera */}
              <MLSVoiceCameraInput
                reportType="seller"
                onDataExtracted={(data) => {
                  if (data.clientName) setClientName(data.clientName);
                  if (data.location) setLocation(data.location);
                  if (data.address) setFullAddress(data.address);
                  if (data.propertyType) setPropertyType(data.propertyType as PropertyType);
                  if (data.condition) setCondition(data.condition as Condition);
                  if (data.listPrice) setListPrice(String(data.listPrice));
                  if (data.notes) setClientNotes(prev => prev ? `${prev}\n${data.notes}` : data.notes || '');
                  if (data.factors) setPropertyFactors(data.factors);
                }}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-accent" />
                    Property & Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="John Smith"
                      className={`h-11 ${attempted && !clientName.trim() ? 'border-destructive' : ''}`}
                    />
                    {attempted && !clientName.trim() && (
                      <p className="text-xs text-destructive">Client name is required</p>
                    )}
                  </div>

                  <AddressInput
                    town={location}
                    onTownChange={setLocation}
                    fullAddress={fullAddress}
                    onFullAddressChange={setFullAddress}
                    hasError={attempted && !location.trim()}
                    attempted={attempted}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Property Type</Label>
                      <Select value={propertyType} onValueChange={(v: PropertyType) => setPropertyType(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SFH">Single Family Home</SelectItem>
                          <SelectItem value="Condo">Condo</SelectItem>
                          <SelectItem value="MFH">Multi-Family Home</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={condition} onValueChange={(v: Condition) => setCondition(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dated">Dated</SelectItem>
                          <SelectItem value="Maintained">Maintained</SelectItem>
                          <SelectItem value="Updated">Updated</SelectItem>
                          <SelectItem value="Renovated">Renovated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Market Scenario <span className="text-muted-foreground text-xs ml-1">(Optional)</span>
                      <MarketScenarioTooltip />
                    </Label>
                    <Select value={selectedScenarioId ?? "__none__"} onValueChange={(v) => setSelectedScenarioId(v === "__none__" ? undefined : v)}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select a market scenario..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {marketScenarios.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedScenario && (
                      <p className="text-xs text-muted-foreground mt-1">{selectedScenario.summary}</p>
                    )}
                  </div>

                  {selectedScenarioId && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowOverrides(!showOverrides)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                      >
                        {showOverrides ? 'Hide' : 'Adjust'} scenario for this session
                      </button>
                      
                      {showOverrides && (
                        <div className="grid md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                          <div className="space-y-2">
                            <Label className="text-xs">Demand Level</Label>
                            <Select value={demandOverride || "__default__"} onValueChange={(v) => setDemandOverride(v === "__default__" ? undefined : v as 'low' | 'medium' | 'high')}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__default__">Default</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Competition</Label>
                            <Select value={competitionOverride || "__default__"} onValueChange={(v) => setCompetitionOverride(v === "__default__" ? undefined : v as 'low' | 'medium' | 'high')}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__default__">Default</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Pricing Sensitivity</Label>
                            <Select value={pricingOverride || "__default__"} onValueChange={(v) => setPricingOverride(v === "__default__" ? undefined : v as 'low' | 'medium' | 'high')}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__default__">Default</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              </>
            )}

            {/* Step 1: Listing Strategy */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Listing Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="listPrice">List Price <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="listPrice"
                        type="text"
                        inputMode="decimal"
                        value={formatPriceDisplay(listPrice)}
                        onChange={(e) => setListPrice(stripCurrencyChars(e.target.value))}
                        placeholder="500,000"
                        className={`h-11 pl-10 ${attempted && (!listPrice || parsePriceValue(listPrice) <= 0) ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {attempted && (!listPrice || parsePriceValue(listPrice) <= 0) && (
                      <p className="text-xs text-destructive">List price is required</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Desired Timeframe</Label>
                      <Select value={timeframe} onValueChange={(v: DesiredTimeframe) => setTimeframe(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90+">90+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Strategy Preference</Label>
                      <Select value={strategy} onValueChange={(v: StrategyPreference) => setStrategy(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Maximize price">Maximize price</SelectItem>
                          <SelectItem value="Balanced">Balanced</SelectItem>
                          <SelectItem value="Prioritize speed">Prioritize speed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Signal-Based Intelligence */}
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-accent">📡 Signal-Based Intelligence</span>
                      <span className="text-[10px] text-muted-foreground">(Agent-reported)</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Showing Traffic</Label>
                        <Select value={showingTraffic} onValueChange={(v: ShowingTrafficLevel) => setShowingTraffic(v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unknown">Unknown</SelectItem>
                            <SelectItem value="Minimal">Minimal</SelectItem>
                            <SelectItem value="Steady">Steady</SelectItem>
                            <SelectItem value="Heavy">Heavy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Offer Deadline</Label>
                        <Input
                          type="date"
                          value={offerDeadline}
                          onChange={(e) => setOfferDeadline(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Price Changes</Label>
                        <Select value={priceChangeDirection} onValueChange={(v: PriceChangeDirection) => setPriceChangeDirection(v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">No changes</SelectItem>
                            <SelectItem value="Reduced">Price reduced</SelectItem>
                            <SelectItem value="Increased">Price increased</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {priceChangeDirection !== 'None' && (
                        <div className="space-y-2">
                          <Label className="text-xs">Change Amount</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={formatPriceDisplay(priceChangeAmount)}
                              onChange={(e) => setPriceChangeAmount(stripCurrencyChars(e.target.value))}
                              placeholder="e.g., 25,000"
                              className="h-9 text-sm pl-8"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Notes */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="clientNotes">Notes for Client <span className="text-muted-foreground text-xs">(Optional — included in PDF/Share)</span></Label>
                    <Textarea
                      id="clientNotes"
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Notes visible to the client in exports and shared links..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agentNotes">Agent Notes <span className="text-muted-foreground text-xs">(Private — never shared)</span></Label>
                    <Textarea
                      id="agentNotes"
                      value={agentNotes}
                      onChange={(e) => setAgentNotes(e.target.value)}
                      placeholder="Private notes for your reference only..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-accent" />
                    Review Your Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ReviewSection title="Property & Client" stepIndex={0} onEdit={goToStep}>
                    <ReviewRow label="Client" value={clientName} />
                    <ReviewRow label="Location" value={location} />
                    <ReviewRow label="Property Type" value={propertyType === 'SFH' ? 'Single Family Home' : propertyType === 'MFH' ? 'Multi-Family Home' : 'Condo'} />
                    <ReviewRow label="Condition" value={condition} />
                    {selectedScenario && <ReviewRow label="Market Scenario" value={selectedScenario.name} />}
                  </ReviewSection>

                  <ReviewSection title="Listing Strategy" stepIndex={1} onEdit={goToStep}>
                    <ReviewRow label="List Price" value={listPrice ? `$${Number(listPrice).toLocaleString()}` : '—'} />
                    <ReviewRow label="Desired Timeframe" value={`${timeframe} days`} />
                    <ReviewRow label="Strategy" value={strategy} />
                  </ReviewSection>

                  <ReviewSection title="Notes" stepIndex={2} onEdit={goToStep}>
                    <ReviewRow label="Client Notes" value={clientNotes || '—'} />
                    <ReviewRow label="Agent Notes" value={agentNotes || '—'} />
                  </ReviewSection>

                  {/* Report Type */}
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-sm font-medium mb-3">Report Style</p>
                    <ReportTemplateSelector selected={reportTemplate} onSelect={setReportTemplate} />
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Step Navigation */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={step === 0}
            className="min-w-[120px]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              variant="accent"
              onClick={goNext}
              className="min-w-[120px]"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={saving || !clientName.trim()}
                className="min-w-[120px]"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Draft
              </Button>
              <Button
                variant="accent"
                onClick={onGenerateReport}
                size="lg"
                className="min-w-[180px]"
              >
                Generate Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Validation message on final step */}
        {step === STEPS.length - 1 && attempted && !allValid && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            Please go back and complete required fields to generate the report.
          </div>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all fields and reset the form to its default state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowResetDialog(false); handleFullReset(); }}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SellerFlow;
