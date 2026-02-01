import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Copy, Trash2, Building2, Users } from 'lucide-react';
import { Session } from '@/types';
import { getSessions, saveSession, deleteSession, generateId } from '@/lib/storage';

const SavedSessions = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const allSessions = getSessions().sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    setSessions(allSessions);
  };

  const handleOpen = (session: Session) => {
    sessionStorage.setItem('current_session', JSON.stringify(session));
    if (session.session_type === 'Seller') {
      navigate('/seller/report');
    } else {
      navigate('/buyer/report');
    }
  };

  const handleDuplicate = (session: Session) => {
    const duplicated: Session = {
      ...session,
      id: generateId(),
      client_name: `${session.client_name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveSession(duplicated);
    loadSessions();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this session?')) {
      deleteSession(id);
      loadSessions();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Saved Sessions</h1>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="mb-4">No saved sessions yet.</p>
              <p>Create a Seller or Buyer report and save it to see it here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {session.session_type === 'Seller' ? (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Users className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {session.client_name}
                          <Badge variant={session.session_type === 'Seller' ? 'default' : 'secondary'}>
                            {session.session_type}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {session.location} • {session.property_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(session)} title="Open">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(session)} title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(session.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Updated: {formatDate(session.updated_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedSessions;
