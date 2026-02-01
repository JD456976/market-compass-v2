import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { Session, PropertyType, Condition, DesiredTimeframe, StrategyPreference, MarketProfile } from '@/types';
import { getMarketProfiles, generateId } from '@/lib/storage';

const SellerFlow = () => {
  const navigate = useNavigate();
  const [marketProfiles, setMarketProfiles] = useState<MarketProfile[]>([]);
  
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('SFH');
  const [condition, setCondition] = useState<Condition>('Maintained');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [listPrice, setListPrice] = useState<string>('');
  const [timeframe, setTimeframe] = useState<DesiredTimeframe>('60');
  const [strategy, setStrategy] = useState<StrategyPreference>('Balanced');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMarketProfiles(getMarketProfiles());
  }, []);

  const handleGenerate = () => {
    const session: Session = {
      id: generateId(),
      session_type: 'Seller',
      client_name: clientName,
      location,
      property_type: propertyType,
      condition,
      selected_market_profile_id: selectedProfileId || undefined,
      seller_inputs: {
        seller_selected_list_price: parseFloat(listPrice) || 0,
        desired_timeframe: timeframe,
        strategy_preference: strategy,
        notes: notes || undefined,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Store in sessionStorage for the report page
    sessionStorage.setItem('current_session', JSON.stringify(session));
    navigate('/seller/report');
  };

  const isValid = clientName && location && listPrice;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Seller Analysis</h1>
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
                  placeholder="John Smith"
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
                <Label>Condition</Label>
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
              <Label htmlFor="listPrice">List Price *</Label>
              <Input
                id="listPrice"
                type="number"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="500000"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desired Timeframe</Label>
                <Select value={timeframe} onValueChange={(v: DesiredTimeframe) => setTimeframe(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maximize price">Maximize price</SelectItem>
                    <SelectItem value="Balanced">Balanced</SelectItem>
                    <SelectItem value="Prioritize speed">Prioritize speed</SelectItem>
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

export default SellerFlow;
