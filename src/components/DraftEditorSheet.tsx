import { useState, useEffect } from 'react';
import { Session, PropertyType, Condition, FinancingType, ClosingTimeline, BuyerPreference, StrategyPreference, DesiredTimeframe, Contingency } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Building2, TrendingUp, FileText } from 'lucide-react';
import { upsertSession } from '@/lib/storage';
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

interface DraftEditorSheetProps {
  session: Session;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedSession: Session) => void;
}

const PROPERTY_TYPES: PropertyType[] = ['SFH', 'Condo', 'MFH'];
const CONDITIONS: Condition[] = ['Dated', 'Maintained', 'Updated', 'Renovated'];
const FINANCING_TYPES: FinancingType[] = ['Cash', 'Conventional', 'FHA', 'VA', 'Other'];
const CLOSING_TIMELINES: ClosingTimeline[] = ['<21', '21-30', '31-45', '45+'];
const BUYER_PREFERENCES: BuyerPreference[] = ['Must win', 'Balanced', 'Price-protective'];
const STRATEGY_PREFERENCES: StrategyPreference[] = ['Maximize price', 'Balanced', 'Prioritize speed'];
const TIMEFRAMES: DesiredTimeframe[] = ['30', '60', '90+'];
const CONTINGENCIES: Contingency[] = ['Inspection', 'Financing', 'Appraisal', 'Home sale', 'None'];

