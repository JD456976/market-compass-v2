import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, FileUp, Loader2, Sparkles, X, Info, Camera, ClipboardPaste, Link2, ExternalLink } from 'lucide-react';
import { LoadingEscapeHatch } from '@/components/LoadingEscapeHatch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPDF } from '@/lib/pdfExtract';
import { parseMLSPINText, getExtractionConfidence } from '@/lib/mlspinParser';

export interface MLSExtractedData {
  clientName?: string;
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
  const [pastedText, setPastedText] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const [showMicDisclosure, setShowMicDisclosure] = useState(false);
  const [activeTab, setActiveTab] = useState('paste');

  const MIC_DISCLOSURE_KEY = 'mc_mic_disclosure_accepted';

  const handleVoiceClick = useCallback(() => {
    const accepted = localStorage.getItem(MIC_DISCLOSURE_KEY);
    if (accepted === 'true') {
      startRecordingInternal();
    } else {
      setShowMicDisclosure(true);
    }
  }, []);

  const confirmMicAccess = useCallback(() => {
    setShowMicDisclosure(false);
    localStorage.setItem(MIC_DISCLOSURE_KEY, 'true');
    startRecordingInternal();
  }, []);

  const startRecordingInternal = useCallback(async () => {
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
        listPrice: extraction.listPrice?.value ? (isNaN(parseInt(extraction.listPrice.value.replace(/,/g, ''))) ? undefined : parseInt(extraction.listPrice.value.replace(/,/g, ''))) : undefined,
        daysOnMarket: extraction.daysOnMarket?.value ? (isNaN(parseInt(extraction.daysOnMarket.value)) ? undefined : parseInt(extraction.daysOnMarket.value)) : undefined,
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
      const extracted: MLSExtractedData = {};
      const lower = text.toLowerCase();

      // Extract client name (e.g. "client's name is Jason Craig", "client name Jason Craig", "for Jason Craig")
      const nameMatch = text.match(/(?:client(?:'s)?\s*name\s*(?:is)?\s*|(?:for|with)\s+client\s+)([\w]+(?:\s+[\w]+){0,2})/i);
      if (nameMatch) {
        extracted.clientName = nameMatch[1].trim();
      }

      // Extract price mentions
      const priceMatch = text.match(/\$?\s*([\d,]+)\s*(?:thousand|k)/i) || text.match(/\$\s*([\d,]+)/);
      if (priceMatch) {
        let price = parseInt(priceMatch[1].replace(/,/g, ''));
        if (!isNaN(price)) {
          if (/thousand|k/i.test(text) && price < 10000) price *= 1000;
          extracted.listPrice = price;
        }
      }

      // Extract days on market
      const domMatch = text.match(/(\d+)\s*(?:days?\s*on\s*market|dom|days?\s*listed)/i);
      if (domMatch) { const d = parseInt(domMatch[1]); if (!isNaN(d)) extracted.daysOnMarket = d; }

      // Extract property type
      if (/single\s*family|single-family/i.test(lower)) extracted.propertyType = 'SFH';
      else if (/condo/i.test(lower)) extracted.propertyType = 'Condo';
      else if (/townhouse|town\s*home/i.test(lower)) extracted.propertyType = 'Townhouse';
      else if (/multi|duplex|two[\s-]*family|three[\s-]*family/i.test(lower)) extracted.propertyType = 'Multi-Family';

      // Extract condition
      if (/renovated|remodeled|gut\s*rehab/i.test(lower)) extracted.condition = 'Renovated';
      else if (/updated|brand\s*new/i.test(lower)) extracted.condition = 'Updated';
      else if (/dated|needs\s*work|fixer/i.test(lower)) extracted.condition = 'Dated';

      // Extract address-like patterns (number + street name + optional city/state/zip)
      const addressMatch = text.match(/(\d+\s+[\w\s]+(?:st(?:reet)?|ave(?:nue)?|rd|road|dr(?:ive)?|ln|lane|ct|court|way|pl(?:ace)?|blvd|cir(?:cle)?)\.?)(?:\s*(?:in|,)?\s*([\w\s]+),?\s*([A-Z]{2})(?:\s+(\d{5}))?)?/i);
      if (addressMatch) {
        const streetPart = addressMatch[1].trim();
        const city = addressMatch[2]?.trim();
        const state = addressMatch[3]?.trim();
        const zip = addressMatch[4]?.trim();

        // Full address = street + city + state + zip
        const fullParts = [streetPart];
        if (city) fullParts.push(city);
        if (state) fullParts.push(state);
        if (zip) fullParts.push(zip);
        extracted.address = fullParts.join(', ');

        // Location = city + state (town-level only, NOT the full address)
        if (city && state) {
          extracted.location = `${city}, ${state}${zip ? ' ' + zip : ''}`;
        } else if (city) {
          extracted.location = city;
        }
      }

      // Extract just city/state if no full address found
      if (!extracted.location) {
        const cityStateMatch = text.match(/([\w\s]+),\s*([A-Z]{2})(?:\s+(\d{5}))?/);
        if (cityStateMatch) {
          extracted.location = cityStateMatch[0].trim();
        }
      }

      const fieldCount = Object.keys(extracted).filter(k => (extracted as any)[k] !== undefined).length;
      if (fieldCount > 0) {
        onDataExtracted(extracted);
        toast({ title: 'Data extracted', description: `Found ${fieldCount} field${fieldCount > 1 ? 's' : ''} from your voice input. Review for accuracy.` });
      } else {
        // Treat entire transcript as notes
        onDataExtracted({ notes: text });
        toast({ title: 'Saved as notes', description: 'Could not detect structured fields — transcript saved to notes.' });
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

  // =============================================
  // PASTE-FROM-MLS: Use existing regex parser on clipboard text
  // =============================================
  const processPastedText = useCallback(() => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    try {
      const extraction = parseMLSPINText(pastedText);
      const confidence = getExtractionConfidence(extraction);

      if (confidence.fieldsExtracted >= 3) {
        const locationParts: string[] = [];
        if (extraction.city?.value) locationParts.push(extraction.city.value);
        if (extraction.state?.value) locationParts.push(extraction.state.value);
        if (extraction.zip?.value) locationParts.push(extraction.zip.value);

        const addressParts: string[] = [];
        if (extraction.address?.value) addressParts.push(extraction.address.value);
        if (extraction.city?.value) addressParts.push(extraction.city.value);
        if (extraction.state?.value) addressParts.push(extraction.state.value);
        if (extraction.zip?.value) addressParts.push(extraction.zip.value);

        const propertyFactors: import('@/types').PropertyFactor[] = extraction.factors.map(f => ({
          label: f.label, weight: f.weight, explanation: f.explanation,
          evidence: f.evidence, confidence: f.confidence, source: f.source,
        }));

        const mlsDetails: Record<string, string> = {};
        if (extraction.mlsNumber?.value) mlsDetails.mlsNumber = extraction.mlsNumber.value;
        if (extraction.style?.value) mlsDetails.style = extraction.style.value;
        if (extraction.bedrooms?.value) mlsDetails.bedrooms = extraction.bedrooms.value;
        if (extraction.bathsFull?.value) mlsDetails.bathsFull = extraction.bathsFull.value;
        if (extraction.squareFeet?.value) mlsDetails.squareFeet = extraction.squareFeet.value;
        if (extraction.yearBuilt?.value) mlsDetails.yearBuilt = extraction.yearBuilt.value;
        if (extraction.lotSize?.value) mlsDetails.lotSize = extraction.lotSize.value;
        if (Object.keys(mlsDetails).length > 0) {
          sessionStorage.setItem('current_mls_details', JSON.stringify(mlsDetails));
        }

        const data: MLSExtractedData = {
          location: locationParts.join(', ') || undefined,
          address: addressParts.join(', ') || undefined,
          propertyType: mapPropertyType(extraction.propertyType?.value),
          condition: mapCondition(extraction),
          listPrice: extraction.listPrice?.value ? parseInt(extraction.listPrice.value.replace(/,/g, '')) || undefined : undefined,
          daysOnMarket: extraction.daysOnMarket?.value ? parseInt(extraction.daysOnMarket.value) || undefined : undefined,
          factors: propertyFactors.length > 0 ? propertyFactors : undefined,
        };

        onDataExtracted(data);
        setPastedText('');
        toast({
          title: `${confidence.fieldsExtracted} fields extracted from pasted text`,
          description: `Confidence: ${confidence.level} · ${confidence.highConfidenceCount} high-confidence fields. Review all data.`,
        });
      } else {
        processTextInput(pastedText);
        setPastedText('');
      }
    } catch {
      toast({ title: 'Could not parse pasted text', description: 'Try pasting raw MLS listing data or use another import method.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }, [pastedText, onDataExtracted, toast]);

  // =============================================
  // URL INTAKE: Scrape public listing page
  // =============================================
  const processListingUrl = useCallback(async () => {
    if (!listingUrl.trim()) return;

    let cleanUrl = listingUrl.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

    try {
      new URL(cleanUrl);
    } catch {
      toast({ title: 'Invalid URL', description: 'Please enter a valid listing URL.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-listing-url', {
        body: { url: cleanUrl },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Could not fetch listing', description: data.error, variant: 'destructive' });
        return;
      }

      if (data?.extracted) {
        const extracted = data.extracted;
        const fieldCount = Object.keys(extracted).filter(k => extracted[k] !== undefined && extracted[k] !== null).length;

        onDataExtracted({
          location: extracted.location,
          address: extracted.address,
          propertyType: extracted.propertyType,
          condition: extracted.condition,
          listPrice: extracted.listPrice,
          daysOnMarket: extracted.daysOnMarket,
          notes: extracted.notes,
        });

        setListingUrl('');
        toast({
          title: `${fieldCount} fields extracted from ${data.source || 'listing'}`,
          description: 'Review all imported data for accuracy before generating a report.',
        });
      } else {
        toast({ title: 'No data found', description: 'Could not extract listing details from this URL.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('URL scrape error:', err);
      toast({ title: 'Could not fetch listing', description: 'The site may be blocking access. Try pasting the listing details instead.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }, [listingUrl, onDataExtracted, toast]);

  return (
    <Card className="border-accent/20 mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-accent" />
          Smart MLS Import
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Paste listing text, enter a URL, upload a PDF, or speak details to auto-fill.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="paste" className="text-xs gap-1">
              <ClipboardPaste className="h-3 w-3" /> Paste
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs gap-1">
              <Link2 className="h-3 w-3" /> URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs gap-1">
              <FileUp className="h-3 w-3" /> Upload
            </TabsTrigger>
            <TabsTrigger value="voice" className="text-xs gap-1">
              <Mic className="h-3 w-3" /> Voice
            </TabsTrigger>
          </TabsList>

          {/* PASTE TAB */}
          <TabsContent value="paste" className="space-y-2 mt-3">
            <Textarea
              placeholder="Paste MLS listing details here...&#10;&#10;e.g. MLS# 73312456&#10;123 Main St, Norwood, MA 02062&#10;List Price: $549,000&#10;3BR 2BA · 1,850 sqft · Built 1965"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="min-h-[100px] text-xs resize-none"
              disabled={isProcessing}
            />
            <Button
              size="sm"
              onClick={processPastedText}
              disabled={!pastedText.trim() || isProcessing}
              className="w-full min-h-[44px]"
            >
              <ClipboardPaste className="h-4 w-4 mr-1.5" />
              Extract Fields
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Parsed locally — no data sent to any server. Works with any MLS format.
            </p>
          </TabsContent>

          {/* URL TAB */}
          <TabsContent value="url" className="space-y-2 mt-3">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://zillow.com/homedetails/..."
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                className="text-xs"
                disabled={isProcessing}
              />
              <Button
                size="sm"
                onClick={processListingUrl}
                disabled={!listingUrl.trim() || isProcessing}
                className="min-h-[44px] shrink-0"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Fetch
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Zillow', 'Redfin', 'Realtor.com', 'Trulia'].map(site => (
                <Badge key={site} variant="secondary" className="text-[10px]">{site}</Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Extracts publicly visible data only. Always review for accuracy.
            </p>
          </TabsContent>

          {/* UPLOAD TAB */}
          <TabsContent value="upload" className="space-y-2 mt-3">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="w-full min-h-[44px]"
                onClick={handleFileClick}
                disabled={isProcessing || isRecording}
              >
                <FileUp className="h-4 w-4 mr-1.5" /> Upload MLS PDF or Photo
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="absolute -top-1.5 -right-1.5 h-4 w-4 text-muted-foreground bg-background rounded-full cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px]">
                    <p className="text-xs font-medium mb-1">Import MLS Listing Data</p>
                    <p className="text-xs text-muted-foreground">Upload a PDF or photo of an MLS listing sheet. PDFs are parsed locally — no AI required. Photos use AI extraction. Always review imported data.</p>
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
          </TabsContent>

          {/* VOICE TAB */}
          <TabsContent value="voice" className="space-y-2 mt-3">
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="sm"
              className="w-full min-h-[44px]"
              onClick={isRecording ? stopRecording : handleVoiceClick}
              disabled={isProcessing}
            >
              {isRecording ? (
                <><MicOff className="h-4 w-4 mr-1.5" /> Stop Recording</>
              ) : (
                <><Mic className="h-4 w-4 mr-1.5" /> Start Voice Input</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Speak listing details naturally. Processed locally on your device.
            </p>
          </TabsContent>
        </Tabs>

        {/* Shared status indicators */}
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
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <p className="text-xs text-accent font-medium">Extracting listing data...</p>
            </div>
            <LoadingEscapeHatch
              isLoading={isProcessing}
              delaySeconds={10}
              onCancel={() => setIsProcessing(false)}
              message="Extraction is taking longer than expected."
            />
          </div>
        )}
      </CardContent>

      {/* Microphone disclosure — App Store compliance */}
      <AlertDialog open={showMicDisclosure} onOpenChange={(o) => { if (!o) setShowMicDisclosure(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              Microphone Access
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Market Compass uses your microphone to transcribe property details via voice dictation. Speech is processed locally on your device — no audio is sent to any server.
              <br /><br />
              <span className="text-xs text-muted-foreground">
                You can revoke microphone access anytime in your device settings. Voice input is entirely optional — you can always type manually.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMicAccess}>Allow Microphone</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
