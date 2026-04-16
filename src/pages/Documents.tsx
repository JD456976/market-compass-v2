import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Upload, Loader2, CheckCircle2, Clock, Eye } from 'lucide-react';

interface DocRow {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  extracted_fields: Record<string, string> | null;
}

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadDocs();
  }, [user]);

  const loadDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('property_documents')
      .select('id, filename, status, created_at, extracted_fields')
      .order('created_at', { ascending: false });

    setDocuments((data || []) as DocRow[]);
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Uploaded</Badge>;
      case 'extracted':
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><Eye className="h-3 w-3 mr-1" />Needs Review</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><Eye className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-300"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-sans font-bold">Property Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload and manage listing PDFs for property intelligence.
          </p>
        </div>
        <Link to="/documents/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">No documents yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your first MLSPIN listing sheet to get started.
              </p>
            </div>
            <Link to="/documents/upload">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First PDF
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const fieldCount = doc.extracted_fields ? Object.keys(doc.extracted_fields).filter(k => doc.extracted_fields![k]).length : 0;
            return (
              <Link key={doc.id} to={`/documents/${doc.id}/review`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString()} · {fieldCount} fields extracted
                          </p>
                        </div>
                      </div>
                      {statusBadge(doc.status)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Documents;