export function DraftEditorSheet({ session, open, onOpenChange, onSave }: DraftEditorSheetProps) {
  const [editedSession, setEditedSession] = useState<Session>(session);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  useEffect(() => {
    setEditedSession(session);
    setHasChanges(false);
  }, [session, open]);

  const updateField = <K extends keyof Session>(key: K, value: Session[K]) => {
    setEditedSession(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateBuyerInputs = <K extends keyof NonNullable<Session['buyer_inputs']>>(
    key: K, 
    value: NonNullable<Session['buyer_inputs']>[K]
  ) => {
    setEditedSession(prev => ({
      ...prev,
      buyer_inputs: prev.buyer_inputs ? { ...prev.buyer_inputs, [key]: value } : undefined
    }));
    setHasChanges(true);
  };

  const updateSellerInputs = <K extends keyof NonNullable<Session['seller_inputs']>>(
    key: K, 
    value: NonNullable<Session['seller_inputs']>[K]
  ) => {
    setEditedSession(prev => ({
      ...prev,
      seller_inputs: prev.seller_inputs ? { ...prev.seller_inputs, [key]: value } : undefined
    }));
    setHasChanges(true);
  };

  const handleContingencyChange = (contingency: Contingency, checked: boolean) => {
    if (!editedSession.buyer_inputs) return;
    
    let newContingencies: Contingency[];
    
    if (contingency === 'None') {
      newContingencies = checked ? ['None'] : [];
    } else {
      const current = editedSession.buyer_inputs.contingencies.filter(c => c !== 'None');
      if (checked) {
        newContingencies = [...current, contingency];
      } else {
        newContingencies = current.filter(c => c !== contingency);
      }
    }
    
    updateBuyerInputs('contingencies', newContingencies);
  };

  const handleSave = () => {
    upsertSession(editedSession);
    onSave(editedSession);
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    setHasChanges(false);
    onOpenChange(false);
  };

  const isBuyer = session.session_type === 'Buyer';
  const isCash = editedSession.buyer_inputs?.financing_type === 'Cash';

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-accent" />
              Edit Draft
            </SheetTitle>
            <SheetDescription>
              Modify this analysis. Changes will overwrite the existing draft.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 pb-20">
            {/* Basics Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Basics
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Label</Label>
                  <Input
                    id="client_name"
                    value={editedSession.client_name}
                    onChange={(e) => updateField('client_name', e.target.value)}
                    placeholder="Anonymized label..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editedSession.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="City, State or ZIP..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select value={editedSession.property_type} onValueChange={(v) => updateField('property_type', v as PropertyType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={editedSession.condition} onValueChange={(v) => updateField('condition', v as Condition)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Market & Strategy Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Market & Strategy
              </h3>
              <div className="grid gap-4">
                {isBuyer ? (
                  <>
                    <div className="space-y-2">
                      <Label>Buyer Strategy</Label>
                      <Select 
                        value={editedSession.buyer_inputs?.buyer_preference} 
                        onValueChange={(v) => updateBuyerInputs('buyer_preference', v as BuyerPreference)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BUYER_PREFERENCES.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Closing Timeline</Label>
                      <Select 
                        value={editedSession.buyer_inputs?.closing_timeline} 
                        onValueChange={(v) => updateBuyerInputs('closing_timeline', v as ClosingTimeline)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLOSING_TIMELINES.map(t => (
                            <SelectItem key={t} value={t}>{t} days</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Strategy Preference</Label>
                      <Select 
                        value={editedSession.seller_inputs?.strategy_preference} 
                        onValueChange={(v) => updateSellerInputs('strategy_preference', v as StrategyPreference)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STRATEGY_PREFERENCES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Desired Timeframe</Label>
                      <Select 
                        value={editedSession.seller_inputs?.desired_timeframe} 
                        onValueChange={(v) => updateSellerInputs('desired_timeframe', v as DesiredTimeframe)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEFRAMES.map(t => (
                            <SelectItem key={t} value={t}>{t} days</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Offer Terms (Buyer Only) */}
            {isBuyer && editedSession.buyer_inputs && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Offer Terms
                </h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offer_price">Offer Price</Label>
                    <Input
                      id="offer_price"
                      type="number"
                      value={editedSession.buyer_inputs.offer_price}
                      onChange={(e) => updateBuyerInputs('offer_price', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Financing Type</Label>
                    <Select 
                      value={editedSession.buyer_inputs.financing_type} 
                      onValueChange={(v) => {
                        const ft = v as FinancingType;
                        updateBuyerInputs('financing_type', ft);
                        if (ft === 'Cash') {
                          updateBuyerInputs('contingencies', 
                            editedSession.buyer_inputs!.contingencies.filter(c => c !== 'Financing')
                          );
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FINANCING_TYPES.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isCash && (
                    <div className="space-y-2">
                      <Label>Down Payment</Label>
                      <Select 
                        value={editedSession.buyer_inputs.down_payment_percent} 
                        onValueChange={(v) => updateBuyerInputs('down_payment_percent', v as typeof editedSession.buyer_inputs.down_payment_percent)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<10">Less than 10%</SelectItem>
                          <SelectItem value="10-19">10–19%</SelectItem>
                          <SelectItem value="20+">20% or more</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Contingencies</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {CONTINGENCIES
                        .filter(c => !(isCash && c === 'Financing'))
                        .map(c => (
                        <label key={c} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={editedSession.buyer_inputs!.contingencies.includes(c)}
                            onCheckedChange={(checked) => handleContingencyChange(c, !!checked)}
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="client_notes">Client Notes</Label>
                  <Textarea
                    id="client_notes"
                    value={isBuyer 
                      ? editedSession.buyer_inputs?.client_notes || editedSession.buyer_inputs?.notes || ''
                      : editedSession.seller_inputs?.client_notes || editedSession.seller_inputs?.notes || ''
                    }
                    onChange={(e) => isBuyer 
                      ? updateBuyerInputs('client_notes', e.target.value)
                      : updateSellerInputs('client_notes', e.target.value)
                    }
                    placeholder="Notes visible to client..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent_notes">Agent Notes (Private)</Label>
                  <Textarea
                    id="agent_notes"
                    value={isBuyer 
                      ? editedSession.buyer_inputs?.agent_notes || ''
                      : editedSession.seller_inputs?.agent_notes || ''
                    }
                    onChange={(e) => isBuyer 
                      ? updateBuyerInputs('agent_notes', e.target.value)
                      : updateSellerInputs('agent_notes', e.target.value)
                    }
                    placeholder="Internal notes (never shared)..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={!hasChanges}>
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
