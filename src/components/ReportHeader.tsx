import { useEffect, useState } from 'react';
import { loadAgentProfile } from '@/lib/agentProfile';
import { loadAgentBranding, AgentBranding } from '@/lib/agentBranding';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Phone, Globe, Award } from 'lucide-react';

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

  // Sync state when external branding prop changes (e.g. async load in SharedReport)
  useEffect(() => {
    if (externalBranding !== undefined && externalBranding !== null) {
      setBranding(externalBranding);
    }
  }, [externalBranding]);

  useEffect(() => {
    if (externalBranding !== undefined) return;
    if (!user?.id) return;
    loadAgentBranding(user.id).then(setBranding);
  }, [user?.id, externalBranding]);

  return (
    <div className="pdf-avoid-break mb-6">
      {/* Branded Header Card */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary/60" />
        
        <div className="p-5 sm:p-6">
          {/* Logo + Report Type + Date Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              {branding?.logo_url && (
                <img
                  src={branding.logo_url}
                  alt="Agent logo"
                  className="h-10 w-auto max-w-[120px] object-contain"
                />
              )}
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground">{reportType} Report</h2>
                {showTimestamp && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(snapshotTimestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Prepared for</p>
              <p className="text-base font-semibold text-foreground">{clientDisplay}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/60 my-4" />

          {/* Agent Info Row */}
          <div className="flex gap-4 items-start">
            {branding?.headshot_url && (
              <img
                src={branding.headshot_url}
                alt="Agent headshot"
                className="h-16 w-16 rounded-xl object-cover border-2 border-border shadow-sm shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-base">{agentProfile.agent_name}</p>
              <p className="text-sm text-muted-foreground mb-2">{agentProfile.brokerage_name}</p>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {agentProfile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {agentProfile.phone}
                  </span>
                )}
                {agentProfile.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {agentProfile.email}
                  </span>
                )}
                {agentProfile.website && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {agentProfile.website}
                  </span>
                )}
                {agentProfile.license && (
                  <span className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Lic. {agentProfile.license}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Custom footer text */}
          {branding?.footer_text && (
            <p className="mt-4 text-xs text-muted-foreground italic border-t border-border/40 pt-3">{branding.footer_text}</p>
          )}
        </div>
      </div>
    </div>
  );
}
