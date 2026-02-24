import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ArrowLeft, ArrowRight, Users, Home, Sparkles, DollarSign, FileCheck, RotateCcw, Check, ClipboardList, Pencil, Save, Loader2 } from 'lucide-react';
import { ListingNavigatorImportPanel } from '@/components/ListingNavigatorImportPanel';
import { MLSVoiceCameraInput } from '@/components/MLSVoiceCameraInput';
import { ReportTemplateSelector, ReportTemplate } from '@/components/report/ReportTemplateSelector';
import { 
  Session, PropertyType, Condition, FinancingType, 
  DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference,
  ShowingTrafficLevel, PriceChangeDirection
} from '@/types';
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
import { useAddressRecall } from '@/hooks/useAddressRecall';
import { AddressRecallPrompt } from '@/components/AddressRecallPrompt';

const contingencyOptions: { value: Contingency; label: string }[] = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Financing', label: 'Financing' },
  { value: 'Appraisal', label: 'Appraisal' },
  { value: 'Home sale', label: 'Home Sale' },
  { value: 'None', label: 'None (Waiving all)' },
];

const STEPS = [
  { label: 'Property', icon: Home },
  { label: 'Market', icon: Sparkles },
  { label: 'Offer', icon: DollarSign },
  { label: 'Terms', icon: FileCheck },
  { label: 'Review', icon: ClipboardList },
] as const;

// Default form values
const DEFAULT_VALUES = {
  clientName: '',
  location: '',
  propertyType: 'SFH' as PropertyType,
  condition: 'Maintained' as Condition,
  selectedScenarioId: undefined as string | undefined,
  offerPrice: '',
  referencePrice: '',
  marketConditions: 'Balanced' as 'Hot' | 'Balanced' | 'Cool',
  daysOnMarket: '',
  investmentType: 'Primary Residence' as 'Primary Residence' | 'Investment Property',
  financingType: 'Conventional' as FinancingType,
  downPayment: '20+' as DownPaymentPercent,
  contingencies: ['Inspection', 'Financing'] as Contingency[],
  closingTimeline: '21-30' as ClosingTimeline,
  buyerPreference: 'Balanced' as BuyerPreference,
  agentNotes: '',
  clientNotes: '',
  showingTraffic: 'Unknown' as ShowingTrafficLevel,
  offerDeadline: '',
  priceChangeDirection: 'None' as PriceChangeDirection,
  priceChangeAmount: '',
};

