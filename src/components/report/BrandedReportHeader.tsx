import { AgentBranding } from '@/lib/agentBranding';
import { loadAgentProfile } from '@/lib/agentProfile';

interface BrandedReportHeaderProps {
  reportType: 'Seller' | 'Buyer' | 'Comparison';
  clientName: string;
  snapshotTimestamp: string;
  branding?: AgentBranding | null;
  showTimestamp?: boolean;
}

export function BrandedReportHeader({
  reportType,
  clientName,
  snapshotTimestamp,
  branding,
  showTimestamp = true,
}: BrandedReportHeaderProps) {
  const agentProfile = loadAgentProfile();
  const clientDisplay = clientName?.trim() || 'Client';

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

      {/* Social links */}
      {branding?.social_links && Object.keys(branding.social_links).length > 0 && (
        <div className="mt-2 flex gap-3 flex-wrap">
          {Object.entries(branding.social_links).map(([platform, url]) =>
            url ? (
              <a
                key={platform}
                href={url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline capitalize"
              >
                {platform}
              </a>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
