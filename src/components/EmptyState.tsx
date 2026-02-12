import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FileText, Send, Compass, Building2, Users, FolderOpen, MessageSquare, Layers, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon = FileText, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="py-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-serif font-semibold text-foreground mb-1">{title}</h3>
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

// Pre-configured empty states for common scenarios
export function EmptyDrafts() {
  return (
    <EmptyState
      icon={FolderOpen}
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
      title="No reports found"
      description="Reports shared with you by your agent will appear here once you've viewed them."
    />
  );
}

export function EmptyMessages() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages yet"
      description="Messages from clients will appear here when they respond to shared reports."
    />
  );
}

export function EmptyScenarios() {
  return (
    <EmptyState
      icon={Layers}
      title="No scenarios submitted"
      description="When clients explore what-if scenarios and submit them for review, they'll appear here."
    />
  );
}
