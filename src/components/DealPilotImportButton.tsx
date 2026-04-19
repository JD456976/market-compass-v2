import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Search, Loader2, User, Link2, ExternalLink } from 'lucide-react';

const DP_ENDPOINT = 'https://deal-pilot-app.netlify.app/api/federated-search';
// Token is set via Netlify env on both apps — same value, shared secret
const FEDERATION_TOKEN = import.meta.env.VITE_DP_FEDERATION_TOKEN || '';

interface DealPilotClient {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source?: string;
  temperature?: string;
}

interface Props {
  onSelect: (firstName: string, lastName: string, email: string) => void;
}

export function DealPilotImportButton({ onSelect }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DealPilotClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [note, setNote] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }

    const email = user?.email;
    if (!email) {
      toast({ title: 'Sign in required', description: 'Sign in to Market Compass to import from Deal Pilot.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setSearched(true);
    setNote('');

    try {
      const res = await fetch(DP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Federation-Token': FEDERATION_TOKEN,
        },
        body: JSON.stringify({ query: q.trim(), userEmail: email }),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error('Connection token mismatch — contact support.');
        throw new Error(`Deal Pilot search error ${res.status}`);
      }

      const data = await res.json();
      setResults(data?.clients || []);
      if (data?.note) setNote(data.note);
    } catch (e: any) {
      setResults([]);
      toast({ title: 'Import unavailable', description: e.message || 'Could not reach Deal Pilot.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleSelect = (client: DealPilotClient) => {
    onSelect(client.first_name || '', client.last_name || '', client.email || '');
    setQuery('');
    setResults([]);
    setSearched(false);
    toast({ title: `${client.first_name} ${client.last_name} imported` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-primary" />
          Import from Deal Pilot
        </CardTitle>
        <CardDescription>
          Search your Deal Pilot leads by name or email to pre-fill an invitation.
          Use the same email you log in with on both apps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {results.map((client, i) => (
              <button
                key={`${client.email}-${i}`}
                onClick={() => handleSelect(client)}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-secondary transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {[client.first_name, client.last_name].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {client.temperature && (
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {client.temperature}
                    </span>
                  )}
                  {client.source && (
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {client.source}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && query.trim().length >= 2 && (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {note || 'No clients found'}
            </p>
            {note?.includes('Deal Pilot account') && (
              <p className="text-xs text-muted-foreground">
                Make sure you're signed in to both apps with the same email ({user?.email}).
              </p>
            )}
          </div>
        )}

        {!searched && !loading && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Type at least 2 characters to search
          </p>
        )}
      </CardContent>
    </Card>
  );
}
