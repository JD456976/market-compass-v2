import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';
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
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Buyer Analysis</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Property & Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Seattle, WA"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={propertyType} onValueChange={(v: PropertyType) => setPropertyType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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

            <div className="space-y-2">
              <Label>Market Profile (Optional)</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger><SelectValue placeholder="Select a market profile..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {marketProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label} - {p.location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <hr className="my-6" />

            <div className="space-y-2">
              <Label htmlFor="offerPrice">Offer Price *</Label>
              <Input
                id="offerPrice"
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="500000"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Financing Type</Label>
                <Select value={financingType} onValueChange={(v: FinancingType) => setFinancingType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<10">Less than 10%</SelectItem>
                    <SelectItem value="10-19">10-19%</SelectItem>
                    <SelectItem value="20+">20% or more</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Contingencies</Label>
              <div className="grid grid-cols-2 gap-3">
                {contingencyOptions.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={opt.value}
                      checked={contingencies.includes(opt.value)}
                      onCheckedChange={(checked) => handleContingencyChange(opt.value, !!checked)}
                    />
                    <label htmlFor={opt.value} className="text-sm cursor-pointer">
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Must win">Must win</SelectItem>
                    <SelectItem value="Balanced">Balanced</SelectItem>
                    <SelectItem value="Price-protective">Price-protective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context..."
                rows={3}
              />
            </div>

            <Button onClick={handleGenerate} className="w-full" size="lg" disabled={!isValid}>
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BuyerFlow;
