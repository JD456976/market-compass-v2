import { Badge } from '@/components/ui/badge';
import { Shield, Hash, Clock } from 'lucide-react';

interface ReportWatermarkProps {
  reportId: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  isPdfExported?: boolean;
  isShareLinkCreated?: boolean;
}

export function ReportWatermark({
  reportId,
  createdAt,
  updatedAt,
  version = 1,
  isPdfExported,
  isShareLinkCreated,
}: ReportWatermarkProps) {
  const shortId = reportId.substring(0, 8).toUpperCase();
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  const isModified = updated.getTime() - created.getTime() > 60000; // Modified if >1 min diff

  // Calculate version based on update pattern
  const effectiveVersion = isModified ? version + 1 : version;

  return (
    <div className="pdf-section pdf-avoid-break flex flex-wrap items-center gap-2 text-xs text-muted-foreground py-2 border-t border-border/50">
      <div className="flex items-center gap-1">
        <Hash className="h-3 w-3" />
        <span className="font-mono">{shortId}</span>
      </div>
      <span className="text-border">•</span>
      <div className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        <span>v{effectiveVersion}</span>
      </div>
      <span className="text-border">•</span>
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <span>Created {created.toLocaleDateString()}</span>
      </div>
      {isModified && (
        <>
          <span className="text-border">•</span>
          <span>Updated {updated.toLocaleDateString()}</span>
        </>
      )}
      {(isPdfExported || isShareLinkCreated) && (
        <>
          <span className="text-border">•</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {isPdfExported && isShareLinkCreated ? 'Exported & Shared' : isPdfExported ? 'Exported' : 'Shared'}
          </Badge>
        </>
      )}
    </div>
  );
}
