import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  LogOut, 
  KeyRound, 
  Smartphone, 
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Monitor
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { IssueCodePanel } from './IssueCodePanel';
import { BetaCodesTable, BetaCode } from './BetaCodesTable';
import { ActivationsTable, BetaActivation } from './ActivationsTable';
import { OwnerDevicesTable, OwnerDevice } from './OwnerDevicesTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDeviceId, setOwnerDevice, clearBetaAccessSession, clearOwnerDevice, isOwnerDevice as checkIsOwnerDevice } from '@/lib/betaAccess';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MobileNavSpacer } from '@/components/GlobalNav';
import { AdminUsersPanel } from './AdminUsersPanel';
import { AdminReportsPanel } from './AdminReportsPanel';
import { AdminAnalyticsPanel } from './AdminAnalyticsPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AdminDashboardProps {
  userEmail: string | null;
  onSignOut: () => void;
}

export function AdminDashboard({ userEmail, onSignOut }: AdminDashboardProps) {
  const [codes, setCodes] = useState<BetaCode[]>([]);
  const [activations, setActivations] = useState<BetaActivation[]>([]);
  const [ownerDevices, setOwnerDevices] = useState<OwnerDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [isMarkingOwner, setIsMarkingOwner] = useState(false);
  const [isCurrentDeviceOwner, setIsCurrentDeviceOwner] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [clearOwnerOnLogout, setClearOwnerOnLogout] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch codes from new table
      const { data: codesData, error: codesError } = await supabase
        .from('beta_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setCodes(codesData || []);

      // Fetch activations
      const { data: activationsData, error: activationsError } = await supabase
        .from('beta_activations')
        .select('*')
        .order('activated_at', { ascending: false });

      if (activationsError) throw activationsError;
      setActivations(activationsData || []);

      // Fetch owner devices via RPC (bypasses RLS)
      const currentDeviceId = getDeviceId();
      const { data: ownerCheckData } = await supabase.rpc('check_owner_device', {
        p_device_id: currentDeviceId,
      });
      
      // Use RPC to list owner devices (bypasses RLS)
      let ownerDevicesList: OwnerDevice[] = [];
      const { data: ownerDevicesData, error: ownerDevicesError } = await supabase
        .rpc('list_owner_devices');

      if (!ownerDevicesError && ownerDevicesData) {
        ownerDevicesList = (ownerDevicesData as unknown as OwnerDevice[]);
      }
      setOwnerDevices(ownerDevicesList);

      // Check if current device is an owner device using RPC result
      const ownerCheck = ownerCheckData as { is_owner: boolean } | null;
      const isOwner = ownerCheck?.is_owner || ownerDevicesList.some(
        (d: OwnerDevice) => d.device_id === currentDeviceId && !d.revoked_at
      );
      setIsCurrentDeviceOwner(isOwner);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load admin data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refetch every 15 seconds for real-time feel
  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats from new data model
  const getCodeStatus = (code: BetaCode): string => {
    if (code.revoked_at) return 'revoked';
    if (code.used_at) return 'used';
    if (code.expires_at && new Date(code.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  const stats = {
    active: codes.filter(c => getCodeStatus(c) === 'active').length,
    used: codes.filter(c => getCodeStatus(c) === 'used').length,
    revoked: codes.filter(c => getCodeStatus(c) === 'revoked').length,
    expired: codes.filter(c => getCodeStatus(c) === 'expired').length,
    activations: activations.length,
    ownerDevices: ownerDevices.filter(d => !d.revoked_at).length,
  };

  const handleMarkOwnerDevice = async () => {
    if (!userEmail) return;
    
    setIsMarkingOwner(true);
    const deviceId = getDeviceId();
    
    try {
      const { data, error } = await supabase.rpc('register_owner_device', {
        p_device_id: deviceId,
        p_admin_email: userEmail,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        // Set local storage flags
        setOwnerDevice(deviceId);
        setIsCurrentDeviceOwner(true);
        
        toast({
          title: 'Owner Device Registered',
          description: 'This device now has automatic admin access.',
        });
        
        fetchData();
      } else {
        throw new Error(result.error || 'Failed to register device');
      }
    } catch (error) {
      console.error('Register owner device error:', error);
      toast({
        title: 'Error',
        description: 'Failed to register owner device.',
        variant: 'destructive',
      });
    } finally {
      setIsMarkingOwner(false);
    }
  };

  const handleLogout = () => {
    if (clearOwnerOnLogout) {
      clearOwnerDevice();
    }
    clearBetaAccessSession();
    setShowLogoutDialog(false);
    onSignOut();
  };

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-card w-full">
        <div className="px-4 py-4 w-full max-w-full">
          {/* Mobile Layout: Stacked */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-lg font-serif font-semibold">Admin</h1>
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-full">{userEmail}</p>
            <div className="flex items-center gap-2 w-full">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="flex-1">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="ml-1">Refresh</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowLogoutDialog(true)} className="flex-1">
                <LogOut className="h-4 w-4" />
                <span className="ml-1">Log Out</span>
              </Button>
            </div>
          </div>

          {/* Desktop Layout: Horizontal */}
          <div className="hidden md:flex items-center justify-between container mx-auto">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to App
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-serif font-semibold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowLogoutDialog(true)}>
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <KeyRound className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.used}</p>
                  <p className="text-xs text-muted-foreground">Used Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Ban className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.revoked}</p>
                  <p className="text-xs text-muted-foreground">Revoked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.expired}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.activations}</p>
                  <p className="text-xs text-muted-foreground">Activations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {showIssuePanel ? (
            <IssueCodePanel 
              adminEmail={userEmail || ''} 
              onClose={() => setShowIssuePanel(false)}
              onCreated={fetchData}
            />
          ) : (
            <Button onClick={() => setShowIssuePanel(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Issue Access Code
            </Button>
          )}

          {!isCurrentDeviceOwner && (
            <Button 
              variant="outline" 
              onClick={handleMarkOwnerDevice}
              disabled={isMarkingOwner}
            >
              <Monitor className="h-4 w-4 mr-2" />
              {isMarkingOwner ? 'Registering...' : 'Mark This Device as Owner'}
            </Button>
          )}

          {isCurrentDeviceOwner && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-md text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              This is an Owner Device
            </div>
          )}
        </div>

        {/* Tables */}
        <Tabs defaultValue="codes" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full h-auto gap-1">
              <TabsTrigger value="codes" className="text-xs px-3 py-2 whitespace-nowrap">
                <KeyRound className="h-3.5 w-3.5 mr-1" />
                Codes ({codes.length})
              </TabsTrigger>
              <TabsTrigger value="activations" className="text-xs px-3 py-2 whitespace-nowrap">
                <Smartphone className="h-3.5 w-3.5 mr-1" />
                Active ({activations.length})
              </TabsTrigger>
              <TabsTrigger value="owner-devices" className="text-xs px-3 py-2 whitespace-nowrap">
                <Monitor className="h-3.5 w-3.5 mr-1" />
                Devices ({stats.ownerDevices})
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs px-3 py-2 whitespace-nowrap">
                Users
              </TabsTrigger>
              <TabsTrigger value="reports" className="text-xs px-3 py-2 whitespace-nowrap">
                Reports
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs px-3 py-2 whitespace-nowrap">
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="codes">
            <BetaCodesTable codes={codes} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="activations">
            <ActivationsTable activations={activations} />
          </TabsContent>

          <TabsContent value="owner-devices">
            <OwnerDevicesTable devices={ownerDevices} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersPanel />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReportsPanel />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalyticsPanel />
          </TabsContent>
        </Tabs>
        
        {/* Mobile nav spacer */}
        <MobileNavSpacer />
      </main>

      {/* Logout Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Out</DialogTitle>
            <DialogDescription>
              You will be signed out of the admin dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {isCurrentDeviceOwner && (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="clear-owner"
                  checked={clearOwnerOnLogout}
                  onCheckedChange={(checked) => setClearOwnerOnLogout(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="clear-owner" className="text-sm font-normal">
                    Also remove owner device on this device
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    If unchecked, you'll auto-authenticate next time.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
