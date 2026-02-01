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
import { ArrowLeft, ArrowRight, Users, MapPin, Home, Sparkles, DollarSign, FileCheck } from 'lucide-react';
import { 
  Session, PropertyType, Condition, FinancingType, 
  DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference, MarketProfile 
} from '@/types';
import { getMarketProfiles, generateId } from '@/lib/storage';

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
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMarketProfiles(getMarketProfiles());
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
        notes: notes || undefined,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    sessionStorage.setItem('current_session', JSON.stringify(session));
    navigate('/buyer/report');
  };

  const isValid = clientName && location && offerPrice;

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
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Seattle, WA"
                      className="h-11 pl-10"
                    />
                  </div>
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
                <Label>Market Profile <span className="text-muted-foreground text-xs">(Optional)</span></Label>
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
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                <Label>Contingencies</Label>
                <div className="grid grid-cols-2 gap-4">
                  {contingencyOptions.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:border-accent/30 transition-colors">
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
                <Label htmlFor="notes">Notes <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional context about the offer or client situation..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleGenerate} 
            className="w-full" 
            size="lg" 
            disabled={!isValid}
            variant="accent"
          >
            Generate Report
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default BuyerFlow;
