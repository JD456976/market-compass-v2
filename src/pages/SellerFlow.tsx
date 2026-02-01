import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Building2, MapPin, Home, Sparkles, DollarSign } from 'lucide-react';
import { Session, PropertyType, Condition, DesiredTimeframe, StrategyPreference, MarketProfile } from '@/types';
import { loadMarketProfiles, generateId } from '@/lib/storage';

const SellerFlow = () => {
  const navigate = useNavigate();
  const [marketProfiles, setMarketProfiles] = useState<MarketProfile[]>([]);
  
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('SFH');
  const [condition, setCondition] = useState<Condition>('Maintained');
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined);
  const [listPrice, setListPrice] = useState<string>('');
  const [timeframe, setTimeframe] = useState<DesiredTimeframe>('60');
  const [strategy, setStrategy] = useState<StrategyPreference>('Balanced');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMarketProfiles(loadMarketProfiles());
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
    
    sessionStorage.setItem('current_session', JSON.stringify(session));
    navigate('/seller/report');
  };

  const isValid = clientName && location && listPrice;

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
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold">Seller Analysis</h1>
                <p className="text-sm text-muted-foreground">Analyze listing strategy and sale likelihood</p>
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
                    placeholder="John Smith"
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

          {/* Seller Inputs */}
          <Card className="mb-6">
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
                    type="number"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="500,000"
                    className="h-11 pl-10"
                  />
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="notes">Notes <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional context about the property or client goals..."
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

export default SellerFlow;
