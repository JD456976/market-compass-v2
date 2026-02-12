import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, TrendingUp, Users2, Clock, DollarSign, Scale, Zap, Lock } from 'lucide-react';
import { 
  MarketScenario, 
  loadMarketScenarios, 
  saveCustomScenario, 
  deleteCustomScenario,
  BUILT_IN_SCENARIOS,
  DemandLevel,
  CompetitionLevel,
  PricingSensitivity,
  DOMBand,
  NegotiationLeverage
} from '@/lib/marketScenarios';
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
  const [scenarios, setScenarios] = useState<MarketScenario[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<MarketScenario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formDemand, setFormDemand] = useState<DemandLevel>('medium');
  const [formCompetition, setFormCompetition] = useState<CompetitionLevel>('medium');
  const [formPricing, setFormPricing] = useState<PricingSensitivity>('medium');
  const [formDOM, setFormDOM] = useState<DOMBand>('average');
  const [formLeverage, setFormLeverage] = useState<NegotiationLeverage>('neutral');

  useEffect(() => {
    refreshScenarios();
  }, []);

  const refreshScenarios = () => {
    setScenarios(loadMarketScenarios());
  };

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

  const handleSave = () => {
    if (!formName.trim() || !formSummary.trim()) return;
    
    saveCustomScenario({
      id: editingScenario?.id || crypto.randomUUID(),
      name: formName.trim(),
      summary: formSummary.trim(),
      assumptions: {
        demandLevel: formDemand,
        competitionLevel: formCompetition,
        pricingSensitivity: formPricing,
        typicalDOMBand: formDOM,
        negotiationLeverage: formLeverage,
      },
    });
    
    refreshScenarios();
    setDialogOpen(false);
    
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

  const handleDeleteConfirm = () => {
    if (scenarioToDelete) {
      deleteCustomScenario(scenarioToDelete);
      refreshScenarios();
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
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Market Scenarios</h1>
                  <p className="text-sm text-muted-foreground">Pre-populated market conditions for reports</p>
                </div>
              </div>
            </div>
            <Button variant="accent" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Custom
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Built-in Scenarios */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-serif font-semibold">Built-in Scenarios</h2>
            <Badge variant="secondary" className="text-xs">
              <Lock className="mr-1 h-3 w-3" />
              Read-only
            </Badge>
          </div>
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {builtInScenarios.map((scenario, index) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                      {getLeverageIcon(scenario.assumptions.negotiationLeverage)}
                    </div>
                    <CardDescription className="text-xs leading-relaxed">
                      {scenario.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
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
                    <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                      Added {new Date(scenario.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Custom Scenarios */}
        <div>
          <h2 className="text-lg font-serif font-semibold mb-4">Custom Scenarios</h2>
          <AnimatePresence mode="wait">
            {customScenarios.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-dashed border-2">
                  <CardContent className="py-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No custom scenarios</h3>
                    <p className="text-sm text-muted-foreground mb-4">Create your own market scenario for specific conditions.</p>
                    <Button variant="outline" size="sm" onClick={openCreateDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Custom Scenario
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div 
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
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
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{scenario.name}</CardTitle>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(scenario)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick(scenario.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="text-xs leading-relaxed">
                          {scenario.summary}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Demand</span>
                          <span className="font-medium text-foreground capitalize">{scenario.assumptions.demandLevel}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Competition</span>
                          <span className="font-medium text-foreground capitalize">{scenario.assumptions.competitionLevel}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Leverage</span>
                          <span className="font-medium text-foreground">{getLeverageLabel(scenario.assumptions.negotiationLeverage)}</span>
                        </div>
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Created {new Date(scenario.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {scenario.updated_at !== scenario.created_at && (
                            <span>Updated {new Date(scenario.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingScenario ? 'Edit Scenario' : 'Create Custom Scenario'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenarioName">Name <span className="text-destructive">*</span></Label>
              <Input
                id="scenarioName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Spring 2024 Seller's Market"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scenarioSummary">Summary <span className="text-destructive">*</span></Label>
              <Textarea
                id="scenarioSummary"
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                placeholder="1-2 sentences describing this market condition (shown to clients)..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Demand Level</Label>
                <Select value={formDemand} onValueChange={(v: DemandLevel) => setFormDemand(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Competition Level</Label>
                <Select value={formCompetition} onValueChange={(v: CompetitionLevel) => setFormCompetition(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pricing Sensitivity</Label>
                <Select value={formPricing} onValueChange={(v: PricingSensitivity) => setFormPricing(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Typical Days on Market</Label>
                <Select value={formDOM} onValueChange={(v: DOMBand) => setFormDOM(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (Fast)</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="long">Long (Slow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Negotiation Leverage</Label>
              <Select value={formLeverage} onValueChange={(v: NegotiationLeverage) => setFormLeverage(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer Advantage</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="seller">Seller Advantage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || !formSummary.trim()}>
              {editingScenario ? 'Update' : 'Create'} Scenario
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
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketScenarios;
