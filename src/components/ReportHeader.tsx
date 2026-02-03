import { loadAgentProfile } from '@/lib/agentProfile';

interface ReportHeaderProps {
  reportType: 'Seller' | 'Buyer' | 'Comparison';
  clientName: string;
  snapshotTimestamp: string;
  showTimestamp?: boolean;
}

export function ReportHeader({ reportType, clientName, snapshotTimestamp, showTimestamp = true }: ReportHeaderProps) {
  const agentProfile = loadAgentProfile();
  const clientDisplay = clientName?.trim() || 'Client';

  return (
    <div className="pdf-avoid-break mb-6 pb-4 border-b border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 className="text-xl font-serif font-bold text-foreground">{reportType} Report</h2>
        {showTimestamp && (
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(snapshotTimestamp).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="space-y-1.5 text-sm">
        <p className="text-foreground break-words">
          Prepared for: <span className="font-semibold">{clientDisplay}</span>
        </p>
        <p className="text-muted-foreground break-words">
          Prepared by: {agentProfile.agent_name}, {agentProfile.brokerage_name}
        </p>
        <p className="text-muted-foreground break-all">
          {agentProfile.phone} • {agentProfile.email}
        </p>
        {agentProfile.website && (
          <p className="text-muted-foreground break-all">
            {agentProfile.website}
          </p>
        )}
        {agentProfile.license && (
          <p className="text-muted-foreground">
            License: {agentProfile.license}
          </p>
        )}
      </div>
    </div>
  );
}
