import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReviewSectionProps {
  title: string;
  stepIndex: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}

export const ReviewSection = ({ title, stepIndex, onEdit, children }: ReviewSectionProps) => (
  <div className="border border-border/50 rounded-lg overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => onEdit(stepIndex)}>
        <Pencil className="h-3 w-3 mr-1" />
        Edit
      </Button>
    </div>
    <div className="px-4 py-3 space-y-2">{children}</div>
  </div>
);

interface ReviewRowProps {
  label: string;
  value: string;
}

export const ReviewRow = ({ label, value }: ReviewRowProps) => (
  <div className="flex justify-between items-start gap-4 text-sm">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="text-foreground text-right font-medium break-words min-w-0">{value}</span>
  </div>
);
