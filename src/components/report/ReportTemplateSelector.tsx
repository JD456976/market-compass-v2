import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Briefcase, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReportTemplate = 'modern' | 'executive' | 'snapshot';

interface ReportTemplateSelectorProps {
  selected: ReportTemplate;
  onSelect: (template: ReportTemplate) => void;
}

const templates: { id: ReportTemplate; label: string; description: string; icon: typeof FileText }[] = [
  { id: 'modern', label: 'Modern', description: 'Clean, minimal design with visual emphasis', icon: FileText },
  { id: 'executive', label: 'Executive', description: 'Detailed, formal with full data tables', icon: Briefcase },
  { id: 'snapshot', label: 'Quick Snapshot', description: 'One-page summary overview', icon: Zap },
];

export function ReportTemplateSelector({ selected, onSelect }: ReportTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {templates.map((t) => {
        const Icon = t.icon;
        const isActive = selected === t.id;
        return (
          <Card
            key={t.id}
            className={cn(
              'cursor-pointer transition-all duration-200 border-2',
              isActive
                ? 'border-accent bg-accent/5 shadow-md'
                : 'border-border/50 hover:border-accent/40'
            )}
            onClick={() => onSelect(t.id)}
          >
            <CardContent className="p-4 text-center">
              <Icon className={cn('h-6 w-6 mx-auto mb-2', isActive ? 'text-accent' : 'text-muted-foreground')} />
              <p className={cn('text-sm font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                {t.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
              {isActive && (
                <Badge variant="secondary" className="mt-2 text-xs">Active</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
