import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import type { PropertyFactor } from '@/types';

interface PropertyFactorsCardProps {
  factors: PropertyFactor[];
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

export function PropertyFactorsCard({ factors }: PropertyFactorsCardProps) {
  if (!factors || factors.length === 0) return null;

  const positiveFactors = factors.filter(f => f.weight > 0);
  const negativeFactors = factors.filter(f => f.weight < 0);
  const netWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  return (
    <Card className="pdf-section pdf-avoid-break overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            Property Intelligence
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {positiveFactors.length} positive · {negativeFactors.length} concern{negativeFactors.length !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="grid gap-2">
          {factors.map((factor, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/30">
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
            </div>
          ))}
        </div>

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
