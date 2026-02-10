import { useState, useMemo } from 'react';
import { Session, LikelihoodBand, ExtendedLikelihoodBand } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { FlaskConical, ArrowRight, Save } from 'lucide-react';
import { upsertSession } from '@/lib/storage';

interface AgentLabProps {
  session: Session;
  currentLikelihood: ExtendedLikelihoodBand | LikelihoodBand;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (updatedSession: Session) => void;
}

interface LabSliders {
  contingencyStrictness: number; // 0 = light, 100 = heavy
  timelineCompetitiveness: number; // 0 = flexible, 100 = aggressive
  priceCompetitiveness: number; // 0 = conservative, 100 = aggressive
  financingStrength: number; // 0 = weak, 100 = strong
}

function calculatePreviewLikelihood(sliders: LabSliders): { band: LikelihoodBand; score: number } {
  let score = 0;
  
  // Financing strength: strong(+3), medium(+1), weak(0)
  if (sliders.financingStrength >= 80) score += 3;
  else if (sliders.financingStrength >= 40) score += 1;
  
  // Contingency strictness: light(+2), medium(0), heavy(-1)
  if (sliders.contingencyStrictness <= 20) score += 2;
  else if (sliders.contingencyStrictness <= 50) score += 1;
  else if (sliders.contingencyStrictness >= 80) score -= 1;
  
  // Timeline: aggressive(+2), medium(+1), flexible(0)
  if (sliders.timelineCompetitiveness >= 80) score += 2;
  else if (sliders.timelineCompetitiveness >= 40) score += 1;
  
  // Price competitiveness: aggressive(+1), conservative(-1)
  if (sliders.priceCompetitiveness >= 70) score += 1;
  else if (sliders.priceCompetitiveness <= 30) score -= 1;
  
  let band: LikelihoodBand;
  if (score <= 0) band = 'Low';
  else if (score >= 5) band = 'High';
  else band = 'Moderate';
  
  return { band, score };
}

function getConfidenceRange(band: string): string {
  switch (band) {
    case 'Very High': return '85–95%';
    case 'High': return '70–90%';
    case 'Moderate': return '45–60%';
    case 'Low': return '15–35%';
    case 'Very Low': return '5–15%';
    default: return '';
  }
}

function getInitialSliders(session: Session): LabSliders {
  const inputs = session.buyer_inputs;
  
  if (!inputs) {
    return {
      contingencyStrictness: 50,
      timelineCompetitiveness: 50,
      priceCompetitiveness: 50,
      financingStrength: 50,
    };
  }
  
  // Map current session to slider values
  let contingencyStrictness = 50;
  const contingencies = inputs.contingencies;
  if (contingencies.includes('None') || contingencies.length === 0) {
    contingencyStrictness = 10;
  } else if (contingencies.length === 1 && contingencies[0] === 'Inspection') {
    contingencyStrictness = 30;
  } else if (contingencies.includes('Home sale')) {
    contingencyStrictness = 90;
  } else if (contingencies.length >= 3) {
    contingencyStrictness = 75;
  }
  
  let timelineCompetitiveness = 50;
  switch (inputs.closing_timeline) {
    case '<21': timelineCompetitiveness = 90; break;
    case '21-30': timelineCompetitiveness = 70; break;
    case '31-45': timelineCompetitiveness = 40; break;
    case '45+': timelineCompetitiveness = 20; break;
  }
  
  let financingStrength = 50;
  if (inputs.financing_type === 'Cash') {
    financingStrength = 100;
  } else if (inputs.financing_type === 'Conventional') {
    if (inputs.down_payment_percent === '20+') financingStrength = 75;
    else if (inputs.down_payment_percent === '10-19') financingStrength = 55;
    else financingStrength = 40;
  } else {
    financingStrength = 35;
  }
  
  let priceCompetitiveness = 50;
  switch (inputs.buyer_preference) {
    case 'Must win': priceCompetitiveness = 80; break;
    case 'Balanced': priceCompetitiveness = 50; break;
    case 'Price-protective': priceCompetitiveness = 25; break;
  }
  
  return {
    contingencyStrictness,
    timelineCompetitiveness,
    priceCompetitiveness,
    financingStrength,
  };
}

