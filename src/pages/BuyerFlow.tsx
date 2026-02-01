import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Users, Home, Sparkles, DollarSign, FileCheck } from 'lucide-react';
import { 
  Session, PropertyType, Condition, FinancingType, 
  DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference, MarketProfile 
} from '@/types';
import { loadMarketProfiles, generateId } from '@/lib/storage';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { MarketProfileTooltip } from '@/components/MarketProfileTooltip';
import { SessionTemplate } from '@/lib/templates';

const contingencyOptions: { value: Contingency; label: string }[] = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Financing', label: 'Financing' },
  { value: 'Appraisal', label: 'Appraisal' },
  { value: 'Home sale', label: 'Home Sale' },
  { value: 'None', label: 'None (Waiving all)' },
];

const BuyerFlow = () => {
  const navigate = useNavigate();
  const [marketProfiles, setMarketProfiles] = useState<MarketProfile[]>([]);
  
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('SFH');
  const [condition, setCondition] = useState<Condition>('Maintained');
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined);
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [financingType, setFinancingType] = useState<FinancingType>('Conventional');
  const [downPayment, setDownPayment] = useState<DownPaymentPercent>('20+');
  const [contingencies, setContingencies] = useState<Contingency[]>(['Inspection', 'Financing']);
  const [closingTimeline, setClosingTimeline] = useState<ClosingTimeline>('21-30');
  const [buyerPreference, setBuyerPreference] = useState<BuyerPreference>('Balanced');
  const [agentNotes, setAgentNotes] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  useEffect(() => {
    setMarketProfiles(loadMarketProfiles());
    
    // Check for prefill template
    const templateData = sessionStorage.getItem('prefill_template');
    if (templateData) {
      try {
        const template: SessionTemplate = JSON.parse(templateData);
        if (template.session_type === 'Buyer') {
          setPropertyType(template.property_type);
          setCondition(template.condition);
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
      selected_market_profile_id: selectedProfileId || undefined,
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
    
    sessionStorage.setItem('current_session', JSON.stringify(session));
    navigate('/buyer/report');
  };

  // Compute missing required fields
  const missingFields: string[] = [];
  if (!clientName.trim()) missingFields.push('client_name');
  if (!location.trim()) missingFields.push('location');
  if (!offerPrice || parseFloat(offerPrice) <= 0) missingFields.push('offer_price');
  if (contingencies.length === 0) missingFields.push('contingencies');
  // property_type, condition, financing_type, closing_timeline, buyer_preference all have defaults
  
  const isValid = missingFields.length === 0;
  const [attempted, setAttempted] = useState(false);

  const onGenerateReport = () => {
    setAttempted(true);
    if (!isValid) return;
    handleGenerate();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
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
                  Market Profile <span className="text-muted-foreground text-xs ml-1">(Optional)</span>
                  <MarketProfileTooltip />
                </Label>
                <Select value={selectedProfileId ?? "__none__"} onValueChange={(v) => setSelectedProfileId(v === "__none__" ? undefined : v)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select a market profile..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {marketProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label} - {p.location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
    </div>
  );
};

export default BuyerFlow;
