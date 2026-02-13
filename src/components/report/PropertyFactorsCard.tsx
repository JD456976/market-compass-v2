import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Minus, Brain, Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import type { PropertyFactor } from '@/types';

interface PropertyFactorsCardProps {
  factors: PropertyFactor[];
  editable?: boolean;
  onFactorsChange?: (factors: PropertyFactor[]) => void;
}

function WeightBadge({ weight }: { weight: number }) {
  if (weight >= 1) return <Badge variant="success" className="text-xs">{weight > 0 ? '+' : ''}{weight}</Badge>;
  if (weight > 0) return <Badge variant="outline" className="text-xs bg-emerald-500/10">+{weight}</Badge>;
  if (weight <= -1) return <Badge variant="destructive" className="text-xs">{weight}</Badge>;
  if (weight < 0) return <Badge variant="outline" className="text-xs bg-destructive/10">{weight}</Badge>;
  return <Badge variant="outline" className="text-xs">0</Badge>;
}

function WeightIcon({ weight }: { weight: number }) {
  if (weight > 0) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (weight < 0) return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function EditableFactorRow({
  factor,
  onSave,
  onCancel,
}: {
  factor: PropertyFactor;
  onSave: (f: PropertyFactor) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(factor.label);
  const [weight, setWeight] = useState(String(factor.weight));
  const [explanation, setExplanation] = useState(factor.explanation);

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/20">
      <div className="flex gap-2">
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Factor label" className="h-8 text-sm flex-1" />
        <Input value={weight} onChange={e => setWeight(e.target.value)} placeholder="±weight" type="number" step="0.25" min="-2" max="2" className="h-8 text-sm w-20" />
      </div>
      <Input value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Explanation" className="h-8 text-sm" />
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancel}><X className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="default" className="h-7 px-2" onClick={() => onSave({ ...factor, label, weight: parseFloat(weight) || 0, explanation })}>
          <Check className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function PropertyFactorsCard({ factors, editable = false, onFactorsChange }: PropertyFactorsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  if (!factors || factors.length === 0) return null;

  const positiveFactors = factors.filter(f => f.weight > 0);
  const negativeFactors = factors.filter(f => f.weight < 0);
  const netWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  const handleSaveFactor = (index: number, updated: PropertyFactor) => {
    const newFactors = [...factors];
    newFactors[index] = updated;
    onFactorsChange?.(newFactors);
    setEditingIndex(null);
  };

  const handleDeleteFactor = (index: number) => {
    const newFactors = factors.filter((_, i) => i !== index);
    onFactorsChange?.(newFactors);
  };

  const handleAddFactor = (f: PropertyFactor) => {
    onFactorsChange?.([...factors, f]);
    setAddingNew(false);
  };

  const newFactor: PropertyFactor = {
    label: '',
    weight: 0,
    explanation: '',
    evidence: 'Agent override',
    confidence: 'high',
    source: 'field',
  };

  return (
    <Card className="pdf-section pdf-avoid-break overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            Property Intelligence
          </span>
          <span className="flex items-center gap-2">
            <span className="text-sm font-normal text-muted-foreground">
              {positiveFactors.length} positive · {negativeFactors.length} concern{negativeFactors.length !== 1 ? 's' : ''}
            </span>
            {editable && (
              <Button
                size="sm"
                variant={isEditing ? "secondary" : "ghost"}
                className="h-7 px-2 pdf-hide-agent-notes"
                onClick={() => { setIsEditing(!isEditing); setEditingIndex(null); setAddingNew(false); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="grid gap-2">
          {factors.map((factor, i) => (
            editingIndex === i ? (
              <EditableFactorRow
                key={i}
                factor={factor}
                onSave={(f) => handleSaveFactor(i, f)}
                onCancel={() => setEditingIndex(null)}
              />
            ) : (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/30 group">
                <WeightIcon weight={factor.weight} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{factor.label}</span>
                    <WeightBadge weight={factor.weight} />
                    {factor.confidence !== 'high' && (
                      <span className="text-[10px] text-muted-foreground">({factor.confidence})</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{factor.explanation}</p>
                </div>
                {isEditing && (
                  <div className="flex gap-1 shrink-0 pdf-hide-agent-notes">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingIndex(i)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteFactor(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )
          ))}
        </div>

        {addingNew && (
          <EditableFactorRow
            factor={newFactor}
            onSave={handleAddFactor}
            onCancel={() => setAddingNew(false)}
          />
        )}

        {isEditing && !addingNew && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs pdf-hide-agent-notes"
            onClick={() => setAddingNew(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Factor
          </Button>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Net impact on scoring</span>
          <span className={`text-sm font-semibold ${netWeight > 0 ? 'text-emerald-500' : netWeight < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {netWeight > 0 ? '+' : ''}{netWeight.toFixed(1)}
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          Factors extracted from property listing data. Weights influence acceptance likelihood and risk assessments.
        </p>
      </CardContent>
    </Card>
  );
}
