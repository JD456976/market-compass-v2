import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell } from 'lucide-react';

interface NotificationPrePromptProps {
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  role: 'agent' | 'client';
}

export function NotificationPrePrompt({ open, onConfirm, onDismiss, role }: NotificationPrePromptProps) {
  const description = role === 'agent'
    ? 'Get notified when clients send messages, submit scenarios, or view your reports — even when the app is in the background.'
    : 'Get notified when your agent sends you a new message or updates your report.';

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            Stay in the Loop
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {description}
            <br /><br />
            <span className="text-xs text-muted-foreground">
              You can change this anytime in your device settings. We only send notifications about activity on your reports — never marketing.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss}>Not Now</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Turn On Notifications</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
