/**
 * Smart Disclaimer — full notice on first occurrence, short footer on subsequent pages.
 */

import { AlertCircle } from 'lucide-react';

const FULL_DISCLAIMER = `This report is prepared by your agent as a decision-support tool. Market data reflects current conditions and patterns. For binding valuations or legal advice, consult a licensed appraiser or attorney.`;
const SHORT_DISCLAIMER = `This report is a decision-support tool. For binding valuations or legal advice, consult a licensed appraiser or attorney.`;

interface DisclaimerFooterProps {
  variant?: 'full' | 'short';
  className?: string;
}

export function DisclaimerFooter({ variant = 'full', className = '' }: DisclaimerFooterProps) {
  if (variant === 'short') {
    return (
      <div className={`pdf-section text-center py-3 ${className}`}>
        <p className="text-[10px] text-muted-foreground italic">{SHORT_DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <div className={`pdf-section pdf-avoid-break report-disclaimer ${className}`}>
      <div className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">{FULL_DISCLAIMER}</p>
      </div>
    </div>
  );
}
