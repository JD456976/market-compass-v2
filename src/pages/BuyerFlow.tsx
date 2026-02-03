import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { ArrowLeft, ArrowRight, Users, Home, Sparkles, DollarSign, FileCheck, RotateCcw } from 'lucide-react';
import { 
  Session, PropertyType, Condition, FinancingType, 
  DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference 
} from '@/types';
import { generateId } from '@/lib/storage';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { MarketScenarioTooltip } from '@/components/MarketScenarioTooltip';
import { SessionTemplate } from '@/lib/templates';
import { loadMarketScenarios, MarketScenario, getMarketScenarioById } from '@/lib/marketScenarios';
import { useToast } from '@/hooks/use-toast';

const contingencyOptions: { value: Contingency; label: string }[] = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Financing', label: 'Financing' },
  { value: 'Appraisal', label: 'Appraisal' },
  { value: 'Home sale', label: 'Home Sale' },
  { value: 'None', label: 'None (Waiving all)' },
];

// Default form values
const DEFAULT_VALUES = {
  clientName: '',
  location: '',
  propertyType: 'SFH' as PropertyType,
  condition: 'Maintained' as Condition,
  selectedScenarioId: undefined as string | undefined,
  offerPrice: '',
  financingType: 'Conventional' as FinancingType,
  downPayment: '20+' as DownPaymentPercent,
  contingencies: ['Inspection', 'Financing'] as Contingency[],
  closingTimeline: '21-30' as ClosingTimeline,
  buyerPreference: 'Balanced' as BuyerPreference,
  agentNotes: '',
  clientNotes: '',
};

const BuyerFlow = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [marketScenarios, setMarketScenarios] = useState<MarketScenario[]>([]);
  const [appliedTemplate, setAppliedTemplate] = useState<SessionTemplate | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  const [clientName, setClientName] = useState(DEFAULT_VALUES.clientName);
  const [location, setLocation] = useState(DEFAULT_VALUES.location);
  const [propertyType, setPropertyType] = useState<PropertyType>(DEFAULT_VALUES.propertyType);
  const [condition, setCondition] = useState<Condition>(DEFAULT_VALUES.condition);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>(DEFAULT_VALUES.selectedScenarioId);
  const [offerPrice, setOfferPrice] = useState<string>(DEFAULT_VALUES.offerPrice);
  const [financingType, setFinancingType] = useState<FinancingType>(DEFAULT_VALUES.financingType);
  const [downPayment, setDownPayment] = useState<DownPaymentPercent>(DEFAULT_VALUES.downPayment);
  const [contingencies, setContingencies] = useState<Contingency[]>(DEFAULT_VALUES.contingencies);
  const [closingTimeline, setClosingTimeline] = useState<ClosingTimeline>(DEFAULT_VALUES.closingTimeline);
  const [buyerPreference, setBuyerPreference] = useState<BuyerPreference>(DEFAULT_VALUES.buyerPreference);
  const [agentNotes, setAgentNotes] = useState(DEFAULT_VALUES.agentNotes);
  const [clientNotes, setClientNotes] = useState(DEFAULT_VALUES.clientNotes);
  
  // Scenario overrides
  const [showOverrides, setShowOverrides] = useState(false);
  const [demandOverride, setDemandOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [competitionOverride, setCompetitionOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [pricingOverride, setPricingOverride] = useState<'low' | 'medium' | 'high' | undefined>(undefined);

  useEffect(() => {
    setMarketScenarios(loadMarketScenarios());
    
    // Check for prefill template
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

  // True reset: clear ALL fields back to defaults (no navigation)
  const handleFullReset = useCallback(() => {
    setClientName(DEFAULT_VALUES.clientName);
    setLocation(DEFAULT_VALUES.location);
    setPropertyType(DEFAULT_VALUES.propertyType);
    setCondition(DEFAULT_VALUES.condition);
    setSelectedScenarioId(DEFAULT_VALUES.selectedScenarioId);
    setOfferPrice(DEFAULT_VALUES.offerPrice);
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
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Toast confirmation
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

  const handleGenerate = () => {
    const session: Session = {
      id: generateId(),
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
      buyer_inputs: {
        offer_price: parseFloat(offerPrice) || 0,
        financing_type: financingType,
        down_payment_percent: downPayment,
        contingencies,
        closing_timeline: closingTimeline,
        buyer_preference: buyerPreference,
        agent_notes: agentNotes || undefined,
        client_notes: clientNotes || undefined,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Clear entry context for new reports (back goes to flow)
    sessionStorage.removeItem('report_entry_context');
    sessionStorage.setItem('current_session', JSON.stringify(session));
    navigate('/buyer/report');
  };

  // Compute missing required fields
  const missingFields: string[] = [];
  if (!clientName.trim()) missingFields.push('client_name');
  if (!location.trim()) missingFields.push('location');
  if (!offerPrice || parseFloat(offerPrice) <= 0) missingFields.push('offer_price');
  if (contingencies.length === 0) missingFields.push('contingencies');
  
  const isValid = missingFields.length === 0;
  const [attempted, setAttempted] = useState(false);

  const onGenerateReport = () => {
    setAttempted(true);
    if (!isValid) return;
    handleGenerate();
  };

  const selectedScenario = selectedScenarioId ? getMarketScenarioById(selectedScenarioId) : undefined;

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
                  <p className="text-sm text-muted-foreground">Evaluate offer competitiveness and risk</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowResetDialog(true)} className="min-h-[44px]">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Property & Client Info */}
          <Card className="mb-6">
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
                  <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
                  <LocationAutocomplete
                    value={location}
                    onChange={setLocation}
                    placeholder="Seattle, WA"
                    hasError={attempted && !location.trim()}
                  />
                  {attempted && !location.trim() && (
                    <p className="text-xs text-destructive">Location is required</p>
                  )}
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

          {/* Offer Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
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
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="500,000"
                    className={`h-11 pl-10 ${attempted && (!offerPrice || parseFloat(offerPrice) <= 0) ? 'border-destructive' : ''}`}
                  />
                </div>
                {attempted && (!offerPrice || parseFloat(offerPrice) <= 0) && (
                  <p className="text-xs text-destructive">Offer price is required</p>
                )}
              </div>

              <div className={`grid gap-4 ${financingType === 'Cash' ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label>Financing Type</Label>
                  <Select value={financingType} onValueChange={(v: FinancingType) => setFinancingType(v)}>
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

          {/* Contingencies & Terms */}
          <Card className="mb-6">
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
                  {contingencyOptions.map((opt) => (
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

          {/* Validation message */}
          {attempted && !isValid && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              Please complete required fields to generate the report.
            </div>
          )}

          <div className="relative z-10 pointer-events-auto">
            <Button 
              type="button"
              onClick={onGenerateReport} 
              className="w-full" 
              size="lg" 
              variant="accent"
            >
              Generate Report
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
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
