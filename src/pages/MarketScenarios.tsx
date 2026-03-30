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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, TrendingUp, Users2, Clock, Scale, Lock, Loader2, Copy } from 'lucide-react';
import { 
  MarketScenario, 
  BUILT_IN_SCENARIOS,
  DemandLevel,
  CompetitionLevel,
  PricingSensitivity,
  DOMBand,
  NegotiationLeverage
} from '@/lib/marketScenarios';
import { loadScenariosFromSupabase, upsertScenarioToSupabase, deleteScenarioFromSupabase } from '@/lib/supabaseScenarios';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MarketScenarios = () => {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<MarketScenario[]>([...BUILT_IN_SCENARIOS]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<MarketScenario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formDemand, setFormDemand] = useState<DemandLevel>('medium');
  const [formCompetition, setFormCompetition] = useState<CompetitionLevel>('medium');
  const [formPricing, setFormPricing] = useState<PricingSensitivity>('medium');
  const [formDOM, setFormDOM] = useState<DOMBand>('average');
  const [formLeverage, setFormLeverage] = useState<NegotiationLeverage>('neutral');

  const refreshScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const dbScenarios = await loadScenariosFromSupabase();
      setScenarios([...BUILT_IN_SCENARIOS, ...dbScenarios]);
    } catch {
      setScenarios([...BUILT_IN_SCENARIOS]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshScenarios();
  }, [refreshScenarios]);

  const openEditDialog = (scenario: MarketScenario) => {
    if (scenario.isBuiltIn) return;
    setEditingScenario(scenario);
    setFormName(scenario.name);
    setFormSummary(scenario.summary);
    setFormDemand(scenario.assumptions.demandLevel);
    setFormCompetition(scenario.assumptions.competitionLevel);
    setFormPricing(scenario.assumptions.pricingSensitivity);
    setFormDOM(scenario.assumptions.typicalDOMBand);
    setFormLeverage(scenario.assumptions.negotiationLeverage);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingScenario(null);
    setFormName('');
    setFormSummary('');
    setFormDemand('medium');
    setFormCompetition('medium');
    setFormPricing('medium');
    setFormDOM('average');
    setFormLeverage('neutral');
    setDialogOpen(true);
  };

  const handleDuplicate = async (scenario: MarketScenario) => {
    setSaving(true);
    const duplicated: MarketScenario = {
      id: crypto.randomUUID(),
      name: `${scenario.name} (Copy)`,
      summary: scenario.summary,
      isBuiltIn: false,
      assumptions: { ...scenario.assumptions },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await upsertScenarioToSupabase(duplicated);
    setSaving(false);

    if (result) {
      await refreshScenarios();
      toast({
        title: "Scenario duplicated",
        description: `"${duplicated.name}" has been created as a custom scenario.`,
      });
    } else {
      toast({
        title: "Duplication failed",
        description: "Could not duplicate the scenario. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formName.trim() || !formSummary.trim()) return;
    setSaving(true);
    
    const scenario: MarketScenario = {
      id: editingScenario?.id || crypto.randomUUID(),
      name: formName.trim(),
      summary: formSummary.trim(),
      isBuiltIn: false,
      assumptions: {
        demandLevel: formDemand,
        competitionLevel: formCompetition,
        pricingSensitivity: formPricing,
        typicalDOMBand: formDOM,
        negotiationLeverage: formLeverage,
      },
      created_at: editingScenario?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await upsertScenarioToSupabase(scenario);
    await refreshScenarios();
    setDialogOpen(false);
    setSaving(false);
    
    toast({
      title: editingScenario ? "Scenario updated" : "Scenario created",
      description: `"${formName}" has been saved.`,
    });
  };

  const handleDeleteClick = (id: string) => {
    const scenario = scenarios.find(s => s.id === id);
    if (scenario?.isBuiltIn) return;
    setScenarioToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (scenarioToDelete) {
      await deleteScenarioFromSupabase(scenarioToDelete);
      await refreshScenarios();
      toast({
        title: "Scenario deleted",
        description: "The custom scenario has been removed.",
      });
    }
    setDeleteDialogOpen(false);
    setScenarioToDelete(null);
  };

  const getLeverageIcon = (leverage: NegotiationLeverage) => {
    switch (leverage) {
      case 'buyer': return <Users2 className="h-4 w-4 text-accent" />;
      case 'seller': return <TrendingUp className="h-4 w-4 text-primary" />;
      default: return <Scale className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLeverageLabel = (leverage: NegotiationLeverage) => {
    switch (leverage) {
      case 'buyer': return 'Buyer Advantage';
      case 'seller': return 'Seller Advantage';
      default: return 'Neutral';
    }
  };

  const getDOMLabel = (dom: DOMBand) => {
    switch (dom) {
      case 'short': return 'Fast';
      case 'long': return 'Slow';
      default: return 'Average';
    }
  };

  const builtInScenarios = scenarios.filter(s => s.isBuiltIn);
  const customScenarios = scenarios.filter(s => !s.isBuiltIn);

  const ScenarioCard = ({ scenario, isBuiltIn }: { scenario: MarketScenario; isBuiltIn: boolean }) => (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm sm:text-base leading-snug min-w-0 break-words">{scenario.name}</CardTitle>
          <div className="flex-shrink-0">
            {isBuiltIn ? (
              getLeverageIcon(scenario.assumptions.negotiationLeverage)
            ) : (
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(scenario)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick(scenario.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          {scenario.summary}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-2 text-xs">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Demand</span>
            <span className="font-medium text-foreground capitalize">{scenario.assumptions.demandLevel}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Competition</span>
            <span className="font-medium text-foreground capitalize">{scenario.assumptions.competitionLevel}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Days on Market</span>
            <span className="font-medium text-foreground">{getDOMLabel(scenario.assumptions.typicalDOMBand)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Leverage</span>
            <span className="font-medium text-foreground">{getLeverageLabel(scenario.assumptions.negotiationLeverage)}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50 space-y-2">
          <div className="text-[10px] text-muted-foreground">
            {isBuiltIn 
              ? `Added ${new Date(scenario.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
              : (
                <>
                  <span>Created {new Date(scenario.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {scenario.updated_at !== scenario.created_at && (
                    <span className="ml-2">· Updated {new Date(scenario.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  )}
                </>
              )
            }
          </div>
          {isBuiltIn && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => handleDuplicate(scenario)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Copy className="h-3 w-3 mr-1.5" />}
              Duplicate as Custom
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0 h-9 w-9">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-sans font-bold truncate">Market Scenarios</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Pre-populated market conditions</p>
              </div>
            </div>
            <Button variant="accent" size="sm" onClick={openCreateDialog} className="flex-shrink-0 h-9">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Create Custom</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Built-in Scenarios */}
            <div className="mb-8 sm:mb-10">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base sm:text-lg font-sans font-semibold">Built-in Scenarios</h2>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  <Lock className="mr-0.5 h-2.5 w-2.5" />
                  Read-only
                </Badge>
              </div>
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {builtInScenarios.map((scenario, index) => (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <ScenarioCard scenario={scenario} isBuiltIn />
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Custom Scenarios */}
            <div>
              <h2 className="text-base sm:text-lg font-sans font-semibold mb-4">Custom Scenarios</h2>
              <AnimatePresence mode="wait">
                {customScenarios.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="border-dashed border-2">
                      <CardContent className="py-10 sm:py-12 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-sans font-medium mb-1 text-sm">No custom scenarios</h3>
                        <p className="text-xs text-muted-foreground mb-4 px-4">
                          Create your own or duplicate a built-in scenario.
                        </p>
                        <Button variant="outline" size="sm" onClick={openCreateDialog}>
                          <Plus className="mr-1.5 h-4 w-4" />
                          Create Custom Scenario
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {customScenarios.map((scenario, index) => (
                      <motion.div
                        key={scenario.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ScenarioCard scenario={scenario} isBuiltIn={false} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg sm:text-xl">
              {editingScenario ? 'Edit Scenario' : 'Create Custom Scenario'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="scenarioName" className="text-xs font-medium">Name <span className="text-destructive">*</span></Label>
              <Input
                id="scenarioName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Spring 2024 Seller's Market"
                className="h-10"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="scenarioSummary" className="text-xs font-medium">Summary <span className="text-destructive">*</span></Label>
              <Textarea
                id="scenarioSummary"
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                placeholder="1-2 sentences describing this market condition..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Demand Level</Label>
                <Select value={formDemand} onValueChange={(v: DemandLevel) => setFormDemand(v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Competition</Label>
                <Select value={formCompetition} onValueChange={(v: CompetitionLevel) => setFormCompetition(v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pricing Sensitivity</Label>
                <Select value={formPricing} onValueChange={(v: PricingSensitivity) => setFormPricing(v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Days on Market</Label>
                <Select value={formDOM} onValueChange={(v: DOMBand) => setFormDOM(v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (Fast)</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="long">Long (Slow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Negotiation Leverage</Label>
              <Select value={formLeverage} onValueChange={(v: NegotiationLeverage) => setFormLeverage(v)}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer Advantage</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="seller">Seller Advantage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || !formSummary.trim() || saving} className="w-full sm:w-auto">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : `${editingScenario ? 'Update' : 'Create'} Scenario`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom scenario? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="w-full sm:w-auto">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketScenarios;
