import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getExtractionConfidence, type ExtractedField, type PropertyFactor } from '@/lib/mlspinParser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeft, CheckCircle2, AlertCircle, HelpCircle, Loader2,
  ChevronDown, FileText, Shield, TrendingUp, TrendingDown, Minus,
  Save, Eye
} from 'lucide-react';

// Field display config
const FIELD_LABELS: Record<string, string> = {
  mlsNumber: 'MLS Number',
  listPrice: 'List Price',
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP Code',
  propertyType: 'Property Type',
  bedrooms: 'Bedrooms',
  bathsFull: 'Full Baths',
  bathsHalf: 'Half Baths',
  squareFeet: 'Square Feet',
  lotSize: 'Lot Size',
  yearBuilt: 'Year Built',
  daysOnMarket: 'Days on Market',
  listDate: 'List Date',
  taxAmount: 'Annual Tax',
  hoaFee: 'HOA/Condo Fee',
  heating: 'Heating',
  cooling: 'Cooling',
  parking: 'Parking',
  style: 'Style',
  condition: 'Condition',
  remarks: 'Remarks',
};

const FIELD_GROUPS: Record<string, string[]> = {
  'Identification': ['mlsNumber', 'listPrice', 'listDate', 'daysOnMarket'],
  'Location': ['address', 'city', 'state', 'zip'],
  'Property Details': ['propertyType', 'style', 'condition', 'bedrooms', 'bathsFull', 'bathsHalf', 'squareFeet', 'lotSize', 'yearBuilt'],
  'Systems & Costs': ['heating', 'cooling', 'parking', 'taxAmount', 'hoaFee'],
  'Description': ['remarks'],
};

function ConfidenceBadge({ level }: { level: string }) {
  switch (level) {
    case 'high':
      return <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />High</Badge>;
    case 'medium':
      return <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]"><AlertCircle className="h-3 w-3 mr-0.5" />Medium</Badge>;
    case 'low':
      return <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]"><HelpCircle className="h-3 w-3 mr-0.5" />Low</Badge>;
    default:
      return null;
  }
}

function FactorWeightIcon({ weight }: { weight: number }) {
  if (weight > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (weight < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

const ReviewDocument = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<any>(null);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, string>>({});
  const [fieldEvidence, setFieldEvidence] = useState<Record<string, string>>({});
  const [factors, setFactors] = useState<PropertyFactor[]>([]);
  const [rawTextOpen, setRawTextOpen] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('property_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !data) {
      toast({ title: 'Document not found', variant: 'destructive' });
      navigate('/documents');
      return;
    }

    setDocument(data);
    const fields = (data.extracted_fields || {}) as Record<string, string>;
    const confidence = (data.field_confidence || {}) as Record<string, string>;
    const evidence = (data.field_evidence || {}) as Record<string, string>;

    setEditedFields(fields);
    setFieldConfidence(confidence);
    setFieldEvidence(evidence);

    // Re-parse factors from raw text if available
    if (data.raw_text) {
      const { parseMLSPINText } = await import('@/lib/mlspinParser');
      const extraction = parseMLSPINText(data.raw_text);
      setFactors(extraction.factors);
    }

    setLoading(false);
  };

  const handleFieldChange = (key: string, value: string) => {
    setEditedFields(prev => ({ ...prev, [key]: value }));
    // Mark manually edited fields as high confidence
    setFieldConfidence(prev => ({ ...prev, [key]: 'high' }));
  };

  const handleSave = async (approve: boolean = false) => {
    if (!documentId) return;
    setSaving(true);

    const { error } = await supabase
      .from('property_documents')
      .update({
        extracted_fields: editedFields,
        field_confidence: fieldConfidence,
        status: approve ? 'approved' : 'reviewed',
      })
      .eq('id', documentId);

    setSaving(false);

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: approve ? 'Document approved' : 'Changes saved' });
    if (approve) {
      navigate('/documents');
    }
  };

  // Compute confidence stats
  const confidenceStats = (() => {
    const allKeys = Object.keys(FIELD_LABELS).filter(k => k !== 'remarks');
    const extracted = allKeys.filter(k => editedFields[k]);
    const high = extracted.filter(k => fieldConfidence[k] === 'high').length;
    const total = allKeys.length;
    const pct = Math.round((extracted.length / total) * 100);
    const level = pct >= 60 ? 'High' : pct >= 35 ? 'Moderate' : 'Low';
    return { extracted: extracted.length, total, high, pct, level };
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/documents" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-sans font-bold">Review Extracted Data</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {document?.filename}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            confidenceStats.level === 'High' ? 'text-emerald-600 border-emerald-300' :
            confidenceStats.level === 'Moderate' ? 'text-amber-600 border-amber-300' :
            'text-destructive border-destructive/30'
          }
        >
          <Shield className="h-3.5 w-3.5 mr-1" />
          {confidenceStats.level} Confidence ({confidenceStats.extracted}/{confidenceStats.total} fields)
        </Badge>
      </div>

      {/* Field Groups */}
      <div className="space-y-6">
        {Object.entries(FIELD_GROUPS).map(([groupName, keys]) => (
          <Card key={groupName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {keys.map(key => {
                const value = editedFields[key] || '';
                const confidence = fieldConfidence[key] || '';
                const evidence = fieldEvidence[key] || '';
                const label = FIELD_LABELS[key] || key;
                const isRemarks = key === 'remarks';

                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`field-${key}`} className="text-sm font-medium">
                        {label}
                      </Label>
                      <div className="flex items-center gap-2">
                        {confidence && <ConfidenceBadge level={confidence} />}
                        {!value && (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">Not found</Badge>
                        )}
                      </div>
                    </div>
                    {isRemarks ? (
                      <textarea
                        id={`field-${key}`}
                        value={value}
                        onChange={e => handleFieldChange(key, e.target.value)}
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="No remarks extracted"
                      />
                    ) : (
                      <Input
                        id={`field-${key}`}
                        value={value}
                        onChange={e => handleFieldChange(key, e.target.value)}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        className={!value ? 'border-dashed border-amber-300' : ''}
                      />
                    )}
                    {evidence && (
                      <p className="text-[11px] text-muted-foreground italic truncate">
                        Evidence: "{evidence}"
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Property Intelligence Factors */}
        {factors.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Property Intelligence Factors
                <Badge variant="secondary">{factors.length}</Badge>
              </CardTitle>
              <CardDescription>
                Automatically detected characteristics that may affect property value and marketability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {factors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <FactorWeightIcon weight={factor.weight} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{factor.label}</p>
                        <ConfidenceBadge level={factor.confidence} />
                        <Badge variant="outline" className="text-[10px]">
                          Weight: {factor.weight > 0 ? '+' : ''}{factor.weight}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{factor.explanation}</p>
                      <p className="text-[11px] text-muted-foreground italic mt-0.5 truncate">
                        Source: {factor.source} — "{factor.evidence}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Text */}
        <Collapsible open={rawTextOpen} onOpenChange={setRawTextOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Raw Extracted Text
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${rawTextOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {document?.raw_text || 'No text extracted'}
                </pre>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Action Bar */}
        <div className="flex gap-3 sticky bottom-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Approve & Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewDocument;
