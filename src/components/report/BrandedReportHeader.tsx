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
  // Prefer live profile data from branding (fetched from DB for shared reports),
  // fall back to localStorage for agent-side views
  const localProfile = loadAgentProfile();
  const agentName   = branding?.agent_name   || localProfile.agent_name;
  const brokerage   = branding?.brokerage    || localProfile.brokerage_name;
  const phone       = branding?.phone        || localProfile.phone;
  const email       = branding?.email        || localProfile.email;
  const license     = branding?.license      || localProfile.license;
  const website     = localProfile.website;

  const clientDisplay = clientName?.trim() || 'Client';
  const headshotUrl   = branding?.headshot_url ?? null;

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
        {headshotUrl && (
          <img
            src={headshotUrl}
            alt={agentName || 'Agent'}
            className="h-14 w-14 rounded-full object-cover border-2 border-border shrink-0"
          />
        )}
        <div className="space-y-1.5 text-sm min-w-0">
          <p className="text-foreground break-words">
            Prepared for: <span className="font-semibold">{clientDisplay}</span>
          </p>
          {agentName && (
            <p className="text-muted-foreground break-words font-medium">
              {agentName}{brokerage ? `, ${brokerage}` : ''}
            </p>
          )}
          {(phone || email) && (
            <p className="text-muted-foreground break-all">
              {[phone, email].filter(Boolean).join(' • ')}
            </p>
          )}
          {website && (
            <p className="text-muted-foreground break-all">{website}</p>
          )}
          {license && (
            <p className="text-muted-foreground">License: {license}</p>
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
