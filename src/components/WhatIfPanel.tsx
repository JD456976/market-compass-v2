import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BuyerInputs, FinancingType, DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference } from '@/types';

interface WhatIfPanelProps {
  originalInputs: BuyerInputs;
  onInputsChange: (inputs: BuyerInputs) => void;
  currentInputs: BuyerInputs;
}

const CONTINGENCY_OPTIONS: { value: Contingency; label: string }[] = [
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Financing', label: 'Financing' },
  { value: 'Appraisal', label: 'Appraisal' },
  { value: 'Home sale', label: 'Home Sale' },
  { value: 'None', label: 'None (Waiving all)' },
];

const CONTINGENCY_EXPLANATIONS: Record<Contingency, string> = {
  'Inspection': 'Removing inspection can make your offer more attractive but reduces buyer protections.',
  'Financing': 'Removing financing contingency signals strength but increases risk if financing changes.',
  'Appraisal': 'Waiving appraisal shows commitment but means covering any gap if home appraises low.',
  'Home sale': 'Removing home sale contingency removes a major obstacle for sellers.',
  'None': 'Waiving all contingencies maximizes competitiveness but eliminates buyer protections.',
};

const FINANCING_OPTIONS: { value: FinancingType; label: string }[] = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Conventional', label: 'Conventional' },
  { value: 'FHA', label: 'FHA' },
  { value: 'VA', label: 'VA' },
  { value: 'Other', label: 'Other' },
];

const DOWN_PAYMENT_OPTIONS: { value: DownPaymentPercent; label: string }[] = [
  { value: '<10', label: 'Less than 10%' },
  { value: '10-19', label: '10-19%' },
  { value: '20+', label: '20% or more' },
];

const CLOSING_OPTIONS: { value: ClosingTimeline; label: string }[] = [
  { value: '<21', label: 'Under 21 days' },
  { value: '21-30', label: '21-30 days' },
  { value: '31-45', label: '31-45 days' },
  { value: '45+', label: 'Over 45 days' },
];

const PREFERENCE_OPTIONS: { value: BuyerPreference; label: string }[] = [
  { value: 'Must win', label: 'Must Win' },
  { value: 'Balanced', label: 'Balanced' },
  { value: 'Price-protective', label: 'Price-Protective' },
];

