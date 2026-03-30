import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Home, Sparkles, ClipboardList, Check, Pencil, Save, Loader2, Eye } from 'lucide-react';
import { MLSVoiceCameraInput, MLSExtractedData } from '@/components/MLSVoiceCameraInput';
import { ListingNavigatorImportPanel } from '@/components/ListingNavigatorImportPanel';
import { Session, PropertyType, Condition, MarketConditions } from '@/types';
import { generateId } from '@/lib/storage';
import { upsertSessionAsync } from '@/lib/storage';
import { formatPriceDisplay, parsePriceValue, stripCurrencyChars } from '@/lib/currencyFormat';
import { AddressInput, parseAddressComponents } from '@/components/AddressInput';
import { useToast } from '@/hooks/use-toast';
import { ReviewRow } from '@/components/ReviewStep';

const STEPS = [
  { label: 'Property', icon: Home },
  { label: 'Details', icon: Sparkles },
  { label: 'Review', icon: ClipboardList },
] as const;

const DEFAULT_VALUES = {
  clientName: '',
  location: '',
  propertyType: 'SFH' as PropertyType,
  condition: 'Maintained' as Condition,
  listPrice: '',
  daysOnMarket: '',
  marketConditions: 'Balanced' as MarketConditions,
};

const TouringFlow = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [stepDirection, setStepDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Restore session if returning to edit a draft
  const restoredSession = (() => {
    try {
      const isReturning = sessionStorage.getItem('returning_to_edit');
      if (!isReturning) return null;
      const raw = sessionStorage.getItem('current_session');
      if (!raw) return null;
      const parsed: Session = JSON.parse(raw);
      sessionStorage.removeItem('returning_to_edit');
      return parsed;
    } catch { return null; }
  })();

  const [draftId] = useState(() => restoredSession?.id || generateId());

  const [clientName, setClientName] = useState(restoredSession?.client_name || DEFAULT_VALUES.clientName);
  const [location, setLocation] = useState(restoredSession?.location || DEFAULT_VALUES.location);
  const [fullAddress, setFullAddress] = useState(restoredSession?.address_fields?.address_line || '');
  const [propertyType, setPropertyType] = useState<PropertyType>((restoredSession?.property_type as PropertyType) || DEFAULT_VALUES.propertyType);
  const [condition, setCondition] = useState<Condition>((restoredSession?.condition as Condition) || DEFAULT_VALUES.condition);
  const [listPrice, setListPrice] = useState(
    restoredSession?.buyer_inputs?.reference_price ? String(restoredSession.buyer_inputs.reference_price) : DEFAULT_VALUES.listPrice
  );
  const [daysOnMarket, setDaysOnMarket] = useState(
    restoredSession?.buyer_inputs?.days_on_market !== undefined ? String(restoredSession.buyer_inputs.days_on_market) : DEFAULT_VALUES.daysOnMarket
  );
  const [marketConditions, setMarketConditions] = useState<MarketConditions>(
    (restoredSession?.buyer_inputs?.market_conditions as MarketConditions) || DEFAULT_VALUES.marketConditions
  );
  const [propertyFactors, setPropertyFactors] = useState<import('@/types').PropertyFactor[]>(restoredSession?.property_factors || []);
  const [listingHistory, setListingHistory] = useState<import('@/types').ListingHistory | undefined>(restoredSession?.listing_history);
  const [attempted, setAttempted] = useState(false);

  const handleMLSData = useCallback((data: MLSExtractedData) => {
    if (data.clientName) setClientName(data.clientName);
    if (data.location) setLocation(data.location);
    if (data.address) setFullAddress(data.address);
    if (data.propertyType) setPropertyType(data.propertyType as PropertyType);
    if (data.condition) setCondition(data.condition as Condition);
    if (data.listPrice) setListPrice(String(data.listPrice));
    if (data.daysOnMarket !== undefined) setDaysOnMarket(String(data.daysOnMarket));
    if (data.factors) setPropertyFactors(data.factors);
    if (data.listingHistory) setListingHistory(data.listingHistory);
  }, []);

  const handleListingNavigatorImport = useCallback((data: { address?: string; listPrice?: string }) => {
    if (data.address) {
      setLocation(data.address);
      setFullAddress(data.address);
    }
    if (data.listPrice) setListPrice(data.listPrice);
  }, []);

  const stepErrors: Record<number, string[]> = {
    0: [
      ...(!clientName.trim() ? ['client_name'] : []),
      ...(!location.trim() ? ['location'] : []),
    ],
    1: [],
    2: [],
  };

  const currentStepValid = stepErrors[step]?.length === 0;

  const buildSession = (): Session => ({
    id: draftId,
    session_type: 'touring_brief',
    client_name: clientName,
    location,
    property_type: propertyType,
    condition,
    address_fields: fullAddress ? {
      address_line: fullAddress,
      city: location.split(',')[0]?.trim(),
      state: location.split(',')[1]?.trim(),
    } : undefined,
    client_privacy: true,
    property_factors: propertyFactors.length > 0 ? propertyFactors : undefined,
    listing_history: listingHistory,
    buyer_inputs: {
      offer_price: 0, // No offer yet — touring brief
      reference_price: listPrice ? parsePriceValue(listPrice) : undefined,
      market_conditions: marketConditions,
      days_on_market: daysOnMarket ? parseInt(daysOnMarket) : undefined,
      investment_type: 'Primary Residence',
      financing_type: 'Conventional',
      down_payment_percent: '20+',
      contingencies: ['Inspection', 'Financing'],
      closing_timeline: '21-30',
      buyer_preference: 'Balanced',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const handleGenerate = () => {
    const session = buildSession();
    sessionStorage.setItem('current_session', JSON.stringify(session));
    sessionStorage.setItem('touring_brief', 'true');
    navigate('/touring/report');
  };

  const goNext = () => {
    setAttempted(true);
    if (!currentStepValid) return;
    setAttempted(false);
    setStepDirection(1);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStepDirection(-1);
    setStep(s => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const formatPriceForReview = (val: string) => {
    const num = parsePriceValue(val);
    return num > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num) : '—';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-sans font-bold">Touring Brief</h1>
              <p className="text-sm text-primary-foreground/70 mt-0.5">Pre-showing property intelligence for your client</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 max-w-md">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.label} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => { if (i < step) { setStepDirection(-1); setStep(i); } }}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-all ${isActive ? 'text-primary-foreground' : isDone ? 'text-primary-foreground/70 cursor-pointer' : 'text-primary-foreground/40'}`}
                    disabled={i > step}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-accent text-accent-foreground' : isDone ? 'bg-primary-foreground/20' : 'bg-primary-foreground/10'}`}>
                      {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary-foreground/30' : 'bg-primary-foreground/10'}`} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-8 max-w-2xl -mt-4">
        <AnimatePresence mode="wait" custom={stepDirection}>
          <motion.div
            key={step}
            custom={stepDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            {/* Step 0: Property */}
            {step === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Home className="h-5 w-5 text-accent" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Smart MLS Import */}
                  <MLSVoiceCameraInput onDataExtracted={handleMLSData} reportType="buyer" />
                  
                  <ListingNavigatorImportPanel
                    onImport={handleListingNavigatorImport}
                    reportType="buyer"
                  />

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name *</Label>
                      <Input
                        id="clientName"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g., Sarah Johnson"
                        className={attempted && !clientName.trim() ? 'border-destructive' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Property Address or Town *</Label>
                      <AddressInput
                        town={location}
                        onTownChange={(val) => setLocation(val)}
                        fullAddress={fullAddress}
                        onFullAddressChange={(val) => {
                          setFullAddress(val);
                          const components = parseAddressComponents(val);
                          if (components.town) {
                            setLocation(components.town);
                          }
                        }}
                        hasError={attempted && !location.trim()}
                        attempted={attempted}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Property Details */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Property Details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">All fields optional — add what you know</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Property Type</Label>
                      <Select value={propertyType} onValueChange={(v) => setPropertyType(v as PropertyType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SFH">Single Family</SelectItem>
                          <SelectItem value="Condo">Condo</SelectItem>
                          <SelectItem value="MFH">Multi-Family</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={condition} onValueChange={(v) => setCondition(v as Condition)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dated">Dated</SelectItem>
                          <SelectItem value="Maintained">Maintained</SelectItem>
                          <SelectItem value="Updated">Updated</SelectItem>
                          <SelectItem value="Renovated">Renovated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>List Price</Label>
                      <Input
                        value={listPrice ? formatPriceDisplay(listPrice) : ''}
                        onChange={(e) => setListPrice(stripCurrencyChars(e.target.value))}
                        placeholder="$000,000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Days on Market</Label>
                      <Input
                        type="number"
                        value={daysOnMarket}
                        onChange={(e) => setDaysOnMarket(e.target.value)}
                        placeholder="e.g., 14"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Market Conditions</Label>
                    <Select value={marketConditions} onValueChange={(v) => setMarketConditions(v as MarketConditions)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hot">Hot — High demand, multiple offers common</SelectItem>
                        <SelectItem value="Balanced">Balanced — Normal activity</SelectItem>
                        <SelectItem value="Cool">Cool — Lower demand, more negotiation room</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {propertyFactors.length > 0 && (
                    <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <p className="text-xs font-medium text-accent mb-1">Property Intelligence</p>
                      <p className="text-xs text-muted-foreground">
                        {propertyFactors.length} factor{propertyFactors.length !== 1 ? 's' : ''} detected from imported data
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5 text-accent" />
                    Review & Generate
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Confirm details before generating the touring brief</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40">
                      <span className="text-sm font-semibold text-foreground">Property</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <ReviewRow label="Client" value={clientName} />
                      <ReviewRow label="Location" value={fullAddress || location} />
                      <ReviewRow label="Property Type" value={propertyType} />
                      <ReviewRow label="Condition" value={condition} />
                      {listPrice && <ReviewRow label="List Price" value={formatPriceForReview(listPrice)} />}
                      {daysOnMarket && <ReviewRow label="Days on Market" value={`${daysOnMarket} days`} />}
                      <ReviewRow label="Market" value={marketConditions} />
                    </div>
                  </div>

                  {propertyFactors.length > 0 && (
                    <div className="border border-border/50 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 bg-muted/40">
                        <span className="text-sm font-semibold text-foreground">Property Intelligence</span>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        <ReviewRow label="Factors Detected" value={`${propertyFactors.length}`} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={step === 0 ? () => navigate('/') : goBack} className="min-h-[44px]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step === 0 ? 'Home' : 'Back'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={goNext} disabled={attempted && !currentStepValid} className="min-h-[44px]">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} variant="accent" className="min-h-[44px]">
              <Eye className="mr-2 h-4 w-4" />
              Generate Brief
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TouringFlow;
