import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Ban
} from 'lucide-react';
import { CreateCodePanel } from './CreateCodePanel';
import { CodesTable } from './CodesTable';
import { DevicesTable } from './DevicesTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminDashboardProps {
  userEmail: string | null;
  onSignOut: () => void;
}

export interface BetaCode {
  id: string;
  code: string;
  status: 'active' | 'used' | 'revoked' | 'expired';
  expires_at: string | null;
  created_at: string;
  created_by: string;
  used_at: string | null;
  used_by_device_id: string | null;
  issued_to: string | null;
  note: string | null;
}

export interface BetaDevice {
  id: string;
  device_id: string;
  activated_at: string;
  activated_via_code_id: string | null;
  is_revoked: boolean;
  revoked_at: string | null;
  label: string | null;
  code?: BetaCode;
}

export function AdminDashboard({ userEmail, onSignOut }: AdminDashboardProps) {
  const [codes, setCodes] = useState<BetaCode[]>([]);
  const [devices, setDevices] = useState<BetaDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch codes
      const { data: codesData, error: codesError } = await supabase
        .from('beta_access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;

      // Auto-expire past-due codes
      const now = new Date();
      const updatedCodes = (codesData || []).map(code => {
        if (code.status === 'active' && code.expires_at && new Date(code.expires_at) < now) {
          // Update in background
          supabase
            .from('beta_access_codes')
            .update({ status: 'expired' })
            .eq('id', code.id)
            .then();
          return { ...code, status: 'expired' as const };
        }
        return code;
      }) as BetaCode[];

      setCodes(updatedCodes);

      // Fetch devices with their associated codes
      const { data: devicesData, error: devicesError } = await supabase
        .from('beta_authorized_devices')
        .select('*, beta_access_codes(*)')
        .order('activated_at', { ascending: false });

      if (devicesError) throw devicesError;

      const processedDevices = (devicesData || []).map(device => ({
        ...device,
        code: device.beta_access_codes as BetaCode | undefined,
      })) as BetaDevice[];

      setDevices(processedDevices);
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

  const stats = {
    active: codes.filter(c => c.status === 'active').length,
    used: codes.filter(c => c.status === 'used').length,
    revoked: codes.filter(c => c.status === 'revoked').length,
    expired: codes.filter(c => c.status === 'expired').length,
    devices: devices.filter(d => !d.is_revoked).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
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
                  <p className="text-2xl font-semibold">{stats.devices}</p>
                  <p className="text-xs text-muted-foreground">Active Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Code Panel */}
        {showCreatePanel ? (
          <CreateCodePanel 
            userEmail={userEmail || ''} 
            onClose={() => setShowCreatePanel(false)}
            onCreated={fetchData}
          />
        ) : (
          <Button onClick={() => setShowCreatePanel(true)} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Generate Access Code
          </Button>
        )}

        {/* Tables */}
        <Tabs defaultValue="codes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="codes">
              <KeyRound className="h-4 w-4 mr-2" />
              Access Codes ({codes.length})
            </TabsTrigger>
            <TabsTrigger value="devices">
              <Smartphone className="h-4 w-4 mr-2" />
              Devices ({devices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="codes">
            <CodesTable codes={codes} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="devices">
            <DevicesTable devices={devices} onRefresh={fetchData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
