import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, MessageSquare, Mail, Share2, Check } from 'lucide-react';

interface InviteShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteLink: string;
  clientName?: string;
}

export function InviteShareDialog({ open, onOpenChange, inviteLink, clientName }: InviteShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const displayName = clientName || 'your client';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: 'Link copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSMS = () => {
    const body = encodeURIComponent(`You've been invited to collaborate on your property analysis. Join here: ${inviteLink}`);
    window.open(`sms:?body=${body}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Your Property Analysis Invitation');
    const body = encodeURIComponent(`Hi ${displayName},\n\nYou've been invited to collaborate on your property analysis. Click the link below to get started:\n\n${inviteLink}\n\nLooking forward to working together!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Property Analysis Invitation',
          text: `You've been invited to collaborate on your property analysis.`,
          url: inviteLink,
        });
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Invitation</DialogTitle>
          <DialogDescription>
            Send the invite link to {displayName} via your preferred method.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleSMS} className="justify-start gap-2">
              <MessageSquare className="h-4 w-4" />
              Text / SMS
            </Button>
            <Button variant="outline" onClick={handleEmail} className="justify-start gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button variant="secondary" onClick={handleNativeShare} className="w-full gap-2">
              <Share2 className="h-4 w-4" />
              More sharing options…
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
