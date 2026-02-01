import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function MarketScenarioTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center ml-1">
          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs">
        Market Scenarios describe current market conditions and influence how likelihood and risk are explained. Choose the scenario that best matches the local market.
      </TooltipContent>
    </Tooltip>
  );
}
