import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Camera, Loader2, Sparkles, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface MLSExtractedData {
  location?: string;
  propertyType?: string;
  condition?: string;
  listPrice?: number;
  daysOnMarket?: number;
  notes?: string;
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Speech-to-text using Web Speech API
  const startRecording = useCallback(async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast({
          title: 'Not supported',
          description: 'Speech recognition is not available in this browser. Try Chrome or Safari.',
          variant: 'destructive',
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t + ' ';
          } else {
            interim = t;
          }
        }
        setTranscript(finalTranscript + interim);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (finalTranscript.trim()) {
          processTextInput(finalTranscript.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setTranscript('');
    } catch (err) {
      console.error('Speech recognition error:', err);
      toast({
        title: 'Microphone error',
        description: 'Could not access microphone. Check permissions.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Camera / photo capture
  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for display and AI processing
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setCapturedImage(base64);
      await processImageInput(base64);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Process voice transcript via AI
  const processTextInput = async (text: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-mls-input', {
        body: {
          type: 'text',
          content: text,
          reportType,
        },
      });

      if (error) throw error;

      if (data?.extracted) {
        onDataExtracted(data.extracted);
        toast({
          title: 'Data extracted',
          description: `Found ${Object.keys(data.extracted).filter(k => data.extracted[k]).length} fields from your input.`,
        });
      }
    } catch (err: any) {
      console.error('Parse error:', err);
      toast({
        title: 'Could not parse input',
        description: 'Try speaking more clearly or use the manual fields.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process captured image via AI
  const processImageInput = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-mls-input', {
        body: {
          type: 'image',
          content: base64Image,
          reportType,
        },
      });

      if (error) throw error;

      if (data?.extracted) {
        onDataExtracted(data.extracted);
        toast({
          title: 'Data extracted from photo',
          description: `Found ${Object.keys(data.extracted).filter(k => data.extracted[k]).length} fields from the listing image.`,
        });
      }
    } catch (err: any) {
      console.error('Image parse error:', err);
      toast({
        title: 'Could not parse image',
        description: 'Try a clearer photo of the MLS listing.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-accent" />
          Smart Input
          <Badge variant="secondary" className="text-[10px]">AI</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Speak listing details or snap a photo of an MLS sheet to auto-fill fields.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Action Buttons */}
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
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px]"
            onClick={handleCameraCapture}
            disabled={isProcessing || isRecording}
          >
            <Camera className="h-4 w-4 mr-1.5" /> Photo Input
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            <p className="text-xs text-destructive font-medium">Listening...</p>
          </div>
        )}

        {/* Transcript preview */}
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

        {/* Captured image preview */}
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

        {/* Processing state */}
        {isProcessing && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <p className="text-xs text-accent font-medium">Extracting listing data with AI...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
