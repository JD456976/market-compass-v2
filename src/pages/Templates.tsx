import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Building2, Users, Trash2, Play, Calendar } from 'lucide-react';
import { SessionTemplate, loadTemplates, deleteTemplate } from '@/lib/templates';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    refreshTemplates();
  }, []);

  const refreshTemplates = () => {
    const allTemplates = loadTemplates().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setTemplates(allTemplates);
  };

  const handleUseTemplate = (template: SessionTemplate) => {
    // Store template in sessionStorage for the flow to pick up
    sessionStorage.setItem('prefill_template', JSON.stringify(template));
    
    if (template.session_type === 'Seller') {
      navigate('/seller');
    } else {
      navigate('/buyer');
    }
    
    toast({
      title: "Template loaded",
      description: `Starting new ${template.session_type} session from "${template.name}"`,
    });
  };

  const handleDeleteClick = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete);
      refreshTemplates();
      toast({
        title: "Template deleted",
        description: "The template has been removed.",
      });
    }
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold">Templates</h1>
                <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''} saved</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {templates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">No templates yet</h3>
                  <p className="text-muted-foreground mb-6">Save a session as a template to reuse its settings for future clients.</p>
                  <div className="flex gap-4 justify-center">
                    <Link to="/seller">
                      <Button variant="outline">
                        <Building2 className="mr-2 h-4 w-4" />
                        New Seller Report
                      </Button>
                    </Link>
                    <Link to="/buyer">
                      <Button variant="outline">
                        <Users className="mr-2 h-4 w-4" />
                        New Buyer Report
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${template.session_type === 'Seller' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                            {template.session_type === 'Seller' ? (
                              <Building2 className="h-6 w-6 text-primary" />
                            ) : (
                              <Users className="h-6 w-6 text-accent" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-serif text-lg font-semibold">{template.name}</h3>
                              <Badge variant={template.session_type === 'Seller' ? 'default' : 'accent'}>
                                {template.session_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{template.property_type}</span>
                              <span>•</span>
                              <span>{template.condition}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(template.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="accent" size="sm" onClick={() => handleUseTemplate(template)}>
                            <Play className="mr-2 h-4 w-4" />
                            Use Template
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(template.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Templates;
