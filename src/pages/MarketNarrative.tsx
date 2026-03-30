import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Check, RefreshCw, Mail, Share2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PRICE_CHANGES = [
  { value: "up_5_plus", label: "Up 5%+" },
  { value: "up_1_5", label: "Up 1–5%" },
  { value: "flat", label: "Flat" },
  { value: "down_1_5", label: "Down 1–5%" },
  { value: "down_5_plus", label: "Down 5%+" },
];

const MARKET_CONDITIONS = [
  { value: "strong_sellers", label: "Strong seller's" },
  { value: "sellers", label: "Seller's" },
  { value: "balanced", label: "Balanced" },
  { value: "buyers", label: "Buyer's" },
  { value: "strong_buyers", label: "Strong buyer's" },
];

const AUDIENCES = [
  "Buyers & Sellers",
  "First-time buyers",
  "Potential sellers",
  "Investors",
];

interface NarrativeResult {
  email: string;
  social: string;
  summary: string;
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function MarketNarrative() {
  const [neighborhood, setNeighborhood] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [medianPrice, setMedianPrice] = useState("");
  const [priceChange, setPriceChange] = useState("");
  const [dom, setDom] = useState("");
  const [listToSale, setListToSale] = useState("");
  const [activeListings, setActiveListings] = useState("");
  const [monthsSupply, setMonthsSupply] = useState("");
  const [marketCondition, setMarketCondition] = useState("");
  const [audience, setAudience] = useState("Buyers & Sellers");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NarrativeResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const isFormValid =
    medianPrice.trim() && priceChange && dom.trim() && marketCondition;

  const generate = async () => {
    if (!isFormValid) {
      toast({ title: "Fill required fields", description: "Median price, price change, DOM, and market condition are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("market-narrative", {
        body: {
          neighborhood: neighborhood || undefined,
          reportMonth: reportMonth || undefined,
          medianPrice,
          priceChange: PRICE_CHANGES.find(p => p.value === priceChange)?.label ?? priceChange,
          dom,
          listToSale: listToSale || "N/A",
          activeListings: activeListings || "N/A",
          monthsSupply: monthsSupply || "N/A",
          marketCondition: MARKET_CONDITIONS.find(m => m.value === marketCondition)?.label ?? marketCondition,
          audience,
        },
      });

      if (error) throw error;
      if (!data?.email || !data?.social || !data?.summary) {
        throw new Error("Incomplete response from AI");
      }
      setResult(data as NarrativeResult);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(null), 2000);
  };

  const RESULT_CARDS: { key: keyof NarrativeResult; label: string; icon: React.ReactNode; badgeColor: string }[] = [
    { key: "email", label: "Email Draft", icon: <Mail className="h-3.5 w-3.5" />, badgeColor: "bg-primary/15 text-primary border-primary/20" },
    { key: "social", label: "Social Post", icon: <Share2 className="h-3.5 w-3.5" />, badgeColor: "bg-primary/15 text-primary border-primary/20" },
    { key: "summary", label: "Key Summary", icon: <FileText className="h-3.5 w-3.5" />, badgeColor: "bg-primary/15 text-primary border-primary/20" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-sans font-bold text-foreground">AI Narrative</h1>
            <p className="text-sm text-muted-foreground">Turn market stats into 3 types of client-ready copy</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Form — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-sans">Market Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Neighborhood / ZIP */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Neighborhood / ZIP</label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="e.g. Brookline, MA or 02445"
                />
              </div>

              {/* Report Month */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Report Month</label>
                <Input
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  placeholder="e.g. March 2026"
                />
              </div>

              {/* Median Price */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Median Sale Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    value={medianPrice}
                    onChange={(e) => setMedianPrice(e.target.value.replace(/[^0-9,]/g, ""))}
                    placeholder="485,000"
                    className="pl-7 font-mono"
                  />
                </div>
              </div>

              {/* Price Change */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Price Change (YoY) *</label>
                <Select value={priceChange} onValueChange={setPriceChange}>
                  <SelectTrigger><SelectValue placeholder="Select trend" /></SelectTrigger>
                  <SelectContent>
                    {PRICE_CHANGES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Days on Market */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Days on Market *</label>
                <Input
                  type="number"
                  value={dom}
                  onChange={(e) => setDom(e.target.value)}
                  placeholder="18"
                  className="font-mono"
                />
              </div>

              {/* List-to-Sale */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">List-to-Sale Ratio</label>
                <Input
                  value={listToSale}
                  onChange={(e) => setListToSale(e.target.value)}
                  placeholder="101.3%"
                  className="font-mono"
                />
              </div>

              {/* Active Listings */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Active Listings</label>
                <Input
                  type="number"
                  value={activeListings}
                  onChange={(e) => setActiveListings(e.target.value)}
                  placeholder="142"
                  className="font-mono"
                />
              </div>

              {/* Months of Supply */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Months of Supply</label>
                <Input
                  value={monthsSupply}
                  onChange={(e) => setMonthsSupply(e.target.value)}
                  placeholder="1.8"
                  className="font-mono"
                />
              </div>

              {/* Market Condition */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Market Condition *</label>
                <Select value={marketCondition} onValueChange={setMarketCondition}>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    {MARKET_CONDITIONS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audience pills */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Write For</label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCES.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAudience(a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        audience === a
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            className="w-full accent-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            onClick={generate}
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate All 3
              </span>
            )}
          </Button>
        </div>

        {/* Output Cards — 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {RESULT_CARDS.map(({ key, label, icon, badgeColor }) => (
                <Card key={key} className="overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`${badgeColor} gap-1.5 text-xs`}>
                        {icon}
                        {label}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {wordCount(result[key])} words
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleCopy(result[key], key)}
                        >
                          {copied === key ? (
                            <Check className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {result[key]}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {/* Regenerate */}
              <Button
                variant="outline"
                className="w-full"
                onClick={generate}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">No copy generated yet</p>
              <p className="text-xs text-muted-foreground/60 max-w-[240px]">
                Fill in your market stats and click Generate to create an email draft, social post, and key summary
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
