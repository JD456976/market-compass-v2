import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FileText, Send, FolderOpen, MessageSquare, Layers, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  illustration?: 'drafts' | 'shared' | 'messages' | 'scenarios' | 'clients' | 'compare';
  className?: string;
}

// Inline SVG illustrations for empty states
function DraftsIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
      <rect x="20" y="15" width="60" height="75" rx="6" className="fill-muted/40 stroke-muted-foreground/20" strokeWidth="1.5" />
      <rect x="30" y="25" width="40" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="30" y="35" width="35" height="3" rx="1.5" className="fill-muted-foreground/15" />
      <rect x="30" y="43" width="38" height="3" rx="1.5" className="fill-muted-foreground/15" />
      <rect x="30" y="51" width="25" height="3" rx="1.5" className="fill-muted-foreground/15" />
      <rect x="40" y="20" width="60" height="75" rx="6" className="fill-card stroke-border" strokeWidth="1.5" />
      <rect x="50" y="30" width="40" height="4" rx="2" className="fill-accent/30" />
      <rect x="50" y="40" width="35" height="3" rx="1.5" className="fill-muted-foreground/20" />
      <rect x="50" y="48" width="38" height="3" rx="1.5" className="fill-muted-foreground/20" />
      <rect x="50" y="56" width="25" height="3" rx="1.5" className="fill-muted-foreground/20" />
      <circle cx="85" cy="75" r="12" className="fill-accent/15 stroke-accent/40" strokeWidth="1.5" />
      <path d="M81 75h8M85 71v8" className="stroke-accent" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SharedIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
      <rect x="15" y="25" width="50" height="60" rx="5" className="fill-card stroke-border" strokeWidth="1.5" />
      <rect x="25" y="35" width="30" height="3" rx="1.5" className="fill-accent/30" />
      <rect x="25" y="43" width="25" height="3" rx="1.5" className="fill-muted-foreground/20" />
      <rect x="25" y="51" width="28" height="3" rx="1.5" className="fill-muted-foreground/20" />
      <path d="M65 55L85 40" className="stroke-accent/50" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M65 55L85 70" className="stroke-accent/50" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="90" cy="38" r="10" className="fill-primary/10 stroke-primary/30" strokeWidth="1.5" />
      <circle cx="88" cy="35" r="3" className="fill-primary/30" />
      <path d="M83 42a5 5 0 0110 0" className="fill-primary/20" />
      <circle cx="90" cy="72" r="10" className="fill-accent/10 stroke-accent/30" strokeWidth="1.5" />
      <circle cx="88" cy="69" r="3" className="fill-accent/30" />
      <path d="M83 76a5 5 0 0110 0" className="fill-accent/20" />
    </svg>
  );
}

function MessagesIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
      <rect x="15" y="20" width="65" height="40" rx="8" className="fill-primary/10 stroke-primary/25" strokeWidth="1.5" />
      <rect x="25" y="32" width="35" height="3" rx="1.5" className="fill-primary/20" />
      <rect x="25" y="40" width="25" height="3" rx="1.5" className="fill-primary/15" />
      <polygon points="25,60 35,60 20,72" className="fill-primary/10" />
      <rect x="40" y="50" width="65" height="35" rx="8" className="fill-accent/10 stroke-accent/25" strokeWidth="1.5" />
      <rect x="50" y="60" width="35" height="3" rx="1.5" className="fill-accent/25" />
      <rect x="50" y="68" width="25" height="3" rx="1.5" className="fill-accent/15" />
      <polygon points="95,85 85,85 100,95" className="fill-accent/10" />
    </svg>
  );
}

function ScenariosIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
      <rect x="10" y="30" width="30" height="55" rx="4" className="fill-card stroke-border" strokeWidth="1.5" />
      <rect x="15" y="38" width="20" height="3" rx="1.5" className="fill-primary/25" />
      <rect x="15" y="46" width="15" height="20" rx="2" className="fill-primary/10" />
      <rect x="45" y="20" width="30" height="65" rx="4" className="fill-card stroke-accent/40" strokeWidth="1.5" />
      <rect x="50" y="28" width="20" height="3" rx="1.5" className="fill-accent/35" />
      <rect x="50" y="36" width="15" height="25" rx="2" className="fill-accent/15" />
      <rect x="80" y="30" width="30" height="55" rx="4" className="fill-card stroke-border" strokeWidth="1.5" />
      <rect x="85" y="38" width="20" height="3" rx="1.5" className="fill-muted-foreground/20" />
      <rect x="85" y="46" width="15" height="20" rx="2" className="fill-muted-foreground/10" />
      <path d="M37 55h10M72 55h10" className="stroke-muted-foreground/30" strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

function ClientsIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
      <rect x="20" y="15" width="80" height="70" rx="8" className="fill-card stroke-border" strokeWidth="1.5" />
      <rect x="30" y="25" width="60" height="10" rx="4" className="fill-muted/60" />
      <rect x="30" y="42" width="60" height="8" rx="3" className="fill-muted/30" />
      <rect x="30" y="55" width="60" height="8" rx="3" className="fill-muted/30" />
      <rect x="30" y="68" width="40" height="8" rx="3" className="fill-muted/30" />
      <circle cx="95" cy="80" r="14" className="fill-accent/15 stroke-accent/40" strokeWidth="1.5" />
      <path d="M91 80h8M95 76v8" className="stroke-accent" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CompareIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
      <rect x="10" y="20" width="45" height="65" rx="5" className="fill-card stroke-primary/30" strokeWidth="1.5" />
      <rect x="18" y="30" width="30" height="4" rx="2" className="fill-primary/25" />
      <rect x="18" y="40" width="20" height="15" rx="2" className="fill-primary/10" />
      <rect x="18" y="60" width="25" height="3" rx="1.5" className="fill-muted-foreground/15" />
      <rect x="65" y="20" width="45" height="65" rx="5" className="fill-card stroke-accent/30" strokeWidth="1.5" />
      <rect x="73" y="30" width="30" height="4" rx="2" className="fill-accent/25" />
      <rect x="73" y="40" width="20" height="15" rx="2" className="fill-accent/10" />
      <rect x="73" y="60" width="25" height="3" rx="1.5" className="fill-muted-foreground/15" />
      <path d="M55 52h10" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round" />
      <path d="M57 48l-4 4 4 4M63 48l4 4-4 4" className="stroke-muted-foreground/30" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const illustrationMap = {
  drafts: DraftsIllustration,
  shared: SharedIllustration,
  messages: MessagesIllustration,
  scenarios: ScenariosIllustration,
  clients: ClientsIllustration,
  compare: CompareIllustration,
};

export function EmptyState({ icon: Icon = FileText, title, description, action, illustration, className }: EmptyStateProps) {
  const IllustrationComponent = illustration ? illustrationMap[illustration] : null;

  return (
    <Card className={className}>
      <CardContent className="py-12 text-center">
        {IllustrationComponent ? (
          <IllustrationComponent />
        ) : (
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-muted-foreground/60" />
          </div>
        )}
        <h3 className="text-base font-sans font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
        {action && (
          <div className="mt-5">
            {action.to ? (
              <Link to={action.to}>
                <Button variant="outline" size="sm">{action.label}</Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" onClick={action.onClick}>{action.label}</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Pre-configured empty states with illustrations
export function EmptyDrafts() {
  return (
    <EmptyState
      icon={FolderOpen}
      illustration="drafts"
      title="No draft analyses yet"
      description="Create a new Seller or Buyer report to get started. Your drafts will be saved here automatically."
      action={{ label: 'Create Report', to: '/' }}
    />
  );
}

export function EmptySharedReports() {
  return (
    <EmptyState
      icon={Send}
      illustration="shared"
      title="No shared reports"
      description="Reports you share with clients will appear here. Create a report and generate a share link to get started."
      action={{ label: 'View Drafts', to: '/drafts' }}
    />
  );
}

export function EmptyClientReports() {
  return (
    <EmptyState
      icon={FileText}
      illustration="clients"
      title="No reports found"
      description="Reports shared with you by your agent will appear here once you've viewed them."
    />
  );
}

export function EmptyMessages() {
  return (
    <EmptyState
      icon={MessageSquare}
      illustration="messages"
      title="No messages yet"
      description="Messages from clients will appear here when they respond to shared reports."
    />
  );
}

export function EmptyScenarios() {
  return (
    <EmptyState
      icon={Layers}
      illustration="scenarios"
      title="No scenarios submitted"
      description="When clients explore what-if scenarios and submit them for review, they'll appear here."
    />
  );
}

export function EmptyComparison() {
  return (
    <EmptyState
      icon={Layers}
      illustration="compare"
      title="Select properties to compare"
      description="Choose 2-3 properties from your reports to see a side-by-side comparison of key metrics."
    />
  );
}