const BuyerFlow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [offerPrice, setOfferPrice] = useState<string>(DEFAULT_VALUES.offerPrice);
  const [referencePrice, setReferencePrice] = useState<string>(DEFAULT_VALUES.referencePrice);
  const [marketConditions, setMarketConditions] = useState<'Hot' | 'Balanced' | 'Cool'>(DEFAULT_VALUES.marketConditions);
  const [daysOnMarket, setDaysOnMarket] = useState<string>(DEFAULT_VALUES.daysOnMarket);
  const [investmentType, setInvestmentType] = useState<'Primary Residence' | 'Investment Property'>(DEFAULT_VALUES.investmentType);
  const [financingType, setFinancingType] = useState<FinancingType>(DEFAULT_VALUES.financingType);
  const [downPayment, setDownPayment] = useState<DownPaymentPercent>(DEFAULT_VALUES.downPayment);
  const [contingencies, setContingencies] = useState<Contingency[]>(DEFAULT_VALUES.contingencies);
  const [closingTimeline, setClosingTimeline] = useState<ClosingTimeline>(DEFAULT_VALUES.closingTimeline);
  const [buyerPreference, setBuyerPreference] = useState<BuyerPreference>(DEFAULT_VALUES.buyerPreference);
  const [agentNotes, setAgentNotes] = useState(DEFAULT_VALUES.agentNotes);
  const [clientNotes, setClientNotes] = useState(DEFAULT_VALUES.clientNotes);
  const [showingTraffic, setShowingTraffic] = useState<ShowingTrafficLevel>(DEFAULT_VALUES.showingTraffic);
  const [offerDeadline, setOfferDeadline] = useState(DEFAULT_VALUES.offerDeadline);
  const [priceChangeDirection, setPriceChangeDirection] = useState<PriceChangeDirection>(DEFAULT_VALUES.priceChangeDirection);
  const [priceChangeAmount, setPriceChangeAmount] = useState(DEFAULT_VALUES.priceChangeAmount);
  const [propertyFactors, setPropertyFactors] = useState<import('@/types').PropertyFactor[]>([]);
  const [listingHistory, setListingHistory] = useState<import('@/types').ListingHistory | undefined>();
  const [reportTemplate, setReportTemplate] = useState<ReportTemplate>('modern');
  
  // Scenario overrides
  const [showOverrides, setShowOverrides] = useState(false);
  const [demandOverride, setDemandOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [competitionOverride, setCompetitionOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [pricingOverride, setPricingOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);

  const [attempted, setAttempted] = useState(false);

  // Address recall - find previous sessions matching the entered address
  const { matches: recallMatches, dismiss: dismissRecall } = useAddressRecall(fullAddress, location, draftId);

  const handleRecallLoad = useCallback((session: Session) => {
    setPropertyType(session.property_type);
    setCondition(session.condition);
    if (session.market_scenario_id) setSelectedScenarioId(session.market_scenario_id);
    if (session.property_factors) setPropertyFactors(session.property_factors);
    if (session.listing_history) setListingHistory(session.listing_history);
    const bi = session.buyer_inputs;
    if (bi) {
      if (bi.reference_price) setReferencePrice(String(bi.reference_price));
      if (bi.market_conditions) setMarketConditions(bi.market_conditions);
      if (bi.days_on_market) setDaysOnMarket(String(bi.days_on_market));
      if (bi.investment_type) setInvestmentType(bi.investment_type);
      if (bi.financing_type) setFinancingType(bi.financing_type);
      if (bi.down_payment_percent) setDownPayment(bi.down_payment_percent);
      if (bi.contingencies) setContingencies(bi.contingencies);
      if (bi.closing_timeline) setClosingTimeline(bi.closing_timeline);
      if (bi.buyer_preference) setBuyerPreference(bi.buyer_preference);
    }
    dismissRecall();
    toast({ title: "Previous details loaded", description: `Loaded property details from "${session.client_name || 'previous session'}".` });
  }, [dismissRecall, toast]);

  useEffect(() => {
    setMarketScenarios(loadMarketScenarios());

    // Pre-fill from Listing Navigator
    const fromLN = searchParams.get('from') === 'listing-navigator';
    if (fromLN) {
      const addr = searchParams.get('address');
      const price = searchParams.get('listPrice');
      if (addr) { setLocation(addr); setFullAddress(addr); }
      if (price) { setReferencePrice(price); }
      toast({ title: 'Listing Navigator data loaded', description: 'Address and list price pre-filled from your audit.' });
    }

    // Only restore session if explicitly returning from report (flag set by report page)
    const returningToEdit = sessionStorage.getItem('returning_to_edit');
    const sessionData = sessionStorage.getItem('current_session');
    if (returningToEdit && sessionData) {
      sessionStorage.removeItem('returning_to_edit');
      try {
        const session: Session = JSON.parse(sessionData);
        if (session.session_type === 'Buyer') {
          setClientName(session.client_name || '');
          setLocation(session.location || '');
          if (session.address_fields?.address_line) setFullAddress(session.address_fields.address_line);
          setPropertyType(session.property_type);
          setCondition(session.condition);
          if (session.market_scenario_id) setSelectedScenarioId(session.market_scenario_id);
          setDraftId(session.id);
          if (session.property_factors) setPropertyFactors(session.property_factors);
          if (session.listing_history) setListingHistory(session.listing_history);
          const bi = session.buyer_inputs;
          if (bi) {
            if (bi.offer_price) setOfferPrice(String(bi.offer_price));
            if (bi.reference_price) setReferencePrice(String(bi.reference_price));
            if (bi.market_conditions) setMarketConditions(bi.market_conditions);
            if (bi.days_on_market) setDaysOnMarket(String(bi.days_on_market));
            if (bi.investment_type) setInvestmentType(bi.investment_type);
            if (bi.financing_type) setFinancingType(bi.financing_type);
            if (bi.down_payment_percent) setDownPayment(bi.down_payment_percent);
            if (bi.contingencies) setContingencies(bi.contingencies);
            if (bi.closing_timeline) setClosingTimeline(bi.closing_timeline);
            if (bi.buyer_preference) setBuyerPreference(bi.buyer_preference);
            if (bi.agent_notes) setAgentNotes(bi.agent_notes);
            if (bi.client_notes) setClientNotes(bi.client_notes);
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
        if (template.session_type === 'Buyer') {
          setAppliedTemplate(template);
          setPropertyType(template.property_type);
          setCondition(template.condition);
          if (template.market_scenario_id) {
            setSelectedScenarioId(template.market_scenario_id);
          }
          if (template.notes_boilerplate) {
            setClientNotes(template.notes_boilerplate);
          }
          if (template.buyer_defaults) {
            setFinancingType(template.buyer_defaults.financing_type);
            setDownPayment(template.buyer_defaults.down_payment_percent);
            setContingencies(template.buyer_defaults.contingencies);
            setClosingTimeline(template.buyer_defaults.closing_timeline);
            setBuyerPreference(template.buyer_defaults.buyer_preference);
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
    if (appliedTemplate.buyer_defaults) {
      setFinancingType(appliedTemplate.buyer_defaults.financing_type);
      setDownPayment(appliedTemplate.buyer_defaults.down_payment_percent);
      setContingencies(appliedTemplate.buyer_defaults.contingencies);
      setClosingTimeline(appliedTemplate.buyer_defaults.closing_timeline);
      setBuyerPreference(appliedTemplate.buyer_defaults.buyer_preference);
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
    setOfferPrice(DEFAULT_VALUES.offerPrice);
    setReferencePrice(DEFAULT_VALUES.referencePrice);
    setMarketConditions(DEFAULT_VALUES.marketConditions);
    setDaysOnMarket(DEFAULT_VALUES.daysOnMarket);
    setInvestmentType(DEFAULT_VALUES.investmentType);
    setFinancingType(DEFAULT_VALUES.financingType);
    setDownPayment(DEFAULT_VALUES.downPayment);
    setContingencies(DEFAULT_VALUES.contingencies);
    setClosingTimeline(DEFAULT_VALUES.closingTimeline);
    setBuyerPreference(DEFAULT_VALUES.buyerPreference);
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

  const handleContingencyChange = (contingency: Contingency, checked: boolean) => {
    if (contingency === 'None') {
      setContingencies(checked ? ['None'] : []);
    } else {
      if (checked) {
        setContingencies(prev => prev.filter(c => c !== 'None').concat(contingency));
      } else {
        setContingencies(prev => prev.filter(c => c !== contingency));
      }
    }
  };

  const buildSession = (): Session => ({
    id: draftId,
    session_type: 'Buyer',
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
    client_privacy: true,
    property_factors: propertyFactors.length > 0 ? propertyFactors : undefined,
    listing_history: listingHistory,
    buyer_inputs: {
      offer_price: parsePriceValue(offerPrice),
      reference_price: referencePrice ? parsePriceValue(referencePrice) : undefined,
      market_conditions: marketConditions,
      days_on_market: daysOnMarket ? parseInt(daysOnMarket) : undefined,
      investment_type: investmentType,
      financing_type: financingType,
      down_payment_percent: downPayment,
      contingencies,
      closing_timeline: closingTimeline,
      buyer_preference: buyerPreference,
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
    navigate('/buyer/report');
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
    1: [], // No required fields on market context step
    2: [
      ...(!offerPrice || parsePriceValue(offerPrice) <= 0 ? ['offer_price'] : []),
    ],
    3: [
      ...(contingencies.length === 0 ? ['contingencies'] : []),
    ],
    4: [], // Review step — no fields
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
    // Allow going back freely; going forward requires current step valid
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
      if (tag === 'TEXTAREA') return; // Don't hijack Enter in textareas
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
  const hasMeaningfulInput = !!(clientName.trim() || location.trim() || offerPrice);
  useAutoSaveDraft(
    buildSession,
    hasMeaningfulInput,
    [clientName, location, propertyType, condition, selectedScenarioId, offerPrice, referencePrice, marketConditions, daysOnMarket, investmentType, financingType, downPayment, contingencies, closingTimeline, buyerPreference, agentNotes, clientNotes, draftId],
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
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Buyer Analysis</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
                    {hasMeaningfulInput && <AutoSaveIndicator deps={[clientName, location, offerPrice, referencePrice, agentNotes, clientNotes]} />}
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
              {/* Import from Listing Navigator */}
              <ListingNavigatorImportPanel
                reportType="buyer"
                onImport={(data) => {
                  if (data.address) { setFullAddress(data.address); setLocation(data.address); }
                  if (data.price) setReferencePrice(String(data.price));
                }}
              />

              {/* Smart Input - Voice & Camera */}
              <MLSVoiceCameraInput
                reportType="buyer"
                onDataExtracted={(data) => {
                  if (data.clientName) setClientName(data.clientName);
                  if (data.location) setLocation(data.location);
                  if (data.address) setFullAddress(data.address);
                  if (data.propertyType) setPropertyType(data.propertyType as PropertyType);
                  if (data.condition) setCondition(data.condition as Condition);
                  if (data.listPrice) setOfferPrice(String(data.listPrice));
                  if (data.daysOnMarket) setDaysOnMarket(String(data.daysOnMarket));
                  if (data.notes) setClientNotes(prev => prev ? `${prev}\n${data.notes}` : data.notes || '');
                  if (data.listPrice) setReferencePrice(String(data.listPrice));
                  if (data.factors) setPropertyFactors(data.factors);
                  if (data.listingHistory) setListingHistory(data.listingHistory);
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="clientName"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Jane Doe"
                        className={`h-11 ${attempted && !clientName.trim() ? 'border-destructive' : ''}`}
                      />
                      {attempted && !clientName.trim() && (
                        <p className="text-xs text-destructive">Client name is required</p>
                      )}
                    </div>
                    <div className="space-y-2">
                    <AddressInput
                      town={location}
                      onTownChange={setLocation}
                      fullAddress={fullAddress}
                      onFullAddressChange={setFullAddress}
                      hasError={attempted && !location.trim()}
                      attempted={attempted}
                    />
                    <AddressRecallPrompt
                      matches={recallMatches}
                      onLoad={handleRecallLoad}
                      onDismiss={dismissRecall}
                    />
                    </div>
                  </div>

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
                      <Label>Property Condition</Label>
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

            {/* Step 1: Market Context */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Market Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Market Conditions <span className="text-destructive">*</span></Label>
                      <Select value={marketConditions} onValueChange={(v: 'Hot' | 'Balanced' | 'Cool') => setMarketConditions(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hot">Hot Market</SelectItem>
                          <SelectItem value="Balanced">Balanced Market</SelectItem>
                          <SelectItem value="Cool">Cool Market</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daysOnMarket">Days on Market <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                      <Input
                        id="daysOnMarket"
                        type="number"
                        value={daysOnMarket}
                        onChange={(e) => setDaysOnMarket(e.target.value)}
                        placeholder="e.g., 14"
                        className="h-11"
                        min={0}
                        max={365}
                      />
                      <p className="text-xs text-muted-foreground">Leave blank if unknown or new listing</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Property Purpose <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                      <Select value={investmentType} onValueChange={(v: 'Primary Residence' | 'Investment Property') => setInvestmentType(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Primary Residence">Primary Residence</SelectItem>
                          <SelectItem value="Investment Property">Investment Property</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="referencePrice">Reference / List Price <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="referencePrice"
                          type="text"
                          inputMode="decimal"
                          value={formatPriceDisplay(referencePrice)}
                          onChange={(e) => setReferencePrice(stripCurrencyChars(e.target.value))}
                          placeholder="e.g., 900,000"
                          className="h-11 pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">List price or expected market value for scoring accuracy</p>
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

            {/* Step 2: Offer Details */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-accent" />
                    Offer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="offerPrice">Offer Price <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="offerPrice"
                        type="text"
                        inputMode="decimal"
                        value={formatPriceDisplay(offerPrice)}
                        onChange={(e) => setOfferPrice(stripCurrencyChars(e.target.value))}
                        placeholder="500,000"
                        className={`h-11 pl-10 ${attempted && (!offerPrice || parsePriceValue(offerPrice) <= 0) ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {attempted && (!offerPrice || parsePriceValue(offerPrice) <= 0) && (
                      <p className="text-xs text-destructive">Offer price is required</p>
                    )}
                  </div>

                  <div className={`grid gap-4 ${financingType === 'Cash' ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                    <div className="space-y-2">
                      <Label>Financing Type</Label>
                      <Select value={financingType} onValueChange={(v: FinancingType) => {
                        setFinancingType(v);
                        if (v === 'Cash') {
                          setContingencies(prev => prev.filter(c => c !== 'Financing'));
                        }
                      }}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Conventional">Conventional</SelectItem>
                          <SelectItem value="FHA">FHA</SelectItem>
                          <SelectItem value="VA">VA</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {financingType !== 'Cash' && (
                      <div className="space-y-2">
                        <Label>Down Payment</Label>
                        <Select value={downPayment} onValueChange={(v: DownPaymentPercent) => setDownPayment(v)}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<10">Less than 10%</SelectItem>
                            <SelectItem value="10-19">10-19%</SelectItem>
                            <SelectItem value="20+">20% or more</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Terms & Notes */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-accent" />
                    Contingencies & Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Contingencies <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-2 gap-4">
                      {contingencyOptions
                        .filter(opt => !(financingType === 'Cash' && opt.value === 'Financing'))
                        .map((opt) => (
                        <div key={opt.value} className={`flex items-center space-x-3 p-3 rounded-lg border hover:border-accent/30 transition-colors ${attempted && contingencies.length === 0 ? 'border-destructive' : 'border-border/50'}`}>
                          <Checkbox
                            id={opt.value}
                            checked={contingencies.includes(opt.value)}
                            onCheckedChange={(checked) => handleContingencyChange(opt.value, !!checked)}
                          />
                          <label htmlFor={opt.value} className="text-sm cursor-pointer font-medium">
                            {opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    {attempted && contingencies.length === 0 && (
                      <p className="text-xs text-destructive">Select at least one contingency option</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Closing Timeline</Label>
                      <Select value={closingTimeline} onValueChange={(v: ClosingTimeline) => setClosingTimeline(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<21">Less than 21 days</SelectItem>
                          <SelectItem value="21-30">21-30 days</SelectItem>
                          <SelectItem value="31-45">31-45 days</SelectItem>
                          <SelectItem value="45+">45+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Buyer Preference</Label>
                      <Select value={buyerPreference} onValueChange={(v: BuyerPreference) => setBuyerPreference(v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Must win">Must win</SelectItem>
                          <SelectItem value="Balanced">Balanced</SelectItem>
                          <SelectItem value="Price-protective">Price-protective</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientNotes">Notes for Client <span className="text-muted-foreground text-xs">(Optional — included in PDF/Share)</span></Label>
                    <Textarea
                      id="clientNotes"
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Notes visible to the client in exports and shared links..."
                      rows={2}
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
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-accent" />
                    Review Your Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Property & Client */}
                  <ReviewSection title="Property & Client" stepIndex={0} onEdit={goToStep}>
                    <ReviewRow label="Client" value={clientName} />
                    <ReviewRow label="Location" value={location} />
                    <ReviewRow label="Property Type" value={propertyType === 'SFH' ? 'Single Family Home' : propertyType === 'MFH' ? 'Multi-Family Home' : 'Condo'} />
                    <ReviewRow label="Condition" value={condition} />
                    {selectedScenario && <ReviewRow label="Market Scenario" value={selectedScenario.name} />}
                  </ReviewSection>

                  {/* Market Context */}
                  <ReviewSection title="Market Context" stepIndex={1} onEdit={goToStep}>
                    <ReviewRow label="Market Conditions" value={`${marketConditions} Market`} />
                    <ReviewRow label="Days on Market" value={daysOnMarket || '—'} />
                    <ReviewRow label="Property Purpose" value={investmentType} />
                    <ReviewRow label="Reference Price" value={referencePrice ? `$${Number(referencePrice).toLocaleString()}` : '—'} />
                  </ReviewSection>

                  {/* Offer Details */}
                  <ReviewSection title="Offer Details" stepIndex={2} onEdit={goToStep}>
                    <ReviewRow label="Offer Price" value={offerPrice ? `$${Number(offerPrice).toLocaleString()}` : '—'} />
                    <ReviewRow label="Financing" value={financingType} />
                    {financingType !== 'Cash' && <ReviewRow label="Down Payment" value={downPayment} />}
                  </ReviewSection>

                  {/* Terms */}
                  <ReviewSection title="Contingencies & Terms" stepIndex={3} onEdit={goToStep}>
                    <ReviewRow label="Contingencies" value={contingencies.join(', ') || '—'} />
                    <ReviewRow label="Closing Timeline" value={`${closingTimeline} days`} />
                    <ReviewRow label="Buyer Preference" value={buyerPreference} />
                    {clientNotes && <ReviewRow label="Client Notes" value={clientNotes} />}
                    {agentNotes && <ReviewRow label="Agent Notes" value={agentNotes} />}
                  </ReviewSection>

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

export default BuyerFlow;
