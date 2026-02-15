import { Badge } from '@/components/ui/badge';
import { Radio, TrendingUp } from 'lucide-react';

interface SignalBadgeProps {
  source?: 'agent' | 'market' | 'fred';
  className?: string;
}

export function SignalBadge({ source = 'agent', className }: SignalBadgeProps) {
  const labels: Record<string, string> = {
    agent: 'Agent-Reported Signal',
    market: 'Market Intelligence',
    fred: 'FRED Economic Data',
  };

  return (
    <Badge variant="outline" className={`text-[10px] gap-1 font-normal border-accent/30 text-accent ${className ?? ''}`}>
      <Radio className="h-2.5 w-2.5" />
      {labels[source]}
    </Badge>
  );
}

interface SignalSectionHeaderProps {
  title: string;
  source?: 'agent' | 'market' | 'fred';
  icon?: React.ReactNode;
}

export function SignalSectionHeader({ title, source = 'agent', icon }: SignalSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        {icon || <TrendingUp className="h-4 w-4" />}
        {title}
      </h3>
      <SignalBadge source={source} />
    </div>
  );
}
