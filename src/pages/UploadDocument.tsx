import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromPDF } from '@/lib/pdfExtract';
import { parseMLSPINText } from '@/lib/mlspinParser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { Upload, FileText, ShieldCheck, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

type UploadStep = 'select' | 'compliance' | 'extracting' | 'done';

const UploadDocument = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      toast({ title: 'Only PDF files are supported', variant: 'destructive' });
      return;
    }

    if (selected.size > 20 * 1024 * 1024) {
      toast({ title: 'File must be under 20MB', variant: 'destructive' });
      return;
    }

    setFile(selected);
    setStep('compliance');
  }, [toast]);

  const handleProcess = async () => {
    if (!file || !user || !complianceConfirmed) return;

    setIsProcessing(true);
    setStep('extracting');
    setProgress(10);

    try {
      // 1. Extract text from PDF
      setProgress(20);
      const rawText = await extractTextFromPDF(file);
      setProgress(50);

      // 2. Parse with MLSPIN parser
      const extraction = parseMLSPINText(rawText);
      setProgress(70);

      // 3. Upload PDF to storage
      const storagePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;
      setProgress(85);

      // 4. Build extracted fields, confidence, and evidence maps
      const extractedFields: Record<string, string> = {};
      const fieldConfidence: Record<string, string> = {};
      const fieldEvidence: Record<string, string> = {};

      const fieldKeys = Object.keys(extraction).filter(k => k !== 'factors') as (keyof typeof extraction)[];
      for (const key of fieldKeys) {
        const val = extraction[key];
        if (val && typeof val === 'object' && 'value' in val) {
          extractedFields[key] = val.value;
          fieldConfidence[key] = val.confidence;
          fieldEvidence[key] = val.evidence;
        }
      }

      // 5. Save to database
      const { data: doc, error: dbError } = await supabase
        .from('property_documents')
        .insert({
          agent_user_id: user.id,
          filename: file.name,
          file_size_bytes: file.size,
          storage_path: storagePath,
          raw_text: rawText,
          extracted_fields: extractedFields,
          field_confidence: fieldConfidence,
          field_evidence: fieldEvidence,
          mls_compliance_confirmed: true,
          status: 'extracted',
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setProgress(100);
      setStep('done');

      // Navigate to review page
      setTimeout(() => {
        navigate(`/documents/${doc.id}/review`);
      }, 500);

    } catch (err: any) {
      console.error('Document processing error:', err);
      toast({ title: 'Processing failed', description: err.message, variant: 'destructive' });
      setStep('compliance');
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-sans font-bold mb-1">Upload Listing Document</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Upload an MLSPIN listing sheet to extract property data automatically.
      </p>

      {/* Step 1: File Select */}
      {step === 'select' && (
        <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="py-16 text-center">
            <label htmlFor="pdf-upload" className="cursor-pointer space-y-4 block">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">Drop a PDF here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">
                  MLSPIN listing sheets, feature sheets, or disclosures (max 20MB)
                </p>
              </div>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Step 2: MLS Compliance */}
      {step === 'compliance' && file && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {file.name}
            </CardTitle>
            <CardDescription>
              {(file.size / 1024).toFixed(0)} KB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">MLS Compliance Notice</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    By uploading this document, you confirm that you have the right to use this 
                    data for your client analysis. MLS data is proprietary and subject to your 
                    board's rules and regulations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="mls-compliance"
                checked={complianceConfirmed}
                onCheckedChange={(c) => setComplianceConfirmed(c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="mls-compliance" className="text-sm leading-snug font-normal">
                I confirm I have authorization to use this document and that its use complies 
                with my MLS board's data sharing policies.
              </Label>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => { setFile(null); setStep('select'); setComplianceConfirmed(false); }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleProcess} 
                disabled={!complianceConfirmed}
                className="flex-1"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Extract Property Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Extracting */}
      {step === 'extracting' && (
        <Card>
          <CardContent className="py-12 text-center space-y-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-medium">Extracting property data...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Parsing document fields and identifying property factors
              </p>
            </div>
            <Progress value={progress} className="max-w-xs mx-auto" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadDocument;
