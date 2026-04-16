import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, Search, Eye, Link2, Archive } from 'lucide-react';
import { format } from 'date-fns';

interface SessionReport {
  id: string;
  client_name: string;
  session_type: string;
  location: string;
  property_type: string;
  created_at: string;
  updated_at: string;
  share_link_created: boolean | null;
  pdf_exported: boolean | null;
  archived: boolean;
  owner_device_id: string | null;
}

export function AdminReportsPanel() {
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('id, client_name, session_type, location, property_type, created_at, updated_at, share_link_created, pdf_exported, archived, owner_device_id')
        .order('updated_at', { ascending: false })
        .limit(200);

      if (!error) setReports(data || []);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = !searchTerm ||
        r.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || r.session_type === typeFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'shared' && r.share_link_created) ||
        (statusFilter === 'draft' && !r.share_link_created) ||
        (statusFilter === 'archived' && r.archived);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, searchTerm, typeFilter, statusFilter]);

  const stats = {
    total: reports.length,
    shared: reports.filter(r => r.share_link_created).length,
    drafts: reports.filter(r => !r.share_link_created && !r.archived).length,
    archived: reports.filter(r => r.archived).length,
  };

  if (loading) {
    return (
      <Card><CardContent className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports ({stats.total})
          </CardTitle>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{stats.drafts} drafts</span>
            <span>·</span>
            <span>{stats.shared} shared</span>
            <span>·</span>
            <span>{stats.archived} archived</span>
          </div>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-9 h-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[110px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Seller">Seller</SelectItem>
              <SelectItem value="Buyer">Buyer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No reports found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell>
                      <Badge variant={r.session_type === 'Seller' ? 'default' : 'secondary'} className="text-xs">
                        {r.session_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.location}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.share_link_created && (
                          <Badge variant="outline" className="text-xs gap-1"><Link2 className="h-3 w-3" />Shared</Badge>
                        )}
                        {r.archived && (
                          <Badge variant="outline" className="text-xs gap-1"><Archive className="h-3 w-3" />Archived</Badge>
                        )}
                        {!r.share_link_created && !r.archived && (
                          <Badge variant="outline" className="text-xs">Draft</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
