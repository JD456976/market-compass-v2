import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DealPilotConnectionCard } from '@/components/DealPilotButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArrowLeft, Settings, User, Shield, Trash2, Download, ExternalLink, Loader2, LogOut, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBetaAccessSession, clearBetaAccessSession } from '@/lib/betaAccess';
import { useSessions } from '@/hooks/useSessions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OWNER_EMAILS } from '@/contexts/EntitlementContext';
import { format, differenceInDays } from 'date-fns';

function AccessStatusBadge({ userEmail }: { userEmail: string | null }) {
  const [expiry, setExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    // Owners always have full access — no expiry needed
    if (OWNER_EMAILS.some(e => e.toLowerCase() === userEmail.toLowerCase())) {
      setLoading(false); return;
    }
    supabase.from('profiles').select('beta_access_expires_at').eq('email', userEmail).maybeSingle()
      .then(({ data }) => { setExpiry(data?.beta_access_expires_at || null); setLoading(false); });
  }, [userEmail]);

  if (loading) return null;

  // Owner — full access
  if (userEmail && OWNER_EMAILS.some(e => e.toLowerCase() === userEmail.toLowerCase())) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-400">Full Access</p>
          <p className="text-xs text-muted-foreground">Owner account — all features unlocked</p>
        </div>
      </div>
    );
  }

  if (!expiry) return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
      <p className="text-sm text-primary font-medium">Active Access</p>
    </div>
  );

  const daysLeft = differenceInDays(new Date(expiry), new Date());
  const expired = daysLeft < 0;
  const urgent = daysLeft <= 7 && !expired;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${expired ? 'bg-destructive/10 border-destructive/20' : urgent ? 'bg-warning/10 border-warning/20' : 'bg-primary/10 border-primary/20'}`}>
      {expired ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> : <Clock className={`h-4 w-4 shrink-0 ${urgent ? 'text-warning' : 'text-primary'}`} />}
      <div>
        <p className={`text-sm font-medium ${expired ? 'text-destructive' : urgent ? 'text-warning' : 'text-primary'}`}>
          {expired ? 'Access Expired' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
        </p>
        <p className="text-xs text-muted-foreground">
          {expired ? `Expired ${format(new Date(expiry), 'MMM d, yyyy')}` : `Access until ${format(new Date(expiry), 'MMM d, yyyy')}`}
        </p>
      </div>
    </div>
  );
}

const AccountSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessions, deleteSession } = useSessions();
  const { user, signOut } = useAuth();
  const session = getBetaAccessSession();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        account: {
          email: session?.email || 'Unknown',
          exportedAt: new Date().toISOString(),
        },
        sessions: sessions.map(s => ({
          id: s.id,
          type: s.session_type,
          clientName: s.client_name,
          location: s.location,
          propertyType: s.property_type,
          condition: s.condition,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
          sellerInputs: s.seller_inputs,
          buyerInputs: s.buyer_inputs,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `market-compass-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Data exported',
        description: 'Your data has been downloaded as a JSON file.',
      });
    } catch {
      toast({
        title: 'Export failed',
        description: 'Could not export your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      if (user) {
        // Call server-side deletion that removes all data + auth user
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        
        const res = await supabase.functions.invoke('delete-account', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (res.error || res.data?.error) {
          throw new Error(res.data?.error || 'Deletion failed');
        }
      } else {
        // Fallback: delete local sessions for non-auth users
        for (const s of sessions) {
          await deleteSession(s.id);
        }
      }
      
      // Clear all local data
      clearBetaAccessSession();
      localStorage.clear();
      
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been permanently removed.',
      });
      
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast({
        title: 'Deletion failed',
        description: err?.message || 'Could not delete all data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    clearBetaAccessSession();
    navigate('/login', { replace: true });
  };

  const draftCount = sessions.filter(s => !s.share_link_created && !s.pdf_exported).length;
  const sharedCount = sessions.filter(s => s.share_link_created || s.pdf_exported).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl font-sans font-bold">Account Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || session?.email || ''} disabled className="h-11 bg-muted" />
            </div>
            {/* Access status */}
            <AccessStatusBadge userEmail={user?.email || session?.email || null} />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">Drafts</p>
                <p className="text-xl font-semibold">{draftCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">Shared Reports</p>
                <p className="text-xl font-semibold">{sharedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deal Pilot Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DealPilotConnectionCard />
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start min-h-[44px]"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download My Data
            </Button>
            <Link to="/privacy" className="block">
              <Button variant="outline" className="w-full justify-start min-h-[44px]">
                <ExternalLink className="mr-2 h-4 w-4" />
                Privacy Policy
              </Button>
            </Link>
            <Link to="/terms" className="block">
              <Button variant="outline" className="w-full justify-start min-h-[44px]">
                <ExternalLink className="mr-2 h-4 w-4" />
                Terms of Service
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Sign Out */}
        {user && (
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full justify-start min-h-[44px]"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        )}

        {/* App Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">App Version</span>
              <span className="font-mono text-foreground">1.0.0 (build 1)</span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              className="min-h-[44px]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete My Account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This will permanently delete:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>All drafts ({draftCount})</li>
                  <li>All shared reports ({sharedCount})</li>
                  <li>All templates and settings</li>
                  <li>Your profile information</li>
                </ul>
                <p className="font-medium">This action cannot be undone.</p>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="deleteConfirm">Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="h-11"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountSettings;
