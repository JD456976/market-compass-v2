import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Search, Loader2, User } from 'lucide-react';

interface DealPilotClient {
  first_name: string;
  last_name: string;
  email: string;
  source?: string;
}

interface Props {
  onSelect: (firstName: string, lastName: string, email: string) => void;
}

export function DealPilotImportButton({ onSelect }: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DealPilotClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('federation-search', {
        body: { query: q.trim() },
      });

      if (error) {
        if (error.message?.includes('404') || (data as any)?.error?.includes('not found')) {
          toast({
            title: "Your Deal Pilot account wasn't found",
            description: "Make sure you're using the same email in both apps.",
            variant: 'destructive',
          });
        }
        setResults([]);
        return;
      }

      setResults(data?.clients || data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
    toast({ title: `${client.first_name} ${client.last_name} imported from Deal Pilot` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Import from Deal Pilot
        </CardTitle>
        <CardDescription>
          Search your Deal Pilot clients to quickly pre-fill an invitation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
                  {client.source && (
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                      {client.source}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {!loading && searched && results.length === 0 && query.trim().length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-4">No clients found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
