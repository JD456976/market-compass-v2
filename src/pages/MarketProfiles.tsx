import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, MapPin, TrendingUp, Clock, Users2, Shield } from 'lucide-react';
import { MarketProfile, PropertyType, SaleToList, TypicalDOM, MultipleOffersFrequency, ContingencyTolerance } from '@/types';
import { loadMarketProfiles, upsertMarketProfile, deleteMarketProfile, generateId } from '@/lib/storage';

const emptyProfile: Omit<MarketProfile, 'id' | 'updated_at'> = {
  label: '',
  location: '',
  property_type: 'SFH',
  typical_sale_to_list: 'Near',
  typical_dom: 'Normal',
  multiple_offers_frequency: 'Sometimes',
  contingency_tolerance: 'Medium',
};

const MarketProfiles = () => {
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<MarketProfile | null>(null);
  const [formData, setFormData] = useState(emptyProfile);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setProfiles(loadMarketProfiles());
  }, []);

  const handleSave = () => {
    const profile: MarketProfile = {
      ...formData,
      id: editingProfile?.id || generateId(),
      updated_at: new Date().toISOString(),
    };
    upsertMarketProfile(profile);
    setProfiles(loadMarketProfiles());
    setDialogOpen(false);
    setEditingProfile(null);
    setFormData(emptyProfile);
  };

  const handleEdit = (profile: MarketProfile) => {
    setEditingProfile(profile);
    setFormData({
      label: profile.label,
      location: profile.location,
      property_type: profile.property_type,
      typical_sale_to_list: profile.typical_sale_to_list,
      typical_dom: profile.typical_dom,
      multiple_offers_frequency: profile.multiple_offers_frequency,
      contingency_tolerance: profile.contingency_tolerance,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this market profile?')) {
      deleteMarketProfile(id);
      setProfiles(loadMarketProfiles());
    }
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingProfile(null);
      setFormData(emptyProfile);
    }
  };

  const getMarketIndicator = (profile: MarketProfile) => {
    let score = 0;
    if (profile.typical_sale_to_list === 'Above') score += 1;
    if (profile.typical_dom === 'Fast') score += 1;
    if (profile.multiple_offers_frequency === 'Common') score += 1;
    
    if (score >= 2) return { label: 'Hot Market', color: 'text-amber-600' };
    if (score === 1) return { label: 'Balanced', color: 'text-emerald-600' };
    return { label: 'Slow Market', color: 'text-muted-foreground' };
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
              <div>
                <h1 className="text-2xl font-sans font-bold">Market Profiles</h1>
                <p className="text-sm text-muted-foreground">Define market conditions for accurate analysis</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button variant="accent">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-sans text-xl">{editingProfile ? 'Edit' : 'Create'} Market Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">Profile Name</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="e.g., Downtown Seattle Hot"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Seattle, WA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select
                      value={formData.property_type}
                      onValueChange={(v: PropertyType) => setFormData({ ...formData, property_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SFH">Single Family Home</SelectItem>
                        <SelectItem value="Condo">Condo</SelectItem>
                        <SelectItem value="MFH">Multi-Family Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Typical Sale-to-List</Label>
                    <Select
                      value={formData.typical_sale_to_list}
                      onValueChange={(v: SaleToList) => setFormData({ ...formData, typical_sale_to_list: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Below">Below List</SelectItem>
                        <SelectItem value="Near">Near List</SelectItem>
                        <SelectItem value="Above">Above List</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Typical Days on Market</Label>
                    <Select
                      value={formData.typical_dom}
                      onValueChange={(v: TypicalDOM) => setFormData({ ...formData, typical_dom: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fast">Fast (&lt;14 days)</SelectItem>
                        <SelectItem value="Normal">Normal (14-45 days)</SelectItem>
                        <SelectItem value="Slow">Slow (45+ days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Multiple Offers Frequency</Label>
                    <Select
                      value={formData.multiple_offers_frequency}
                      onValueChange={(v: MultipleOffersFrequency) => setFormData({ ...formData, multiple_offers_frequency: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rare">Rare</SelectItem>
                        <SelectItem value="Sometimes">Sometimes</SelectItem>
                        <SelectItem value="Common">Common</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contingency Tolerance</Label>
                    <Select
                      value={formData.contingency_tolerance}
                      onValueChange={(v: ContingencyTolerance) => setFormData({ ...formData, contingency_tolerance: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} className="w-full" disabled={!formData.label || !formData.location}>
                    {editingProfile ? 'Update' : 'Create'} Profile
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {profiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-sans text-xl font-semibold mb-2">No market profiles yet</h3>
                  <p className="text-muted-foreground mb-6">Create your first market profile to get started with accurate analysis.</p>
                  <Button variant="accent" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {profiles.map((profile, index) => {
                const indicator = getMarketIndicator(profile);
                return (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg group-hover:text-accent transition-colors">
                              {profile.label}
                            </CardTitle>
                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {profile.location}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(profile)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(profile.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${indicator.color}`}>{indicator.label}</span>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span>Sale-to-List: <span className="text-foreground font-medium">{profile.typical_sale_to_list}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Days on Market: <span className="text-foreground font-medium">{profile.typical_dom}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users2 className="h-4 w-4" />
                          <span>Multiple Offers: <span className="text-foreground font-medium">{profile.multiple_offers_frequency}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Shield className="h-4 w-4" />
                          <span>Contingency Tolerance: <span className="text-foreground font-medium">{profile.contingency_tolerance}</span></span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MarketProfiles;
