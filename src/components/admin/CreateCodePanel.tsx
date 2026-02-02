import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, X } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface CreateCodePanelProps {
  userEmail: string;
  onClose: () => void;
  onCreated: () => void;
}

// Generate a human-friendly code (avoids 0/O and 1/I)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function CreateCodePanel({ userEmail, onClose, onCreated }: CreateCodePanelProps) {
  const [issuedTo, setIssuedTo] = useState('');
  const [expiration, setExpiration] = useState<'none' | '7' | '14' | 'custom'>('none');
  const [customDate, setCustomDate] = useState('');
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!issuedTo.trim()) {
      toast({
        title: 'Required field',
        description: 'Please enter who this code is issued to.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const code = generateCode();
      let expiresAt: string | null = null;

      if (expiration === '7') {
        expiresAt = addDays(new Date(), 7).toISOString();
      } else if (expiration === '14') {
        expiresAt = addDays(new Date(), 14).toISOString();
      } else if (expiration === 'custom' && customDate) {
        expiresAt = new Date(customDate).toISOString();
      }

      const { error } = await supabase.from('beta_access_codes').insert({
        code,
        created_by: userEmail,
        issued_to: issuedTo.trim(),
        expires_at: expiresAt,
        note: note.trim() || null,
      });

      if (error) throw error;

      setCreatedCode(code);
      toast({
        title: 'Code created',
        description: `Access code for ${issuedTo} is ready.`,
      });
    } catch (error) {
      console.error('Error creating code:', error);
      toast({
        title: 'Failed to create code',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (createdCode) {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    onCreated();
    onClose();
  };

  if (createdCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Code Created</CardTitle>
          <CardDescription>Share this code with {issuedTo}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-mono font-bold tracking-widest">{createdCode}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p><strong>Issued to:</strong> {issuedTo}</p>
            {expiration !== 'none' && (
              <p><strong>Expires:</strong> {
                expiration === '7' ? format(addDays(new Date(), 7), 'PPP') :
                expiration === '14' ? format(addDays(new Date(), 14), 'PPP') :
                customDate ? format(new Date(customDate), 'PPP') : 'N/A'
              }</p>
            )}
          </div>
          <Button onClick={handleDone} className="w-full">Done</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Generate Access Code</CardTitle>
          <CardDescription>Create a new single-use beta access code</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="issuedTo">Issued To *</Label>
          <Input
            id="issuedTo"
            placeholder="Agent name or email"
            value={issuedTo}
            onChange={(e) => setIssuedTo(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Expiration</Label>
          <RadioGroup value={expiration} onValueChange={(v) => setExpiration(v as typeof expiration)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none" className="font-normal">No expiration</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="7" id="7days" />
              <Label htmlFor="7days" className="font-normal">7 days</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="14" id="14days" />
              <Label htmlFor="14days" className="font-normal">14 days</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="font-normal">Custom date</Label>
            </div>
          </RadioGroup>
          {expiration === 'custom' && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="mt-2"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Internal Note (optional)</Label>
          <Textarea
            id="note"
            placeholder="Any internal notes about this code..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating} className="flex-1">
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Generate Code'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
