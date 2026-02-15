import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, UserPlus, DatabaseZap, Sparkles, Loader2, Copy, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Reviewer {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export function AdminToolsPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWipeDialog, setShowWipeDialog] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeLog, setWipeLog] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // New reviewer form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'agent' | 'client'>('agent');
  const [isCreating, setIsCreating] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const callAdminTool = async (action: string, params: Record<string, unknown> = {}) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const res = await supabase.functions.invoke('admin-tools', {
      body: { action, ...params },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  const fetchReviewers = async () => {
    setIsLoading(true);
    try {
      const data = await callAdminTool('list_reviewers');
      setReviewers(data.reviewers || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReviewers(); }, []);

  const handleWipe = async () => {
    if (wipeConfirmText !== 'WIPE') return;
    setIsWiping(true);
    setWipeLog([]);
    try {
      const data = await callAdminTool('wipe_database');
      setWipeLog(data.log || []);
      toast({ title: 'Database wiped', description: 'All data except your admin account has been removed.' });
      fetchReviewers();
    } catch (err: any) {
      toast({ title: 'Wipe failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsWiping(false);
      setShowWipeDialog(false);
      setWipeConfirmText('');
    }
  };

  const handleCreateReviewer = async () => {
    if (!newEmail || !newPassword || !newName) return;
    setIsCreating(true);
    try {
      const agentId = newRole === 'client' ? user?.id : undefined;
      const data = await callAdminTool('create_reviewer', {
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
        agent_user_id: agentId,
      });
      toast({ title: 'Reviewer created', description: `${data.user.email} (${data.user.role})` });
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      fetchReviewers();
    } catch (err: any) {
      toast({ title: 'Create failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteReviewer = async (reviewerId: string) => {
    try {
      await callAdminTool('delete_reviewer', { reviewer_user_id: reviewerId });
      toast({ title: 'Reviewer deleted' });
      fetchReviewers();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleGenerateDemo = async (agentUserId: string) => {
    setIsGenerating(true);
    try {
      const data = await callAdminTool('generate_demo_data', { agent_user_id: agentUserId });
      toast({ title: 'Demo data generated', description: `Created ${data.sessions_created} sessions with analytics and messages.` });
    } catch (err: any) {
      toast({ title: 'Generate failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const agentReviewers = reviewers.filter(r => r.role === 'agent');

  return (
    <div className="space-y-6">
      {/* DB Wipe */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <DatabaseZap className="h-5 w-5" />
            Wipe Database
          </CardTitle>
          <CardDescription>
            Delete ALL users, sessions, reports, and data — except your admin account. Use before generating fresh demo data for Apple review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setShowWipeDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Wipe Everything
          </Button>
          {wipeLog.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted text-xs font-mono space-y-0.5 max-h-48 overflow-y-auto">
              {wipeLog.map((line, i) => (
                <p key={i} className={line.startsWith('Warning') ? 'text-amber-600' : line.startsWith('Error') ? 'text-destructive' : 'text-muted-foreground'}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewer Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Reviewer Accounts
          </CardTitle>
          <CardDescription>
            Create agent + client pairs for Apple review or testing. Email is auto-confirmed. Client accounts are linked to the creating agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Apple Reviewer" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@company.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="SecurePass123!" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'agent' | 'client')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="client">Client (linked to your account)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreateReviewer} disabled={isCreating || !newEmail || !newPassword || !newName} size="sm">
            {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Create Reviewer
          </Button>

          {/* Existing reviewers */}
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : reviewers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No reviewer accounts yet.</p>
          ) : (
            <div className="space-y-2 pt-2 border-t">
              {reviewers.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{r.full_name}</p>
                      <Badge variant="outline" className="text-[10px]">{r.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(r.email);
                        toast({ title: 'Copied email' });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteReviewer(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Demo Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Demo Data
          </CardTitle>
          <CardDescription>
            Populate an agent account with sample seller/buyer reports, view analytics, and conversations. Great for Apple reviewer experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Generate for admin (self) */}
          <Button
            onClick={() => user && handleGenerateDemo(user.id)}
            disabled={isGenerating}
            variant="outline"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate for My Account
          </Button>

          {/* Generate for reviewer agents */}
          {agentReviewers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Or for a reviewer agent:</p>
              {agentReviewers.map(r => (
                <Button
                  key={r.id}
                  onClick={() => handleGenerateDemo(r.id)}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                  className="mr-2"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {r.full_name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wipe Confirmation */}
      <AlertDialog open={showWipeDialog} onOpenChange={setShowWipeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Wipe Entire Database</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This will permanently delete:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>All user accounts (except yours)</li>
                  <li>All sessions, reports, and messages</li>
                  <li>All client relationships and invitations</li>
                  <li>All analytics and view tracking data</li>
                  <li>All reviewer accounts</li>
                </ul>
                <p className="font-medium text-destructive">This action cannot be undone.</p>
                <div className="space-y-2 pt-2">
                  <Label>Type <span className="font-mono font-bold">WIPE</span> to confirm</Label>
                  <Input
                    value={wipeConfirmText}
                    onChange={e => setWipeConfirmText(e.target.value)}
                    placeholder="WIPE"
                    className="h-11"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWipeConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipe}
              disabled={wipeConfirmText !== 'WIPE' || isWiping}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isWiping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DatabaseZap className="h-4 w-4 mr-2" />}
              Wipe Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
