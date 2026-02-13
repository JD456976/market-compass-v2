import { useEffect, useState } from 'react';
import { loadAgentProfile } from '@/lib/agentProfile';
import { loadAgentBranding, AgentBranding } from '@/lib/agentBranding';
import { useAuth } from '@/contexts/AuthContext';

interface ReportHeaderProps {
  reportType: 'Seller' | 'Buyer' | 'Comparison';
  clientName: string;
  snapshotTimestamp: string;
  showTimestamp?: boolean;
  branding?: AgentBranding | null;
}

export function ReportHeader({ reportType, clientName, snapshotTimestamp, showTimestamp = true, branding: externalBranding }: ReportHeaderProps) {
  const agentProfile = loadAgentProfile();
  const clientDisplay = clientName?.trim() || 'Client';
  const { user } = useAuth();
  const [branding, setBranding] = useState<AgentBranding | null>(externalBranding ?? null);

  useEffect(() => {
    if (externalBranding !== undefined) return;
    if (!user?.id) return;
    loadAgentBranding(user.id).then(setBranding);
  }, [user?.id, externalBranding]);

  return (
    <div className="pdf-avoid-break mb-6 pb-4 border-b border-border">
      {/* Logo + Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {branding?.logo_url && (
            <img
              src={branding.logo_url}
              alt="Agent logo"
              className="h-10 w-auto max-w-[120px] object-contain"
            />
          )}
          <h2 className="text-xl font-serif font-bold text-foreground">{reportType} Report</h2>
        </div>
        {showTimestamp && (
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(snapshotTimestamp).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Agent Info */}
      <div className="flex gap-4 items-start">
        {branding?.headshot_url && (
          <img
            src={branding.headshot_url}
            alt="Agent headshot"
            className="h-14 w-14 rounded-full object-cover border-2 border-border shrink-0"
          />
        )}
        <div className="space-y-1.5 text-sm min-w-0">
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
            <p className="text-muted-foreground break-all">{agentProfile.website}</p>
          )}
          {agentProfile.license && (
            <p className="text-muted-foreground">License: {agentProfile.license}</p>
          )}
        </div>
      </div>

      {/* Custom footer text */}
      {branding?.footer_text && (
        <p className="mt-3 text-xs text-muted-foreground italic">{branding.footer_text}</p>
      )}
    </div>
  );
}
