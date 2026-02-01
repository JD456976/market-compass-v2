import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { MarketProfile, PropertyType, SaleToList, TypicalDOM, MultipleOffersFrequency, ContingencyTolerance } from '@/types';
import { getMarketProfiles, saveMarketProfile, deleteMarketProfile, generateId } from '@/lib/storage';

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
    setProfiles(getMarketProfiles());
  }, []);

  const handleSave = () => {
    const profile: MarketProfile = {
      ...formData,
      id: editingProfile?.id || generateId(),
      updated_at: new Date().toISOString(),
    };
    saveMarketProfile(profile);
    setProfiles(getMarketProfiles());
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
      setProfiles(getMarketProfiles());
    }
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingProfile(null);
      setFormData(emptyProfile);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Market Profiles</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProfile ? 'Edit' : 'Create'} Market Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
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

        {profiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No market profiles yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {profile.label}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(profile)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(profile.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p><span className="font-medium">Location:</span> {profile.location}</p>
                  <p><span className="font-medium">Type:</span> {profile.property_type}</p>
                  <p><span className="font-medium">Sale-to-List:</span> {profile.typical_sale_to_list}</p>
                  <p><span className="font-medium">DOM:</span> {profile.typical_dom}</p>
                  <p><span className="font-medium">Multiple Offers:</span> {profile.multiple_offers_frequency}</p>
                  <p><span className="font-medium">Contingency Tolerance:</span> {profile.contingency_tolerance}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketProfiles;
