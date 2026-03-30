/**
 * Market Intelligence — unified page combining Market Scenarios + Market Profiles.
 * Uses tabs to organize both concepts in one place.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import {
  ArrowLeft, Plus, Pencil, Trash2, TrendingUp, Users2, Clock, Scale, Lock,
  Loader2, Copy, MapPin, Shield
} from 'lucide-react';
import {
  MarketScenario, BUILT_IN_SCENARIOS,
  DemandLevel, CompetitionLevel, PricingSensitivity, DOMBand, NegotiationLeverage
} from '@/lib/marketScenarios';
import { loadScenariosFromSupabase, upsertScenarioToSupabase, deleteScenarioFromSupabase } from '@/lib/supabaseScenarios';
import {
  MarketProfile, PropertyType, SaleToList, TypicalDOM,
  MultipleOffersFrequency, ContingencyTolerance
} from '@/types';
import { loadMarketProfiles, upsertMarketProfile, deleteMarketProfile, generateId } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

// ── Helpers ──

const getLeverageLabel = (l: NegotiationLeverage) =>
  l === 'buyer' ? 'Buyer Advantage' : l === 'seller' ? 'Seller Advantage' : 'Neutral';
const getDOMLabel = (d: DOMBand) =>
  d === 'short' ? 'Fast' : d === 'long' ? 'Slow' : 'Average';
const getMarketIndicator = (p: MarketProfile) => {
  let score = 0;
  if (p.typical_sale_to_list === 'Above') score++;
  if (p.typical_dom === 'Fast') score++;
  if (p.multiple_offers_frequency === 'Common') score++;
  if (score >= 2) return { label: 'Hot Market', color: 'text-amber-600' };
  if (score === 1) return { label: 'Balanced', color: 'text-emerald-600' };
  return { label: 'Slow Market', color: 'text-muted-foreground' };
};

const emptyProfile: Omit<MarketProfile, 'id' | 'updated_at'> = {
  label: '', location: '', property_type: 'SFH',
  typical_sale_to_list: 'Near', typical_dom: 'Normal',
  multiple_offers_frequency: 'Sometimes', contingency_tolerance: 'Medium',
};

const MarketIntelligence = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('scenarios');

  // ── Scenarios State ──
  const [scenarios, setScenarios] = useState<MarketScenario[]>([...BUILT_IN_SCENARIOS]);
  const [scenarioLoading, setScenarioLoading] = useState(true);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<MarketScenario | null>(null);
  const [deleteScenarioDialogOpen, setDeleteScenarioDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const [scenarioSaving, setScenarioSaving] = useState(false);
  const [sName, setSName] = useState('');
  const [sSummary, setSSummary] = useState('');
  const [sDemand, setSDemand] = useState<DemandLevel>('medium');
  const [sCompetition, setSCompetition] = useState<CompetitionLevel>('medium');
  const [sPricing, setSPricing] = useState<PricingSensitivity>('medium');
  const [sDOM, setSDOM] = useState<DOMBand>('average');
  const [sLeverage, setSLeverage] = useState<NegotiationLeverage>('neutral');

  // ── Profiles State ──
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<MarketProfile | null>(null);
  const [profileForm, setProfileForm] = useState(emptyProfile);

  // ── Scenarios Logic ──
  const refreshScenarios = useCallback(async () => {
    setScenarioLoading(true);
    try {
      const db = await loadScenariosFromSupabase();
      setScenarios([...BUILT_IN_SCENARIOS, ...db]);
    } catch {
      setScenarios([...BUILT_IN_SCENARIOS]);
    } finally {
      setScenarioLoading(false);
    }
  }, []);

  useEffect(() => { refreshScenarios(); }, [refreshScenarios]);
  useEffect(() => { setProfiles(loadMarketProfiles()); }, []);

  const openScenarioCreate = () => {
    setEditingScenario(null);
    setSName(''); setSSummary(''); setSDemand('medium'); setSCompetition('medium');
    setSPricing('medium'); setSDOM('average'); setSLeverage('neutral');
    setScenarioDialogOpen(true);
  };
  const openScenarioEdit = (s: MarketScenario) => {
    if (s.isBuiltIn) return;
    setEditingScenario(s);
    setSName(s.name); setSSummary(s.summary);
    setSDemand(s.assumptions.demandLevel); setSCompetition(s.assumptions.competitionLevel);
    setSPricing(s.assumptions.pricingSensitivity); setSDOM(s.assumptions.typicalDOMBand);
    setSLeverage(s.assumptions.negotiationLeverage);
    setScenarioDialogOpen(true);
  };
  const handleScenarioSave = async () => {
    if (!sName.trim() || !sSummary.trim()) return;
    setScenarioSaving(true);
    const s: MarketScenario = {
      id: editingScenario?.id || crypto.randomUUID(), name: sName.trim(), summary: sSummary.trim(),
      isBuiltIn: false,
      assumptions: { demandLevel: sDemand, competitionLevel: sCompetition, pricingSensitivity: sPricing, typicalDOMBand: sDOM, negotiationLeverage: sLeverage },
      created_at: editingScenario?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await upsertScenarioToSupabase(s);
    await refreshScenarios();
    setScenarioDialogOpen(false);
    setScenarioSaving(false);
    toast({ title: editingScenario ? 'Scenario updated' : 'Scenario created', description: `"${sName}" has been saved.` });
  };
  const handleScenarioDuplicate = async (s: MarketScenario) => {
    setScenarioSaving(true);
    const dup: MarketScenario = { ...s, id: crypto.randomUUID(), name: `${s.name} (Copy)`, isBuiltIn: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await upsertScenarioToSupabase(dup);
    setScenarioSaving(false);
    await refreshScenarios();
    toast({ title: 'Scenario duplicated', description: `"${dup.name}" created.` });
  };
  const handleScenarioDeleteConfirm = async () => {
    if (scenarioToDelete) {
      await deleteScenarioFromSupabase(scenarioToDelete);
      await refreshScenarios();
      toast({ title: 'Scenario deleted' });
    }
    setDeleteScenarioDialogOpen(false);
    setScenarioToDelete(null);
  };

  // ── Profiles Logic ──
  const handleProfileSave = () => {
    const p: MarketProfile = { ...profileForm, id: editingProfile?.id || generateId(), updated_at: new Date().toISOString() };
    upsertMarketProfile(p);
    setProfiles(loadMarketProfiles());
    setProfileDialogOpen(false);
    setEditingProfile(null);
    setProfileForm(emptyProfile);
    toast({ title: editingProfile ? 'Profile updated' : 'Profile created' });
  };
  const handleProfileEdit = (p: MarketProfile) => {
    setEditingProfile(p);
    setProfileForm({ label: p.label, location: p.location, property_type: p.property_type, typical_sale_to_list: p.typical_sale_to_list, typical_dom: p.typical_dom, multiple_offers_frequency: p.multiple_offers_frequency, contingency_tolerance: p.contingency_tolerance });
    setProfileDialogOpen(true);
  };
  const handleProfileDelete = (id: string) => {
    if (confirm('Delete this market profile?')) {
      deleteMarketProfile(id);
      setProfiles(loadMarketProfiles());
    }
  };
  const openProfileCreate = () => {
    setEditingProfile(null);
    setProfileForm(emptyProfile);
    setProfileDialogOpen(true);
  };

  const builtInScenarios = scenarios.filter(s => s.isBuiltIn);
  const customScenarios = scenarios.filter(s => !s.isBuiltIn);

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0 h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-sans font-bold truncate">Market Intelligence</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Scenarios & location profiles for analysis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-3 mb-6">
            <TabsList>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="profiles">Location Profiles</TabsTrigger>
            </TabsList>
            <Button variant="accent" size="sm" className="h-9" onClick={activeTab === 'scenarios' ? openScenarioCreate : openProfileCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">{activeTab === 'scenarios' ? 'Create Scenario' : 'Add Profile'}</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          {/* ── Scenarios Tab ── */}
          <TabsContent value="scenarios">
            {scenarioLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Built-in */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-base font-sans font-semibold">Built-in Scenarios</h2>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5"><Lock className="mr-0.5 h-2.5 w-2.5" />Read-only</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {builtInScenarios.map((s, i) => (
                      <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <ScenarioCard scenario={s} isBuiltIn onEdit={() => {}} onDelete={() => {}} onDuplicate={() => handleScenarioDuplicate(s)} saving={scenarioSaving} />
                      </motion.div>
                    ))}
                  </div>
                </div>
                {/* Custom */}
                <div>
                  <h2 className="text-base font-sans font-semibold mb-4">Custom Scenarios</h2>
                  {customScenarios.length === 0 ? (
                    <Card className="border-dashed border-2">
                      <CardContent className="py-10 text-center">
                        <p className="text-xs text-muted-foreground mb-4">No custom scenarios yet. Create your own or duplicate a built-in.</p>
                        <Button variant="outline" size="sm" onClick={openScenarioCreate}><Plus className="mr-1.5 h-4 w-4" />Create Custom Scenario</Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {customScenarios.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <ScenarioCard scenario={s} isBuiltIn={false} onEdit={() => openScenarioEdit(s)} onDelete={() => { setScenarioToDelete(s.id); setDeleteScenarioDialogOpen(true); }} onDuplicate={() => {}} saving={false} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Profiles Tab ── */}
          <TabsContent value="profiles">
            {profiles.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-sans text-xl font-semibold mb-2">No market profiles yet</h3>
                  <p className="text-muted-foreground mb-6">Create your first market profile for accurate analysis.</p>
                  <Button variant="accent" onClick={openProfileCreate}><Plus className="mr-2 h-4 w-4" />Create First Profile</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map((p, i) => {
                  const ind = getMarketIndicator(p);
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                      <Card className="group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg group-hover:text-accent transition-colors">{p.label}</CardTitle>
                              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{p.location}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleProfileEdit(p)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleProfileDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </div>
                          <span className={`text-xs font-medium ${ind.color}`}>{ind.label}</span>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4" /><span>Sale-to-List: <span className="text-foreground font-medium">{p.typical_sale_to_list}</span></span></div>
                          <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /><span>Days on Market: <span className="text-foreground font-medium">{p.typical_dom}</span></span></div>
                          <div className="flex items-center gap-2 text-muted-foreground"><Users2 className="h-4 w-4" /><span>Multiple Offers: <span className="text-foreground font-medium">{p.multiple_offers_frequency}</span></span></div>
                          <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4" /><span>Contingency Tolerance: <span className="text-foreground font-medium">{p.contingency_tolerance}</span></span></div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Scenario Dialog ── */}
      <Dialog open={scenarioDialogOpen} onOpenChange={setScenarioDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-sans text-lg">{editingScenario ? 'Edit Scenario' : 'Create Custom Scenario'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs font-medium">Name *</Label><Input value={sName} onChange={e => setSName(e.target.value)} placeholder="e.g., Spring 2024 Seller's Market" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Summary *</Label><Textarea value={sSummary} onChange={e => setSSummary(e.target.value)} placeholder="1-2 sentences..." rows={3} className="resize-none text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Demand</Label><Select value={sDemand} onValueChange={(v: DemandLevel) => setSDemand(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Competition</Label><Select value={sCompetition} onValueChange={(v: CompetitionLevel) => setSCompetition(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Pricing Sensitivity</Label><Select value={sPricing} onValueChange={(v: PricingSensitivity) => setSPricing(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Days on Market</Label><Select value={sDOM} onValueChange={(v: DOMBand) => setSDOM(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="short">Fast</SelectItem><SelectItem value="average">Average</SelectItem><SelectItem value="long">Slow</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Negotiation Leverage</Label><Select value={sLeverage} onValueChange={(v: NegotiationLeverage) => setSLeverage(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="buyer">Buyer Advantage</SelectItem><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="seller">Seller Advantage</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={handleScenarioSave} disabled={!sName.trim() || !sSummary.trim() || scenarioSaving} className="w-full">{scenarioSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}{editingScenario ? 'Update' : 'Create'} Scenario</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Profile Dialog ── */}
      <Dialog open={profileDialogOpen} onOpenChange={(open) => { setProfileDialogOpen(open); if (!open) { setEditingProfile(null); setProfileForm(emptyProfile); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-sans text-xl">{editingProfile ? 'Edit' : 'Create'} Market Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Profile Name</Label><Input value={profileForm.label} onChange={e => setProfileForm({ ...profileForm, label: e.target.value })} placeholder="e.g., Downtown Seattle Hot" /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={profileForm.location} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} placeholder="e.g., Seattle, WA" /></div>
            <div className="space-y-2"><Label>Property Type</Label><Select value={profileForm.property_type} onValueChange={(v: PropertyType) => setProfileForm({ ...profileForm, property_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SFH">Single Family Home</SelectItem><SelectItem value="Condo">Condo</SelectItem><SelectItem value="MFH">Multi-Family Home</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Typical Sale-to-List</Label><Select value={profileForm.typical_sale_to_list} onValueChange={(v: SaleToList) => setProfileForm({ ...profileForm, typical_sale_to_list: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Below">Below List</SelectItem><SelectItem value="Near">Near List</SelectItem><SelectItem value="Above">Above List</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Typical Days on Market</Label><Select value={profileForm.typical_dom} onValueChange={(v: TypicalDOM) => setProfileForm({ ...profileForm, typical_dom: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Fast">Fast (&lt;14 days)</SelectItem><SelectItem value="Normal">Normal (14-45 days)</SelectItem><SelectItem value="Slow">Slow (45+ days)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Multiple Offers Frequency</Label><Select value={profileForm.multiple_offers_frequency} onValueChange={(v: MultipleOffersFrequency) => setProfileForm({ ...profileForm, multiple_offers_frequency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Rare">Rare</SelectItem><SelectItem value="Sometimes">Sometimes</SelectItem><SelectItem value="Common">Common</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Contingency Tolerance</Label><Select value={profileForm.contingency_tolerance} onValueChange={(v: ContingencyTolerance) => setProfileForm({ ...profileForm, contingency_tolerance: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select></div>
            <Button onClick={handleProfileSave} className="w-full" disabled={!profileForm.label || !profileForm.location}>{editingProfile ? 'Update' : 'Create'} Profile</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Scenario Dialog ── */}
      <AlertDialog open={deleteScenarioDialogOpen} onOpenChange={setDeleteScenarioDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this scenario?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleScenarioDeleteConfirm}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── Scenario Card sub-component ──

function ScenarioCard({ scenario, isBuiltIn, onEdit, onDelete, onDuplicate, saving }: {
  scenario: MarketScenario; isBuiltIn: boolean;
  onEdit: () => void; onDelete: () => void; onDuplicate: () => void; saving: boolean;
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm sm:text-base leading-snug min-w-0 break-words">{scenario.name}</CardTitle>
          {!isBuiltIn && (
            <div className="flex gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          )}
        </div>
        <CardDescription className="text-xs leading-relaxed">{scenario.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-2 text-xs">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground"><span>Demand</span><span className="font-medium text-foreground capitalize">{scenario.assumptions.demandLevel}</span></div>
          <div className="flex items-center justify-between text-muted-foreground"><span>Competition</span><span className="font-medium text-foreground capitalize">{scenario.assumptions.competitionLevel}</span></div>
          <div className="flex items-center justify-between text-muted-foreground"><span>Days on Market</span><span className="font-medium text-foreground">{getDOMLabel(scenario.assumptions.typicalDOMBand)}</span></div>
          <div className="flex items-center justify-between text-muted-foreground"><span>Leverage</span><span className="font-medium text-foreground">{getLeverageLabel(scenario.assumptions.negotiationLeverage)}</span></div>
        </div>
        {isBuiltIn && (
          <div className="pt-2 border-t border-border/50">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={onDuplicate} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Copy className="h-3 w-3 mr-1.5" />}
              Duplicate as Custom
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MarketIntelligence;
