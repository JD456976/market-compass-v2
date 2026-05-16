import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoIcon } from 'lucide-react';

export function AdminToolsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <InfoIcon className="h-4 w-4 text-muted-foreground" />
          Admin Tools
        </CardTitle>
        <CardDescription>
          User management has moved to the <strong>Users</strong> tab. Use Invite User to onboard new agents, and the eye icon to manage individual access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Advanced tooling (bulk operations, data wipe) will be added here in a future update.
        </p>
      </CardContent>
    </Card>
  );
}
