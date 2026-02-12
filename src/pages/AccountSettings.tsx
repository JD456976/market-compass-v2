import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Settings, User, Shield, Trash2, Download, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBetaAccessSession, clearBetaAccessSession } from '@/lib/betaAccess';
import { useSessions } from '@/hooks/useSessions';

const AccountSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessions, deleteSession } = useSessions();
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
      // Delete all sessions
      for (const s of sessions) {
        await deleteSession(s.id);
      }
      
      // Clear local data
      clearBetaAccessSession();
      localStorage.clear();
      
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been permanently removed.',
      });
      
      navigate('/', { replace: true });
    } catch {
      toast({
        title: 'Deletion failed',
        description: 'Could not delete all data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
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
              <h1 className="text-xl sm:text-2xl font-serif font-bold">Account Settings</h1>
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
              <Input value={session?.email || ''} disabled className="h-11 bg-muted" />
            </div>
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
