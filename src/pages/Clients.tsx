import { ClientManagement } from '@/components/ClientManagement';
import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

const ClientsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-serif font-bold mt-2">Client Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Invite clients to collaborate on property analysis.
        </p>
      </div>
      <ClientManagement />
    </div>
  );
};

export default ClientsPage;
