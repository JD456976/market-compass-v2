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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-serif font-bold text-foreground">{reportType} Report</h2>
        {showTimestamp && (
          <p className="text-xs text-muted-foreground">
            Market snapshot as of: {new Date(snapshotTimestamp).toLocaleString()}
          </p>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-foreground">
          Prepared for: <span className="font-semibold">{clientDisplay}</span>
        </p>
        <p className="text-muted-foreground">
          Prepared by: {agentProfile.agent_name}, {agentProfile.brokerage_name}
        </p>
        <p className="text-muted-foreground">
          Contact: {agentProfile.phone} • {agentProfile.email}
          {agentProfile.website && ` • ${agentProfile.website}`}
        </p>
        {agentProfile.license && (
          <p className="text-muted-foreground">
            License: {agentProfile.license}
          </p>
        )}
      </div>
    </div>
  );
}
