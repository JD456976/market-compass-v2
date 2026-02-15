import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface AnalysisMethodologyProps {
  className?: string;
}

export function AnalysisMethodology({ className = '' }: AnalysisMethodologyProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`pdf-section pdf-avoid-break ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors group">
          <span className="text-sm font-medium text-foreground">How this analysis is formed</span>
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This analysis combines:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-disc list-inside pl-1">
              <li>Your selected strategy and timeframe</li>
              <li>Typical buyer and seller behavior in similar market conditions</li>
              <li>Local market pace patterns for the selected area</li>
              <li>Current mortgage rates from federal economic data (FRED)</li>
              <li>Agent-reported field signals (showing traffic, offer deadlines, price changes)</li>
            </ul>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border/50 leading-relaxed">
              This report does not use MLS data, predict outcomes, or replace professional judgment. 
              Mortgage rate data is sourced from the Federal Reserve (FRED). 
              It is designed to support decision conversations by illustrating tradeoffs.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
