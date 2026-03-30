import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, GitCompare, Building2, Users, MapPin, Clock, DollarSign, Target, TrendingUp, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { BuyerInputs } from '@/types';

interface ComparisonReport {
  id: string;
  client_name: string;
  session_type: string;
  location: string;
  share_token: string;
  buyer_inputs: BuyerInputs | null;
  created_at: string;
}

export default function ClientPropertyComparison() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ComparisonReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const viewerId = localStorage.getItem('mc_viewer_id') || '';

  useEffect(() => {
    const fetchReports = async () => {
      if (!viewerId) { setLoading(false); return; }

      const { data: views } = await supabase
        .from('shared_report_views')
        .select('report_id, share_token')
        .eq('viewer_id', viewerId)
        .order('viewed_at', { ascending: false });

      if (!views || views.length === 0) { setLoading(false); return; }

      const uniqueIds = [...new Set(views.map(v => v.report_id))];
      const tokenMap = new Map(views.map(v => [v.report_id, v.share_token]));

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, client_name, session_type, location, share_token, buyer_inputs, created_at')
        .in('id', uniqueIds)
        .eq('share_link_created', true)
        .eq('share_token_revoked', false);

      if (sessions) {
        setReports(sessions.map(s => ({
          ...s,
          share_token: s.share_token || tokenMap.get(s.id) || '',
          buyer_inputs: s.buyer_inputs as unknown as BuyerInputs | null,
        })));
      }
      setLoading(false);
    };
    fetchReports();
  }, [viewerId]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const selectedReports = useMemo(() =>
    selected.map(id => reports.find(r => r.id === id)).filter(Boolean) as ComparisonReport[],
    [selected, reports]
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-sans font-bold flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-accent" />
              Compare Properties
            </h1>
            <p className="text-sm text-muted-foreground">Select 2-3 reports to compare side by side</p>
          </div>
        </div>

        {loading ? (
          <SkeletonList count={3} showBadge />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={GitCompare}
            title="No reports to compare"
            description="You need at least 2 shared reports to use the comparison tool."
          />
        ) : (
          <>
            {/* Selection */}
            <div className="space-y-2 mb-6">
              <p className="text-xs text-muted-foreground">
                {selected.length}/3 selected
              </p>
              {reports.map(report => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all ${
                    selected.includes(report.id) ? 'border-accent ring-1 ring-accent/30' : 'hover:border-border/80'
                  }`}
                  onClick={() => toggleSelect(report.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Checkbox
                      checked={selected.includes(report.id)}
                      onCheckedChange={() => toggleSelect(report.id)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-medium text-sm truncate">{report.client_name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {report.session_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {report.location}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comparison Table */}
            {selectedReports.length >= 2 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Side-by-Side Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 text-muted-foreground font-normal text-xs w-28" />
                          {selectedReports.map(r => (
                            <th key={r.id} className="text-left py-2 px-3 font-sans font-semibold">
                              <div className="flex items-center gap-1.5">
                                {r.session_type === 'Seller' 
                                  ? <Building2 className="h-3.5 w-3.5 text-primary" />
                                  : <Users className="h-3.5 w-3.5 text-accent" />}
                                <span className="truncate max-w-[120px]">{r.client_name}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <CompareRow label="Location" icon={MapPin}>
                          {selectedReports.map(r => <td key={r.id} className="py-2.5 px-3 text-xs">{r.location}</td>)}
                        </CompareRow>
                        <CompareRow label="Type" icon={Target}>
                          {selectedReports.map(r => (
                            <td key={r.id} className="py-2.5 px-3">
                              <Badge variant="outline" className="text-[10px]">{r.session_type}</Badge>
                            </td>
                          ))}
                        </CompareRow>
                        {selectedReports.some(r => r.buyer_inputs) && (
                          <>
                            <CompareRow label="Offer Price" icon={DollarSign}>
                              {selectedReports.map(r => (
                                <td key={r.id} className="py-2.5 px-3 text-xs font-medium">
                                  {r.buyer_inputs ? formatCurrency(r.buyer_inputs.offer_price) : '—'}
                                </td>
                              ))}
                            </CompareRow>
                            <CompareRow label="Financing" icon={TrendingUp}>
                              {selectedReports.map(r => (
                                <td key={r.id} className="py-2.5 px-3 text-xs">
                                  {r.buyer_inputs?.financing_type || '—'}
                                </td>
                              ))}
                            </CompareRow>
                            <CompareRow label="Down Payment" icon={DollarSign}>
                              {selectedReports.map(r => (
                                <td key={r.id} className="py-2.5 px-3 text-xs">
                                  {r.buyer_inputs?.down_payment_percent || '—'}
                                </td>
                              ))}
                            </CompareRow>
                            <CompareRow label="Contingencies" icon={Target}>
                              {selectedReports.map(r => (
                                <td key={r.id} className="py-2.5 px-3 text-xs">
                                  {r.buyer_inputs?.contingencies?.join(', ') || '—'}
                                </td>
                              ))}
                            </CompareRow>
                            <CompareRow label="Closing" icon={Clock}>
                              {selectedReports.map(r => (
                                <td key={r.id} className="py-2.5 px-3 text-xs">
                                  {r.buyer_inputs?.closing_timeline || '—'}
                                </td>
                              ))}
                            </CompareRow>
                          </>
                        )}
                        <tr>
                          <td className="py-2.5 pr-4" />
                          {selectedReports.map(r => (
                            <td key={r.id} className="py-2.5 px-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => navigate(`/share/${r.id}`)}
                              >
                                View <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CompareRow({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <tr>
      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
        <span className="flex items-center gap-1.5">
          <Icon className="h-3 w-3" />
          {label}
        </span>
      </td>
      {children}
    </tr>
  );
}
