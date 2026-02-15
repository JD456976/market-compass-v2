import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

interface MethodologyFooterProps {
  snapshotDate?: string;
  className?: string;
}

export function MethodologyFooter({ snapshotDate, className = '' }: MethodologyFooterProps) {
  const displayDate = snapshotDate 
    ? new Date(snapshotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className={`text-center space-y-2 py-4 ${className}`}>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        <Link to="/methodology" className="hover:underline hover:text-foreground transition-colors">
          Data & Methodology
        </Link>
      </div>
      <p className="text-[10px] text-muted-foreground max-w-md mx-auto leading-relaxed methodology-disclaimer">
        Uses public market trend research and federal economic data (FRED). Does not use MLS data or provide property valuations. 
        Does not guarantee outcomes.
        {displayDate && ` Analysis reflects conditions as of ${displayDate}.`}
      </p>
    </div>
  );
}
