import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, X, KeyRound } from 'lucide-react';
import { generateAccessCode, hashCode } from '@/lib/betaAccess';

interface IssueCodePanelProps {
  adminEmail: string;
  onClose: () => void;
  onCreated: () => void;
}

export function IssueCodePanel({ adminEmail, onClose, onCreated }: IssueCodePanelProps) {
  const [email, setEmail] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [expiration, setExpiration] = useState<string>('none');
  const [isCreating, setIsCreating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const calculateExpiresAt = (option: string): string | null => {
    if (option === 'none') return null;
    
    const now = new Date();
    switch (option) {
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !issuedTo.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Email and Issued To are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Generate code and hash
      const rawCode = generateAccessCode();
      const codeHash = await hashCode(rawCode);
      const expiresAt = calculateExpiresAt(expiration);

      const { error } = await supabase
        .from('beta_codes')
        .insert({
          email: email.trim().toLowerCase(),
          code_hash: codeHash,
          issued_to: issuedTo.trim(),
          expires_at: expiresAt,
          created_by_admin_email: adminEmail,
        });

      if (error) {
        console.error('Insert error:', error);
        toast({
          title: 'Failed to create code',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setGeneratedCode(rawCode);
      onCreated();
      
      toast({
        title: 'Code created',
        description: 'Share this code with the user. It will only be shown once.',
      });
    } catch (err) {
      console.error('Create code error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Please copy the code manually.',
        variant: 'destructive',
      });
    }
  };

  const handleDone = () => {
    setGeneratedCode(null);
    setEmail('');
    setIssuedTo('');
    setExpiration('none');
    onClose();
  };

  // Show generated code
  if (generatedCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-emerald-600" />
            Code Generated
          </CardTitle>
          <CardDescription>
            Share this code with <strong>{issuedTo}</strong> ({email})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-2xl font-mono font-bold tracking-widest select-all">
              {generatedCode}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
            <Button onClick={handleDone} className="flex-1">
              Done
            </Button>
          </div>
          
          <p className="text-xs text-destructive text-center font-medium">
            ⚠️ This code will NOT be shown again. Make sure to copy it now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Issue Access Code</CardTitle>
            <CardDescription>Generate a new beta access code</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issued-to">Issued To *</Label>
              <Input
                id="issued-to"
                type="text"
                placeholder="Name / Company"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expiration">Expiration</Label>
            <Select value={expiration} onValueChange={setExpiration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No expiration</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating} className="flex-1">
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Code'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
