import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, FileText, Building2, Users, Trash2, Play, Calendar, Plus, Pencil, RotateCcw } from 'lucide-react';
import { SessionTemplate, loadTemplates, deleteTemplate, saveTemplate, createBlankTemplate, ExplanatoryStyle } from '@/lib/templates';
import { loadMarketScenarios, MarketScenario } from '@/lib/marketScenarios';
import { loadAgentProfile } from '@/lib/agentProfile';
import { useToast } from '@/hooks/use-toast';
import { PropertyType, Condition, DesiredTimeframe, StrategyPreference, FinancingType, DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
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

const contingencyOptions: { value: Contingency; label: string }[] = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Financing', label: 'Financing' },
  { value: 'Appraisal', label: 'Appraisal' },
  { value: 'Home sale', label: 'Home Sale' },
  { value: 'None', label: 'None (Waiving all)' },
];

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [marketScenarios, setMarketScenarios] = useState<MarketScenario[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  
  // Edit/Create dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);
  const [createType, setCreateType] = useState<'Seller' | 'Buyer' | null>(null);
  
  // Form state for editing
  const [formName, setFormName] = useState('');
  const [formPropertyType, setFormPropertyType] = useState<PropertyType>('SFH');
  const [formCondition, setFormCondition] = useState<Condition>('Maintained');
  const [formScenarioId, setFormScenarioId] = useState<string>('');
  const [formStyle, setFormStyle] = useState<ExplanatoryStyle>('standard');
  const [formNotesBoilerplate, setFormNotesBoilerplate] = useState('');
  // Seller defaults
  const [formTimeframe, setFormTimeframe] = useState<DesiredTimeframe>('60');
  const [formStrategy, setFormStrategy] = useState<StrategyPreference>('Balanced');
  // Buyer defaults
  const [formFinancing, setFormFinancing] = useState<FinancingType>('Conventional');
  const [formDownPayment, setFormDownPayment] = useState<DownPaymentPercent>('20+');
  const [formContingencies, setFormContingencies] = useState<Contingency[]>(['Inspection', 'Financing']);
  const [formClosingTimeline, setFormClosingTimeline] = useState<ClosingTimeline>('21-30');
  const [formBuyerPreference, setFormBuyerPreference] = useState<BuyerPreference>('Balanced');

  useEffect(() => {
    refreshTemplates();
    setMarketScenarios(loadMarketScenarios());
  }, []);

  const refreshTemplates = () => {
    const allTemplates = loadTemplates().sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
    setTemplates(allTemplates);
  };

  const handleUseTemplate = (template: SessionTemplate) => {
    // Store template in sessionStorage for the flow to pick up
    sessionStorage.setItem('prefill_template', JSON.stringify(template));
    
    if (template.session_type === 'Seller') {
      navigate('/seller');
    } else {
      navigate('/buyer');
    }
    
    toast({
      title: "Template loaded",
      description: `Starting new ${template.session_type} session from "${template.name}"`,
    });
  };

  const handleDeleteClick = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete);
      refreshTemplates();
      toast({
        title: "Template deleted",
        description: "The template has been removed.",
      });
    }
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const openCreateDialog = (type: 'Seller' | 'Buyer') => {
    setCreateType(type);
    setEditingTemplate(null);
    
    // Reset form to defaults
    setFormName('');
    setFormPropertyType('SFH');
    setFormCondition('Maintained');
    setFormScenarioId('');
    setFormStyle('standard');
    setFormNotesBoilerplate('');
    setFormTimeframe('60');
    setFormStrategy('Balanced');
    setFormFinancing('Conventional');
    setFormDownPayment('20+');
    setFormContingencies(['Inspection', 'Financing']);
    setFormClosingTimeline('21-30');
    setFormBuyerPreference('Balanced');
    
    // Pre-fill agent info from profile
    const agentProfile = loadAgentProfile();
    // Agent info will be stored in template when saving
    
    setEditDialogOpen(true);
  };

  const openEditDialog = (template: SessionTemplate) => {
    setEditingTemplate(template);
    setCreateType(template.session_type);
    
    // Populate form from template
    setFormName(template.name);
    setFormPropertyType(template.property_type);
    setFormCondition(template.condition);
    setFormScenarioId(template.market_scenario_id || '');
    setFormStyle(template.explanatory_style || 'standard');
    setFormNotesBoilerplate(template.notes_boilerplate || '');
    
    if (template.seller_defaults) {
      setFormTimeframe(template.seller_defaults.desired_timeframe);
      setFormStrategy(template.seller_defaults.strategy_preference);
    }
    if (template.buyer_defaults) {
      setFormFinancing(template.buyer_defaults.financing_type);
      setFormDownPayment(template.buyer_defaults.down_payment_percent);
      setFormContingencies(template.buyer_defaults.contingencies);
      setFormClosingTimeline(template.buyer_defaults.closing_timeline);
      setFormBuyerPreference(template.buyer_defaults.buyer_preference);
    }
    
    setEditDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!formName.trim()) return;
    
    const agentProfile = loadAgentProfile();
    const type = editingTemplate?.session_type || createType!;
    
    const template: SessionTemplate = {
      id: editingTemplate?.id || crypto.randomUUID(),
      name: formName.trim(),
      session_type: type,
      property_type: formPropertyType,
      condition: formCondition,
      market_scenario_id: formScenarioId || undefined,
      explanatory_style: formStyle,
      notes_boilerplate: formNotesBoilerplate || undefined,
      agent_defaults: agentProfile ? {
        agent_name: agentProfile.agent_name,
        agent_email: agentProfile.email,
        agent_phone: agentProfile.phone,
        brokerage: agentProfile.brokerage_name,
      } : undefined,
      created_at: editingTemplate?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (type === 'Seller') {
      template.seller_defaults = {
        desired_timeframe: formTimeframe,
        strategy_preference: formStrategy,
      };
    } else {
      template.buyer_defaults = {
        financing_type: formFinancing,
        down_payment_percent: formDownPayment,
        contingencies: formContingencies,
        closing_timeline: formClosingTimeline,
        buyer_preference: formBuyerPreference,
      };
    }
    
    saveTemplate(template);
    refreshTemplates();
    setEditDialogOpen(false);
    
    toast({
      title: editingTemplate ? "Template updated" : "Template created",
      description: `"${formName}" has been saved.`,
    });
  };

  const handleContingencyChange = (contingency: Contingency, checked: boolean) => {
    if (contingency === 'None') {
      setFormContingencies(checked ? ['None'] : []);
    } else {
      if (checked) {
        setFormContingencies(prev => prev.filter(c => c !== 'None').concat(contingency));
      } else {
        setFormContingencies(prev => prev.filter(c => c !== contingency));
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScenarioName = (id: string | undefined) => {
    if (!id) return null;
    const scenario = marketScenarios.find(s => s.id === id);
    return scenario?.name;
  };

  const currentType = editingTemplate?.session_type || createType;

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
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Templates</h1>
                  <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''} saved</p>
                </div>
              </div>
            </div>
            
            {templates.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openCreateDialog('Seller')}>
                  <Building2 className="mr-2 h-4 w-4" />
                  New Seller Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => openCreateDialog('Buyer')}>
                  <Users className="mr-2 h-4 w-4" />
                  New Buyer Template
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {templates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">No templates yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Templates save your preferred defaults for new reports. Create one to speed up your workflow.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => openCreateDialog('Seller')}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Create Seller Template
                    </Button>
                    <Button variant="outline" onClick={() => openCreateDialog('Buyer')}>
                      <Users className="mr-2 h-4 w-4" />
                      Create Buyer Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${template.session_type === 'Seller' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                            {template.session_type === 'Seller' ? (
                              <Building2 className="h-6 w-6 text-primary" />
                            ) : (
                              <Users className="h-6 w-6 text-accent" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-serif text-lg font-semibold">{template.name}</h3>
                              <Badge variant={template.session_type === 'Seller' ? 'default' : 'accent'}>
                                {template.session_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{template.property_type}</span>
                              <span>•</span>
                              <span>{template.condition}</span>
                              {getScenarioName(template.market_scenario_id) && (
                                <>
                                  <span>•</span>
                                  <span>{getScenarioName(template.market_scenario_id)}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(template.updated_at || template.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button variant="accent" size="sm" onClick={() => handleUseTemplate(template)}>
                            <Play className="mr-2 h-4 w-4" />
                            Use Template
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(template.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingTemplate ? 'Edit Template' : `Create ${currentType} Template`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name <span className="text-destructive">*</span></Label>
                <Input
                  id="templateName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Standard Seller Setup"
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select value={formPropertyType} onValueChange={(v: PropertyType) => setFormPropertyType(v)}>
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
                  <Select value={formCondition} onValueChange={(v: Condition) => setFormCondition(v)}>
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
                <Label>Default Market Scenario</Label>
                <Select value={formScenarioId || "__none__"} onValueChange={(v) => setFormScenarioId(v === "__none__" ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select a scenario..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {marketScenarios.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type-specific defaults */}
            {currentType === 'Seller' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Seller Defaults</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Timeframe</Label>
                      <Select value={formTimeframe} onValueChange={(v: DesiredTimeframe) => setFormTimeframe(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90+">90+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Default Strategy</Label>
                      <Select value={formStrategy} onValueChange={(v: StrategyPreference) => setFormStrategy(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Maximize price">Maximize price</SelectItem>
                          <SelectItem value="Balanced">Balanced</SelectItem>
                          <SelectItem value="Prioritize speed">Prioritize speed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentType === 'Buyer' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Buyer Defaults</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Financing</Label>
                      <Select value={formFinancing} onValueChange={(v: FinancingType) => setFormFinancing(v)}>
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
                    {formFinancing !== 'Cash' && (
                      <div className="space-y-2">
                        <Label>Default Down Payment</Label>
                        <Select value={formDownPayment} onValueChange={(v: DownPaymentPercent) => setFormDownPayment(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<10">Less than 10%</SelectItem>
                            <SelectItem value="10-19">10-19%</SelectItem>
                            <SelectItem value="20+">20% or more</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Default Contingencies</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {contingencyOptions.map((opt) => (
                        <div key={opt.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:border-accent/30 transition-colors">
                          <Checkbox
                            id={`tmpl-${opt.value}`}
                            checked={formContingencies.includes(opt.value)}
                            onCheckedChange={(checked) => handleContingencyChange(opt.value, !!checked)}
                          />
                          <label htmlFor={`tmpl-${opt.value}`} className="text-sm cursor-pointer font-medium">
                            {opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Closing Timeline</Label>
                      <Select value={formClosingTimeline} onValueChange={(v: ClosingTimeline) => setFormClosingTimeline(v)}>
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
                      <Label>Default Buyer Preference</Label>
                      <Select value={formBuyerPreference} onValueChange={(v: BuyerPreference) => setFormBuyerPreference(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Must win">Must win</SelectItem>
                          <SelectItem value="Balanced">Balanced</SelectItem>
                          <SelectItem value="Price-protective">Price-protective</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes boilerplate */}
            <div className="space-y-2">
              <Label>Default Notes Boilerplate <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Textarea
                value={formNotesBoilerplate}
                onChange={(e) => setFormNotesBoilerplate(e.target.value)}
                placeholder="Standard text to include in client notes..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={!formName.trim()}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
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

export default Templates;
