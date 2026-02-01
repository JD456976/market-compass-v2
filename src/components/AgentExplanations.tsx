import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Lightbulb } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LikelihoodBand, Session } from '@/types';

interface ConfidenceRangeProps {
  band: LikelihoodBand;
  label?: string;
}

// Confidence ranges for agent mode only
export function ConfidenceRange({ band, label }: ConfidenceRangeProps) {
  const ranges: Record<LikelihoodBand, string> = {
    High: '70–90%',
    Moderate: '40–65%',
    Low: '15–35%',
  };

  return (
    <span className="text-xs text-muted-foreground ml-1">
      ({ranges[band]})
    </span>
  );
}

interface WhyThisResultProps {
  band: LikelihoodBand;
  factors: string[];
}

export function WhyThisResult({ band, factors }: WhyThisResultProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (factors.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-start">
        <Info className="h-3.5 w-3.5" />
        <span>Why this is {band}</span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
          {factors.map((factor, index) => (
            <li key={index}>{factor}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface WhatWouldChangeProps {
  suggestions: string[];
}

export function WhatWouldChange({ suggestions }: WhatWouldChangeProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border/30">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground mb-1">What would change this</p>
          <p className="text-xs text-muted-foreground">
            {suggestions.join(' ')}
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper to generate factors based on session data
export function getAcceptanceFactors(session: Session, band: LikelihoodBand): string[] {
  const factors: string[] = [];
  const inputs = session.buyer_inputs;
  
  if (!inputs) return factors;

  // Positive factors
  if (inputs.financing_type === 'Cash') {
    factors.push('Cash financing provides strongest offer position');
  }
  if (inputs.closing_timeline === '<21' || inputs.closing_timeline === '21-30') {
    factors.push('Competitive closing timeline');
  }
  if (inputs.contingencies.length === 0 || inputs.contingencies.includes('None')) {
    factors.push('No contingencies increases seller confidence');
  }

  // Negative factors
  if (inputs.contingencies.includes('Home sale')) {
    factors.push('Home sale contingency significantly reduces certainty');
  }
  if (inputs.financing_type === 'FHA' || inputs.financing_type === 'VA') {
    factors.push('FHA/VA financing may require additional seller accommodations');
  }
  if (inputs.closing_timeline === '45+') {
    factors.push('Extended closing timeline may concern sellers');
  }
  if (inputs.contingencies.length >= 3) {
    factors.push('Multiple contingencies reduce offer competitiveness');
  }

  return factors.slice(0, 3); // Max 3 factors
}

export function getImprovementSuggestions(session: Session, band: LikelihoodBand): string[] {
  const suggestions: string[] = [];
  const inputs = session.buyer_inputs;
  
  if (!inputs || band === 'High') return suggestions;

  if (inputs.contingencies.length > 1) {
    suggestions.push('Reducing contingencies would likely increase certainty.');
  }
  if (inputs.closing_timeline === '31-45' || inputs.closing_timeline === '45+') {
    suggestions.push('Shortening the closing timeline could strengthen the offer.');
  }
  if (inputs.financing_type !== 'Cash' && inputs.down_payment_percent !== '20+') {
    suggestions.push('A larger down payment signals stronger buyer commitment.');
  }

  return suggestions;
}

export function getSellerFactors(session: Session, band: LikelihoodBand): string[] {
  const factors: string[] = [];
  const inputs = session.seller_inputs;
  
  if (!inputs) return factors;

  if (inputs.strategy_preference === 'Prioritize speed') {
    factors.push('Speed-focused strategy may accept lower offers');
  }
  if (inputs.strategy_preference === 'Maximize price') {
    factors.push('Price maximization may extend time on market');
  }
  if (inputs.desired_timeframe === '30') {
    factors.push('Aggressive timeline requires competitive pricing');
  }
  if (session.condition === 'Renovated' || session.condition === 'Updated') {
    factors.push('Property condition supports asking price');
  }
  if (session.condition === 'Dated') {
    factors.push('Property condition may limit buyer pool');
  }

  return factors.slice(0, 3);
}

export function getSellerImprovementSuggestions(session: Session, band: LikelihoodBand): string[] {
  const suggestions: string[] = [];
  const inputs = session.seller_inputs;
  
  if (!inputs || band === 'High') return suggestions;

  if (inputs.strategy_preference === 'Maximize price') {
    suggestions.push('A balanced approach could improve sale probability.');
  }
  if (inputs.desired_timeframe === '30') {
    suggestions.push('Extending the timeframe would provide more market exposure.');
  }

  return suggestions;
}
