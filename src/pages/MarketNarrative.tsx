import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Check, RefreshCw, FileText, Megaphone, Users, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TONES = [
  { value: "professional", label: "Professional & Confident", icon: <Briefcase className="h-4 w-4" /> },
  { value: "conversational", label: "Conversational & Warm", icon: <Users className="h-4 w-4" /> },
  { value: "urgent", label: "Urgent & Action-Oriented", icon: <Megaphone className="h-4 w-4" /> },
  { value: "educational", label: "Educational & Informative", icon: <FileText className="h-4 w-4" /> },
];

const AUDIENCES = [
  { value: "sellers", label: "Home Sellers" },
  { value: "buyers", label: "Home Buyers" },
  { value: "investors", label: "Investors" },
  { value: "general", label: "General / Social Media" },
];

const EXAMPLE_STATS = `Median Sale Price: $485,000 (up 4.2% YoY)
Average Days on Market: 18 days (down from 26)
Active Listings: 142 (down 12% from last quarter)
List-to-Sale Ratio: 101.3%
Mortgage Rate (30yr): 6.87%
Months of Supply: 1.8
New Listings This Month: 67
Pending Sales: 89`;

export default function MarketNarrative() {
  const [stats, setStats] = useState("");
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("sellers");
  const [narrative, setNarrative] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const generateNarrative = async () => {
    if (!stats.trim()) {
      toast({ title: "Enter market stats", description: "Paste your raw market data to generate a narrative.", variant: "destructive" });
      return;
    }

    setIsStreaming(true);
    setNarrative("");

    const controller = new AbortController();
    abortRef.current = controller;

    const toneLabel = TONES.find(t => t.value === tone)?.label || tone;
    const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label || audience;

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-narrative`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ stats, tone: toneLabel, audience: audienceLabel }),
          signal: controller.signal,
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setNarrative(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(narrative);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Market Narrative</h1>
            <p className="text-sm text-muted-foreground">AI-powered client-ready market copy from raw stats</p>
          </div>
        </div>
        <Badge variant="secondary" className="mt-2">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Raw Market Stats</CardTitle>
              <CardDescription>Paste your market data — median prices, DOM, inventory, rates, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={stats}
                onChange={(e) => setStats(e.target.value)}
                placeholder="Paste your market statistics here..."
                className="min-h-[200px] font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setStats(EXAMPLE_STATS)}
                className="text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                Load example stats
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Audience</label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isStreaming ? (
                <Button variant="outline" className="w-full" onClick={handleStop}>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Stop Generating
                </Button>
              ) : (
                <Button className="w-full" onClick={generateNarrative} disabled={!stats.trim()}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Narrative
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Output Column */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Generated Narrative</CardTitle>
                {narrative && !isStreaming && (
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>
              <CardDescription>Client-ready copy you can share immediately</CardDescription>
            </CardHeader>
            <CardContent>
              {narrative ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                    {narrative}
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">No narrative generated yet</p>
                  <p className="text-xs text-muted-foreground/60">Paste stats and hit generate to create client-ready copy</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
