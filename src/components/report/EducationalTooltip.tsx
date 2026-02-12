import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TERM_DEFINITIONS: Record<string, { term: string; definition: string; example?: string }> = {
  dom: {
    term: 'Days on Market (DOM)',
    definition: 'The number of days a property is listed for sale before receiving an accepted offer.',
    example: 'A DOM of 15 in a hot market suggests high demand.',
  },
  saleToList: {
    term: 'Sale-to-List Ratio',
    definition: 'The final sale price divided by the original list price, expressed as a percentage.',
    example: '102% means homes sell for 2% over asking price.',
  },
  contingency: {
    term: 'Contingency',
    definition: 'A condition in a purchase contract that must be met before the sale can close.',
    example: 'An inspection contingency lets buyers renegotiate after a home inspection.',
  },
  escalation: {
    term: 'Escalation Clause',
    definition: 'A provision allowing the buyer\'s offer price to automatically increase to outbid competitors, up to a specified maximum.',
  },
  appraisal: {
    term: 'Appraisal',
    definition: 'An independent estimate of a property\'s market value by a licensed appraiser, typically required by the lender.',
  },
  earnestMoney: {
    term: 'Earnest Money',
    definition: 'A deposit made by the buyer to demonstrate serious intent to purchase, usually held in escrow.',
    example: 'Typically 1-3% of the purchase price.',
  },
  closingTimeline: {
    term: 'Closing Timeline',
    definition: 'The period between a signed purchase agreement and the final transfer of ownership.',
    example: 'Cash offers often close in 14-21 days vs. 30-45 for financed purchases.',
  },
  multipleOffers: {
    term: 'Multiple Offers',
    definition: 'When more than one buyer submits a purchase offer on the same property simultaneously.',
  },
  listPrice: {
    term: 'List Price',
    definition: 'The price at which a property is advertised for sale. Not always the expected sale price.',
    example: 'In competitive markets, homes may sell well above list price.',
  },
  marketCondition: {
    term: 'Market Condition',
    definition: 'The current state of supply and demand in the local real estate market, typically categorized as buyer\'s, seller\'s, or balanced.',
  },
  pricePerSqFt: {
    term: 'Price Per Square Foot',
    definition: 'The sale price divided by the total livable square footage, used to compare properties of different sizes.',
  },
  absorption: {
    term: 'Absorption Rate',
    definition: 'The rate at which available homes sell in a market over a given period, indicating market speed.',
    example: 'A 6-month supply is considered balanced. Less suggests a seller\'s market.',
  },
  comps: {
    term: 'Comparable Sales (Comps)',
    definition: 'Recently sold properties similar to the subject property, used to estimate market value.',
  },
  financing: {
    term: 'Financing Type',
    definition: 'The method of funding a home purchase: conventional loans, FHA, VA, or cash.',
    example: 'Cash offers are often preferred by sellers for faster, more certain closings.',
  },
  negotiationLeverage: {
    term: 'Negotiation Leverage',
    definition: 'The relative bargaining power of buyers vs. sellers, influenced by market conditions and property demand.',
  },
};

interface EducationalTooltipProps {
  termKey: keyof typeof TERM_DEFINITIONS;
  children?: React.ReactNode;
  className?: string;
}

export function EducationalTooltip({ termKey, children, className }: EducationalTooltipProps) {
  const term = TERM_DEFINITIONS[termKey];
  if (!term) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/40 ${className || ''}`}>
            {children || term.term}
            <HelpCircle className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] p-3">
          <p className="font-semibold text-xs mb-1">{term.term}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{term.definition}</p>
          {term.example && (
            <p className="text-xs text-muted-foreground/80 mt-1 italic">{term.example}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { TERM_DEFINITIONS };
