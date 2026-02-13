import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, FileUp, Loader2, Sparkles, X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPDF } from '@/lib/pdfExtract';
import { parseMLSPINText, getExtractionConfidence } from '@/lib/mlspinParser';

export interface MLSExtractedData {
  location?: string;
  address?: string;
  propertyType?: string;
  condition?: string;
  listPrice?: number;
  daysOnMarket?: number;
  notes?: string;
  factors?: import('@/types').PropertyFactor[];
}

interface MLSVoiceCameraInputProps {
  onDataExtracted: (data: MLSExtractedData) => void;
  reportType: 'buyer' | 'seller';
}

export function MLSVoiceCameraInput({ onDataExtracted, reportType }: MLSVoiceCameraInputProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const startRecording = useCallback(async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast({ title: 'Not supported', description: 'Speech recognition is not available in this browser.', variant: 'destructive' });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      finalTranscriptRef.current = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalText = finalTranscriptRef.current;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) { finalText += t + ' '; } else { interim = t; }
        }
        finalTranscriptRef.current = finalText;
        setTranscript(finalText + interim);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        const text = finalTranscriptRef.current.trim();
        if (text) processTextInput(text);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setTranscript('');
    } catch {
      toast({ title: 'Microphone error', description: 'Could not access microphone.', variant: 'destructive' });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); setIsRecording(false); }
  }, []);

  const handleFileClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPDF) {
      // Use client-side PDF extraction with pdfjs-dist
      await processPDFFile(file);
    } else {
      // Image: send to edge function via base64
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        setCapturedImage(base64);
        await processImageInput(base64);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const mapPropertyType = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    const lower = raw.toLowerCase();
    if (/single\s*family/i.test(lower)) return 'SFH';
    if (/condo/i.test(lower)) return 'Condo';
    if (/multi|duplex|triple|two[\s-]*family|three[\s-]*family/i.test(lower)) return 'MFH';
    return undefined;
  };

  const mapCondition = (extraction: ReturnType<typeof parseMLSPINText>): string | undefined => {
    if (extraction.condition?.value) return extraction.condition.value;
    const remarks = extraction.remarks?.value?.toLowerCase() || '';
    if (/renovated|remodeled|gut\s*rehab|completely\s*redone/i.test(remarks)) return 'Renovated';
    if (/updated|brand\s*new/i.test(remarks)) return 'Updated';
    return undefined;
  };

  const buildCompactNotes = (extraction: ReturnType<typeof parseMLSPINText>): string => {
    const lines: string[] = [];
    if (extraction.mlsNumber?.value) lines.push(`MLS#: ${extraction.mlsNumber.value}`);
    if (extraction.style?.value) lines.push(`Style: ${extraction.style.value}`);
    if (extraction.bedrooms?.value) lines.push(`${extraction.bedrooms.value}BR`);
    if (extraction.bathsFull?.value) lines.push(`${extraction.bathsFull.value}BA`);
    if (extraction.squareFeet?.value) lines.push(`${parseInt(extraction.squareFeet.value).toLocaleString()} sqft`);
    if (extraction.lotSize?.value) lines.push(`Lot: ${extraction.lotSize.value}`);
    if (extraction.yearBuilt?.value) lines.push(`Built: ${extraction.yearBuilt.value}`);
    if (extraction.heating?.value) lines.push(`Heat: ${extraction.heating.value}`);
    if (extraction.cooling?.value) lines.push(`Cool: ${extraction.cooling.value}`);
    if (extraction.parking?.value) lines.push(`Parking: ${extraction.parking.value}`);
    if (extraction.foundation?.value) lines.push(`Foundation: ${extraction.foundation.value}`);
    if (extraction.basement?.value) lines.push(`Basement: ${extraction.basement.value}`);
    if (extraction.taxAmount?.value) lines.push(`Tax: $${parseInt(extraction.taxAmount.value).toLocaleString()}`);
    // Keep it compact - no factors here (they go into session.property_factors)
    return lines.join(' · ');
  };

  const processPDFFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const rawText = await extractTextFromPDF(file);
      
      if (!rawText || rawText.trim().length < 50) {
        toast({ title: 'PDF appears empty', description: 'Could not extract text from this PDF. Try uploading a photo instead.', variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      const extraction = parseMLSPINText(rawText);
      const confidence = getExtractionConfidence(extraction);

      // Build location from city/state/zip
      const locationParts: string[] = [];
      if (extraction.city?.value) locationParts.push(extraction.city.value);
      if (extraction.state?.value) locationParts.push(extraction.state.value);
      if (extraction.zip?.value) locationParts.push(extraction.zip.value);

      // Build full address string
      const addressParts: string[] = [];
      if (extraction.address?.value) addressParts.push(extraction.address.value);
      if (extraction.city?.value) addressParts.push(extraction.city.value);
      if (extraction.state?.value) addressParts.push(extraction.state.value);
      if (extraction.zip?.value) addressParts.push(extraction.zip.value);

      const mappedPropertyType = mapPropertyType(extraction.propertyType?.value);
      const mappedCondition = mapCondition(extraction);

      // Convert factors for session attachment
      const propertyFactors: import('@/types').PropertyFactor[] = extraction.factors.map(f => ({
        label: f.label,
        weight: f.weight,
        explanation: f.explanation,
        evidence: f.evidence,
        confidence: f.confidence,
        source: f.source,
      }));

      // Build MLS details for visual display on report
      const mlsDetails: Record<string, string> = {};
      if (extraction.mlsNumber?.value) mlsDetails.mlsNumber = extraction.mlsNumber.value;
      if (extraction.style?.value) mlsDetails.style = extraction.style.value;
      if (extraction.bedrooms?.value) mlsDetails.bedrooms = extraction.bedrooms.value;
      if (extraction.bathsFull?.value) mlsDetails.bathsFull = extraction.bathsFull.value;
      if (extraction.bathsHalf?.value) mlsDetails.bathsHalf = extraction.bathsHalf.value;
      if (extraction.squareFeet?.value) mlsDetails.squareFeet = extraction.squareFeet.value;
      if (extraction.lotSize?.value) mlsDetails.lotSize = extraction.lotSize.value;
      if (extraction.yearBuilt?.value) mlsDetails.yearBuilt = extraction.yearBuilt.value;
      if (extraction.totalRooms?.value) mlsDetails.totalRooms = extraction.totalRooms.value;
      if (extraction.heating?.value) mlsDetails.heating = extraction.heating.value;
      if (extraction.cooling?.value) mlsDetails.cooling = extraction.cooling.value;
      if (extraction.parking?.value) mlsDetails.parking = extraction.parking.value;
      if (extraction.foundation?.value) mlsDetails.foundation = extraction.foundation.value;
      if (extraction.basement?.value) mlsDetails.basement = extraction.basement.value;
      if (extraction.construction?.value) mlsDetails.construction = extraction.construction.value;
      if (extraction.taxAmount?.value) mlsDetails.taxAmount = extraction.taxAmount.value;
      if (extraction.schools?.value) mlsDetails.schools = extraction.schools.value;
      if (extraction.listingOffice?.value) mlsDetails.listingOffice = extraction.listingOffice.value;

      // Store MLS details in sessionStorage for report display
      if (Object.keys(mlsDetails).length > 0) {
        sessionStorage.setItem('current_mls_details', JSON.stringify(mlsDetails));
      }

      const data: MLSExtractedData = {
        location: locationParts.join(', ') || undefined,
        address: addressParts.join(', ') || undefined,
        propertyType: mappedPropertyType,
        condition: mappedCondition,
        listPrice: extraction.listPrice?.value ? parseInt(extraction.listPrice.value.replace(/,/g, '')) : undefined,
        daysOnMarket: extraction.daysOnMarket?.value ? parseInt(extraction.daysOnMarket.value) : undefined,
        notes: undefined, // No longer stuffing MLS details into notes
        factors: propertyFactors.length > 0 ? propertyFactors : undefined,
      };

      onDataExtracted(data);
      toast({
        title: `${confidence.fieldsExtracted} fields extracted`,
        description: `Confidence: ${confidence.level} · ${confidence.highConfidenceCount} high-confidence fields. Review all imported data for accuracy.`,
      });
    } catch (err) {
      console.error('PDF parsing error:', err);
      toast({ title: 'PDF parsing failed', description: 'Could not extract text from this PDF. Try a clearer document or photo.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const processTextInput = async (text: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-mls-input', {
        body: { type: 'text', content: text, reportType },
      });
      if (error) throw error;
      if (data?.extracted) {
        onDataExtracted(data.extracted);
        toast({ title: 'Data extracted', description: `Found ${Object.keys(data.extracted).filter(k => data.extracted[k]).length} fields from your input.` });
      }
    } catch {
      toast({ title: 'Could not parse input', description: 'Try speaking more clearly or use the manual fields.', variant: 'destructive' });
    } finally { setIsProcessing(false); }
  };

  const processImageInput = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-mls-input', {
        body: { type: 'image', content: base64Image, reportType },
      });
      if (error) throw error;
      if (data?.extracted) {
        onDataExtracted(data.extracted);
        toast({ title: 'Data extracted from photo', description: `Found ${Object.keys(data.extracted).filter(k => data.extracted[k]).length} fields. Please review for accuracy.` });
      }
    } catch {
      toast({ title: 'Could not parse image', description: 'Try a clearer photo of the MLS listing.', variant: 'destructive' });
    } finally { setIsProcessing(false); }
  };

  return (
    <Card className="border-accent/20 mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-accent" />
          Smart MLS Import
          <Badge variant="secondary" className="text-[10px]">AI</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Speak listing details or upload an MLS listing sheet to auto-fill fields.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size="sm"
            className="flex-1 min-h-[44px]"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isRecording ? (
              <><MicOff className="h-4 w-4 mr-1.5" /> Stop Recording</>
            ) : (
              <><Mic className="h-4 w-4 mr-1.5" /> Voice Input</>
            )}
          </Button>
          <div className="flex-1 relative">
            <Button
              variant="outline"
              size="sm"
              className="w-full min-h-[44px]"
              onClick={handleFileClick}
              disabled={isProcessing || isRecording}
            >
              <FileUp className="h-4 w-4 mr-1.5" /> MLS PDF / Photo
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="absolute -top-1.5 -right-1.5 h-4 w-4 text-muted-foreground bg-background rounded-full cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px]">
                  <p className="text-xs font-medium mb-1">Import MLS Listing Data</p>
                  <p className="text-xs text-muted-foreground">Upload a PDF or photo of an MLS listing sheet. Data is extracted locally and securely — no AI required for PDFs. Always review imported data for accuracy before generating a report.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            <p className="text-xs text-destructive font-medium">Listening...</p>
          </div>
        )}

        {transcript && (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground font-medium">Transcript</p>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setTranscript('')}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs">{transcript}</p>
          </div>
        )}

        {capturedImage && (
          <div className="relative rounded-lg overflow-hidden border border-border/30">
            <img src={capturedImage} alt="Captured MLS listing" className="w-full h-32 object-cover" />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 rounded-full"
              onClick={() => setCapturedImage(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <p className="text-xs text-accent font-medium">Extracting listing data...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
