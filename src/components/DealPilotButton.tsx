/**
 * DealPilotButton – Tier 1 cross-app deep-link from Market Compass to Deal Pilot.
 *
 * Reads the configured Deal Pilot URL from localStorage (set in AccountSettings),
 * and opens a pre-filled new-deal URL with property + market context encoded as
 * query params. If not yet configured it surfaces a compact setup prompt.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Zap, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DP_URL_KEY = 'deal_pilot_url';

export function getDealPilotUrl(): string | null {
  return localStorage.getItem(DP_URL_KEY);
}

export function setDealPilotUrl(url: string) {
  localStorage.setItem(DP_URL_KEY, url);
}

interface DealPilotButtonProps {
  clientName?: string;
  location?: string;
  sessionType?: 'buyer' | 'seller';
  opportunityScore?: number;
  leadType?: string;
  topSignal?: string;
  zip?: string;
  sessionId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

export function DealPilotButton({
  clientName,
  location,
  sessionType,
  opportunityScore,
  leadType,
  topSignal,
  zip,
  sessionId,
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Send to Deal Pilot',
}: DealPilotButtonProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState('');

  const dpUrl = getDealPilotUrl();

  const buildLink = (base: string) => {
    const params = new URLSearchParams();
    if (clientName) params.set('clientName', clientName);
    if (location) params.set('location', location);
    if (sessionType) params.set('type', sessionType);
    if (opportunityScore != null) params.set('score', String(opportunityScore));
    if (leadType) params.set('leadType', leadType);
    if (topSignal) params.set('topSignal', topSignal);
    if (zip) params.set('zip', zip);
    if (sessionId) params.set('mcSessionId', sessionId);
    params.set('source', 'market-compass');
    const url = base.replace(/\/$/, '');
    return `${url}/new-deal?${params.toString()}`;
  };

  const handleClick = () => {
    const base = getDealPilotUrl();
    if (!base) {
      setSetupOpen(true);
      return;
    }
    window.open(buildLink(base), '_blank', 'noopener,noreferrer');
    toast({
      title: 'Opening Deal Pilot',
      description: 'Client and market context pre-filled.',
    });
  };

  const handleSaveUrl = () => {
    if (!inputUrl.trim()) return;
    let url = inputUrl.trim();
    if (!url.startsWith('http')) url = `https://${url}`;
    setDealPilotUrl(url);
    setSetupOpen(false);
    window.open(buildLink(url), '_blank', 'noopener,noreferrer');
    toast({ title: 'Deal Pilot connected', description: 'Your Deal Pilot URL has been saved.' });
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleClick}>
        {dpUrl ? (
          <><ExternalLink className="h-4 w-4 mr-1.5" />{label}</>
        ) : (
          <><Zap className="h-4 w-4 mr-1.5" />{label}</>
        )}
      </Button>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Connect Deal Pilot
            </DialogTitle>
            <DialogDescription>
              Enter your Deal Pilot app URL to enable one-click deal creation with pre-filled
              client and market data from Market Compass.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="dpUrl">Deal Pilot URL</Label>
            <Input
              id="dpUrl"
              placeholder="https://your-deal-pilot.lovable.app"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveUrl()}
            />
            <p className="text-xs text-muted-foreground">
              This is saved locally on your device. Market context (client name, location, opportunity
              score, lead type) will be passed as URL parameters.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSetupOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUrl} disabled={!inputUrl.trim()}>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Connect & Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Compact settings card for AccountSettings page */
export function DealPilotConnectionCard() {
  const [url, setUrl] = useState(getDealPilotUrl() || '');
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    let normalized = url.trim();
    if (normalized && !normalized.startsWith('http')) normalized = `https://${normalized}`;
    setDealPilotUrl(normalized);
    setEditing(false);
    toast({ title: normalized ? 'Deal Pilot URL saved' : 'Deal Pilot disconnected' });
  };

  const saved = getDealPilotUrl();

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Deal Pilot Integration</p>
            <p className="text-xs text-muted-foreground">
              {saved ? `Connected — ${saved}` : 'Not connected'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEditing(e => !e)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      {editing && (
        <div className="space-y-2">
          <Input
            placeholder="https://your-deal-pilot.lovable.app"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
