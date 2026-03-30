import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, Check, RefreshCw, FileText, Megaphone, Users, Briefcase, Mail, Share2, Presentation } from "lucide-react";
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

const COPY_TYPES = [
  {
    value: "market-update",
    label: "Market Update",
    icon: <Mail className="h-4 w-4" />,
    description: "Email-ready market summary for clients",
    prompt: "Write a polished market update email that an agent can send directly to clients. Include a subject line, greeting, 3-4 paragraphs analyzing the data, and a professional sign-off. Structure with clear sections.",
  },
  {
    value: "social-post",
    label: "Social Post",
    icon: <Share2 className="h-4 w-4" />,
    description: "Engaging social media caption with hashtags",
    prompt: "Write 3 social media post variations (each 2-4 sentences) that a real estate agent can post on Instagram, Facebook, or LinkedIn. Make them punchy, data-driven, and include relevant hashtags. Label them Post 1, Post 2, Post 3.",
  },
  {
    value: "presentation",
    label: "Presentation Script",
    icon: <Presentation className="h-4 w-4" />,
    description: "Talking points for listing presentations",
    prompt: "Write a listing presentation script with 5-7 key talking points, each with a headline and 2-3 supporting sentences citing the data. Format as numbered bullet points an agent can reference during a meeting. Include an opening hook and closing recommendation.",
  },
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
  const [copyType, setCopyType] = useState("market-update");
  const [narratives, setNarratives] = useState<Record<string, string>>({});
  const [activeGeneration, setActiveGeneration] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const currentNarrative = narratives[copyType] || "";

  const generateNarrative = async () => {
    if (!stats.trim()) {
      toast({ title: "Enter market stats", description: "Paste your raw market data first.", variant: "destructive" });
      return;
    }

    setActiveGeneration(copyType);
    setNarratives(prev => ({ ...prev, [copyType]: "" }));

    const controller = new AbortController();
    abortRef.current = controller;

    const toneLabel = TONES.find(t => t.value === tone)?.label || tone;
    const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label || audience;
    const typeConfig = COPY_TYPES.find(t => t.value === copyType)!;

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-narrative`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            stats,
            tone: toneLabel,
            audience: audienceLabel,
            copyTypePrompt: typeConfig.prompt,
            copyTypeLabel: typeConfig.label,
          }),
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
      const currentType = copyType;

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
              setNarratives(prev => ({ ...prev, [currentType]: fullText }));
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
      setActiveGeneration(null);
      abortRef.current = null;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentNarrative);
    setCopied(copyType);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setActiveGeneration(null);
  };

  const isStreaming = activeGeneration === copyType;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-sans font-bold text-foreground">AI Narrative</h1>
            <p className="text-sm text-muted-foreground">Turn raw stats into 3 types of client-ready copy</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-sans">Raw Market Stats</CardTitle>
              <CardDescription>Paste your market data — median prices, DOM, inventory, rates, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={stats}
                onChange={(e) => setStats(e.target.value)}
                placeholder="Paste your market statistics here..."
                className="min-h-[160px] font-mono text-sm"
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
              <CardTitle className="text-base font-sans">Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Output Column */}
        <div className="space-y-4">
          {/* Copy Type Tabs */}
          <Tabs value={copyType} onValueChange={setCopyType}>
            <TabsList className="w-full grid grid-cols-3">
              {COPY_TYPES.map(ct => (
                <TabsTrigger key={ct.value} value={ct.value} className="text-xs gap-1.5">
                  {ct.icon}
                  <span className="hidden sm:inline">{ct.label}</span>
                  <span className="sm:hidden">{ct.label.split(" ")[0]}</span>
                  {narratives[ct.value] && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {COPY_TYPES.map(ct => (
              <TabsContent key={ct.value} value={ct.value} className="mt-4">
                <Card className="min-h-[350px] flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-sans">{ct.label}</CardTitle>
                        <CardDescription className="text-xs">{ct.description}</CardDescription>
                      </div>
                      {narratives[ct.value] && activeGeneration !== ct.value && (
                        <Button variant="ghost" size="sm" onClick={handleCopy}>
                          {copied === ct.value ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                          {copied === ct.value ? "Copied" : "Copy"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {narratives[ct.value] ? (
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                          {narratives[ct.value]}
                          {activeGeneration === ct.value && (
                            <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                        <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                          {ct.icon}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">No {ct.label.toLowerCase()} yet</p>
                        <p className="text-xs text-muted-foreground/60">Click generate below</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Generate Button */}
          {activeGeneration ? (
            <Button variant="outline" className="w-full" onClick={handleStop}>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Stop Generating
            </Button>
          ) : (
            <Button
              className="w-full accent-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              onClick={generateNarrative}
              disabled={!stats.trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate {COPY_TYPES.find(c => c.value === copyType)?.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