export function WhatIfPanel({ originalInputs, onInputsChange, currentInputs }: WhatIfPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localInputs, setLocalInputs] = useState<BuyerInputs>(currentInputs);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());

  // Track which fields have been changed from original
  useEffect(() => {
    const changed = new Set<string>();
    if (localInputs.offer_price !== originalInputs.offer_price) changed.add('offer_price');
    if (localInputs.financing_type !== originalInputs.financing_type) changed.add('financing_type');
    if (localInputs.down_payment_percent !== originalInputs.down_payment_percent) changed.add('down_payment_percent');
    if (localInputs.closing_timeline !== originalInputs.closing_timeline) changed.add('closing_timeline');
    if (localInputs.buyer_preference !== originalInputs.buyer_preference) changed.add('buyer_preference');
    
    const originalContingencies = new Set(originalInputs.contingencies);
    const currentContingencies = new Set(localInputs.contingencies);
    if (originalContingencies.size !== currentContingencies.size ||
        [...originalContingencies].some(c => !currentContingencies.has(c))) {
      changed.add('contingencies');
    }
    
    setChangedFields(changed);
  }, [localInputs, originalInputs]);

  // Debounced apply
  useEffect(() => {
    const timer = setTimeout(() => {
      onInputsChange(localInputs);
    }, 300);
    return () => clearTimeout(timer);
  }, [localInputs, onInputsChange]);

  const handleReset = useCallback(() => {
    setLocalInputs({ ...originalInputs });
  }, [originalInputs]);

  const handleContingencyChange = (contingency: Contingency, checked: boolean) => {
    setLocalInputs(prev => {
      let newContingencies: Contingency[];
      
      if (contingency === 'None') {
        // If "None" is selected, clear all others
        newContingencies = checked ? ['None'] : [];
      } else {
        // Remove "None" if selecting another contingency
        const filtered = prev.contingencies.filter(c => c !== 'None' && c !== contingency);
        if (checked) {
          newContingencies = [...filtered, contingency];
        } else {
          newContingencies = filtered;
        }
      }
      
      return { ...prev, contingencies: newContingencies };
    });
  };

  const hasChanges = changedFields.size > 0;
  const isCash = localInputs.financing_type === 'Cash';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <TooltipProvider>
      <Card className="pdf-exclude w-full max-w-full overflow-hidden">
        <CardHeader 
          className="cursor-pointer min-h-[56px] touch-manipulation"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-medium break-words">Scenario Explorer</CardTitle>
                {hasChanges && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                    Scenario: Modified
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                Try changes and see how they affect competitiveness
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {hasChanges && isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground h-10 min-h-[44px] px-2 sm:px-3"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Reset to Original</span>
                  <span className="sm:hidden">Reset</span>
                </Button>
              )}
              <div className="w-10 h-10 min-h-[44px] flex items-center justify-center">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 space-y-6 overflow-x-hidden">
                <p className="text-xs text-muted-foreground break-words">
                  Adjust offer terms below to explore different strategies. Changes here are private unless shared.
                </p>
                {/* Offer Details Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Offer Details</h4>
                  
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {/* Offer Price */}
                    <div className="space-y-2">
                      <Label htmlFor="whatif-price" className="text-sm flex items-center flex-wrap gap-1">
                        <span>Offer Price</span>
                        {changedFields.has('offer_price') && (
                          <span className="text-xs text-accent">Changed</span>
                        )}
                      </Label>
                      <Input
                        id="whatif-price"
                        type="number"
                        inputMode="numeric"
                        value={localInputs.offer_price}
                        onChange={(e) => setLocalInputs(prev => ({ 
                          ...prev, 
                          offer_price: parseInt(e.target.value) || 0 
                        }))}
                        className="h-11 min-h-[44px] w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Original: {formatCurrency(originalInputs.offer_price)}
                      </p>
                    </div>

                    {/* Financing Type */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center flex-wrap gap-1">
                        <span>Financing Type</span>
                        {changedFields.has('financing_type') && (
                          <span className="text-xs text-accent">Changed</span>
                        )}
                      </Label>
                      <Select
                        value={localInputs.financing_type}
                        onValueChange={(value: FinancingType) => 
                          setLocalInputs(prev => ({ ...prev, financing_type: value }))
                        }
                      >
                        <SelectTrigger className="h-11 min-h-[44px] w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FINANCING_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Down Payment - Hidden if Cash */}
                    {!isCash && (
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center flex-wrap gap-1">
                          <span>Down Payment</span>
                          {changedFields.has('down_payment_percent') && (
                            <span className="text-xs text-accent">Changed</span>
                          )}
                        </Label>
                        <Select
                          value={localInputs.down_payment_percent}
                          onValueChange={(value: DownPaymentPercent) => 
                            setLocalInputs(prev => ({ ...prev, down_payment_percent: value }))
                          }
                        >
                          <SelectTrigger className="h-11 min-h-[44px] w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOWN_PAYMENT_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contingencies & Terms Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center flex-wrap gap-1">
                    <span>Contingencies & Terms</span>
                    {changedFields.has('contingencies') && (
                      <span className="text-xs text-accent">Changed</span>
                    )}
                  </h4>
                  
                  <div className="space-y-2">
                    {CONTINGENCY_OPTIONS.map((opt) => {
                      const isChecked = localInputs.contingencies.includes(opt.value);
                      const wasOriginallyChecked = originalInputs.contingencies.includes(opt.value);
                      const isChanged = isChecked !== wasOriginallyChecked;
                      
                      return (
                        <div key={opt.value} className="min-h-[44px] flex items-center">
                          <div className="flex items-center gap-3 w-full py-1">
                            <Checkbox
                              id={`whatif-${opt.value}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => 
                                handleContingencyChange(opt.value, checked === true)
                              }
                              className="h-5 w-5 shrink-0"
                            />
                            <Label 
                              htmlFor={`whatif-${opt.value}`} 
                              className="text-sm cursor-pointer flex items-center gap-2 flex-wrap flex-1 min-w-0"
                            >
                              <span className="break-words">{opt.label}</span>
                              {isChanged && (
                                <span className="text-xs text-accent whitespace-nowrap">
                                  {isChecked ? 'Added' : 'Removed'}
                                </span>
                              )}
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  type="button" 
                                  className="h-8 w-8 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 touch-manipulation"
                                  aria-label={`Info about ${opt.label}`}
                                >
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[250px]">
                                <p className="text-xs">{CONTINGENCY_EXPLANATIONS[opt.value]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 pt-2">
                    {/* Closing Timeline */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center flex-wrap gap-1">
                        <span>Closing Timeline</span>
                        {changedFields.has('closing_timeline') && (
                          <span className="text-xs text-accent">Changed</span>
                        )}
                      </Label>
                      <Select
                        value={localInputs.closing_timeline}
                        onValueChange={(value: ClosingTimeline) => 
                          setLocalInputs(prev => ({ ...prev, closing_timeline: value }))
                        }
                      >
                        <SelectTrigger className="h-11 min-h-[44px] w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLOSING_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Buyer Preference */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center flex-wrap gap-1">
                        <span>Buyer Preference</span>
                        {changedFields.has('buyer_preference') && (
                          <span className="text-xs text-accent">Changed</span>
                        )}
                      </Label>
                      <Select
                        value={localInputs.buyer_preference}
                        onValueChange={(value: BuyerPreference) => 
                          setLocalInputs(prev => ({ ...prev, buyer_preference: value }))
                        }
                      >
                        <SelectTrigger className="h-11 min-h-[44px] w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PREFERENCE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </TooltipProvider>
  );
}