function mapSlidersToSession(session: Session, sliders: LabSliders): Session {
  if (!session.buyer_inputs) return session;
  
  const newSession = { ...session, buyer_inputs: { ...session.buyer_inputs } };
  
  // Map contingency strictness
  if (sliders.contingencyStrictness <= 20) {
    newSession.buyer_inputs.contingencies = ['None'];
  } else if (sliders.contingencyStrictness <= 40) {
    newSession.buyer_inputs.contingencies = ['Inspection'];
  } else if (sliders.contingencyStrictness <= 60) {
    newSession.buyer_inputs.contingencies = ['Inspection', 'Financing'];
  } else if (sliders.contingencyStrictness <= 80) {
    newSession.buyer_inputs.contingencies = ['Inspection', 'Financing', 'Appraisal'];
  } else {
    newSession.buyer_inputs.contingencies = ['Inspection', 'Financing', 'Appraisal', 'Home sale'];
  }
  
  // Map timeline
  if (sliders.timelineCompetitiveness >= 80) {
    newSession.buyer_inputs.closing_timeline = '<21';
  } else if (sliders.timelineCompetitiveness >= 55) {
    newSession.buyer_inputs.closing_timeline = '21-30';
  } else if (sliders.timelineCompetitiveness >= 30) {
    newSession.buyer_inputs.closing_timeline = '31-45';
  } else {
    newSession.buyer_inputs.closing_timeline = '45+';
  }
  
  // Map financing strength (only if not locked to cash)
  if (sliders.financingStrength >= 95) {
    newSession.buyer_inputs.financing_type = 'Cash';
  } else if (sliders.financingStrength >= 60) {
    newSession.buyer_inputs.financing_type = 'Conventional';
    newSession.buyer_inputs.down_payment_percent = '20+';
  } else if (sliders.financingStrength >= 40) {
    newSession.buyer_inputs.financing_type = 'Conventional';
    newSession.buyer_inputs.down_payment_percent = '10-19';
  } else {
    newSession.buyer_inputs.financing_type = 'FHA';
    newSession.buyer_inputs.down_payment_percent = '<10';
  }
  
  // Map price competitiveness to preference
  if (sliders.priceCompetitiveness >= 65) {
    newSession.buyer_inputs.buyer_preference = 'Must win';
  } else if (sliders.priceCompetitiveness >= 35) {
    newSession.buyer_inputs.buyer_preference = 'Balanced';
  } else {
    newSession.buyer_inputs.buyer_preference = 'Price-protective';
  }
  
  return newSession;
}

export function AgentLab({ session, currentLikelihood, open, onOpenChange, onApply }: AgentLabProps) {
  const [sliders, setSliders] = useState<LabSliders>(() => getInitialSliders(session));
  
  const preview = useMemo(() => calculatePreviewLikelihood(sliders), [sliders]);
  const isCash = session.buyer_inputs?.financing_type === 'Cash';
  
  const handleApply = () => {
    const updatedSession = mapSlidersToSession(session, sliders);
    upsertSession(updatedSession);
    onApply(updatedSession);
    onOpenChange(false);
  };
  
  const hasChanges = useMemo(() => {
    const initial = getInitialSliders(session);
    return (
      initial.contingencyStrictness !== sliders.contingencyStrictness ||
      initial.timelineCompetitiveness !== sliders.timelineCompetitiveness ||
      initial.priceCompetitiveness !== sliders.priceCompetitiveness ||
      initial.financingStrength !== sliders.financingStrength
    );
  }, [session, sliders]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-accent" />
            Agent Lab
          </SheetTitle>
          <SheetDescription>
            Model "what-if" scenarios. Adjustments can be applied to the draft.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-24">
          {/* Preview Impact */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-3">Preview Impact</p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Current</p>
                <Badge variant={currentLikelihood === 'High' ? 'success' : currentLikelihood === 'Moderate' ? 'warning' : 'outline'}>
                  {currentLikelihood}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1">{getConfidenceRange(currentLikelihood)}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Projected</p>
                <Badge variant={preview.band === 'High' ? 'success' : preview.band === 'Moderate' ? 'warning' : 'outline'}>
                  {preview.band}
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1">{getConfidenceRange(preview.band)}</p>
              </div>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Contingency Strictness</label>
                <span className="text-xs text-muted-foreground">
                  {sliders.contingencyStrictness <= 30 ? 'Light' : sliders.contingencyStrictness >= 70 ? 'Heavy' : 'Standard'}
                </span>
              </div>
              <Slider
                value={[sliders.contingencyStrictness]}
                onValueChange={([v]) => setSliders(s => ({ ...s, contingencyStrictness: v }))}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Light</span>
                <span>Heavy</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Timeline Competitiveness</label>
                <span className="text-xs text-muted-foreground">
                  {sliders.timelineCompetitiveness <= 30 ? 'Flexible' : sliders.timelineCompetitiveness >= 70 ? 'Aggressive' : 'Standard'}
                </span>
              </div>
              <Slider
                value={[sliders.timelineCompetitiveness]}
                onValueChange={([v]) => setSliders(s => ({ ...s, timelineCompetitiveness: v }))}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Flexible</span>
                <span>Aggressive</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Price Competitiveness</label>
                <span className="text-xs text-muted-foreground">
                  {sliders.priceCompetitiveness <= 30 ? 'Conservative' : sliders.priceCompetitiveness >= 70 ? 'Aggressive' : 'Balanced'}
                </span>
              </div>
              <Slider
                value={[sliders.priceCompetitiveness]}
                onValueChange={([v]) => setSliders(s => ({ ...s, priceCompetitiveness: v }))}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Conservative</span>
                <span>Aggressive</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Financing Strength</label>
                <span className="text-xs text-muted-foreground">
                  {sliders.financingStrength >= 95 ? 'Cash' : sliders.financingStrength >= 60 ? 'Strong' : sliders.financingStrength >= 40 ? 'Average' : 'Weak'}
                </span>
              </div>
              <Slider
                value={[sliders.financingStrength]}
                onValueChange={([v]) => setSliders(s => ({ ...s, financingStrength: isCash ? 100 : v }))}
                max={100}
                step={5}
                disabled={isCash}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Weak</span>
                <span>Strong / Cash</span>
              </div>
              {isCash && (
                <p className="text-[10px] text-muted-foreground italic">Cash offer — financing is locked to strong.</p>
              )}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleApply} className="flex-1" disabled={!hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            Apply to Draft
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AgentLabTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onClick}
      className="h-8 gap-1.5 text-xs font-medium"
    >
      <FlaskConical className="h-3.5 w-3.5" />
      Lab
    </Button>
  );
}
