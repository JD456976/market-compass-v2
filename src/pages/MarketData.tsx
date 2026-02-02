import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { 
  ArrowLeft, Database, Upload, Plus, Trash2, Pencil, Download, 
  MapPin, Clock, TrendingUp, BarChart3, AlertCircle, CheckCircle2, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  loadMarketSnapshots, 
  saveCustomSnapshot, 
  MarketSnapshot,
  GENERIC_BASELINE 
} from '@/lib/marketSnapshots';

const CUSTOM_SNAPSHOTS_KEY = 'reality_engine_market_snapshots';

// Sample CSV template
const SAMPLE_CSV = `location,medianDOM,saleToListRatio,inventorySignal,sourceLabel
"Portland, ME",42,0.97,balanced,Public market data
"Burlington, VT",38,0.99,low,Public market data
"Providence, RI",30,1.01,balanced,Public market data`;

const MarketData = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  
  // Form state for adding/editing
  const [formLocation, setFormLocation] = useState('');
  const [formDOM, setFormDOM] = useState('35');
  const [formSaleToList, setFormSaleToList] = useState('0.98');
  const [formInventory, setFormInventory] = useState<'low' | 'balanced' | 'high'>('balanced');
  const [formSource, setFormSource] = useState('Public market data');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    refreshSnapshots();
  }, []);

  const refreshSnapshots = () => {
    setSnapshots(loadMarketSnapshots());
  };

  const handleAddOrUpdate = () => {
    if (!formLocation.trim()) {
      toast({
        title: "Location required",
        description: "Please enter a city and state.",
        variant: "destructive",
      });
      return;
    }

    const dom = parseInt(formDOM);
    const stl = parseFloat(formSaleToList);
    
    if (isNaN(dom) || dom < 1 || dom > 365) {
      toast({
        title: "Invalid DOM",
        description: "Days on Market must be between 1 and 365.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(stl) || stl < 0.5 || stl > 1.5) {
      toast({
        title: "Invalid ratio",
        description: "Sale-to-list ratio should be between 0.50 and 1.50.",
        variant: "destructive",
      });
      return;
    }

    saveCustomSnapshot({
      location: formLocation.trim(),
      medianDOM: dom,
      saleToListRatio: stl,
      inventorySignal: formInventory,
      lastUpdated: new Date().toISOString().split('T')[0],
      sourceLabel: formSource.trim() || 'Custom data',
    });

    refreshSnapshots();
    resetForm();
    setAddDialogOpen(false);
    
    toast({
      title: editingId ? "Snapshot updated" : "Snapshot added",
      description: `Market data for ${formLocation} has been saved.`,
    });
  };

  const resetForm = () => {
    setFormLocation('');
    setFormDOM('35');
    setFormSaleToList('0.98');
    setFormInventory('balanced');
    setFormSource('Public market data');
    setEditingId(null);
  };

  const handleEdit = (snapshot: MarketSnapshot) => {
    setFormLocation(snapshot.location);
    setFormDOM(snapshot.medianDOM.toString());
    setFormSaleToList(snapshot.saleToListRatio.toString());
    setFormInventory(snapshot.inventorySignal);
    setFormSource(snapshot.sourceLabel);
    setEditingId(snapshot.id);
    setAddDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setSnapshotToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!snapshotToDelete) return;
    
    // Only delete custom snapshots
    const customSnapshots = JSON.parse(localStorage.getItem(CUSTOM_SNAPSHOTS_KEY) || '[]') as MarketSnapshot[];
    const filtered = customSnapshots.filter(s => s.id !== snapshotToDelete);
    localStorage.setItem(CUSTOM_SNAPSHOTS_KEY, JSON.stringify(filtered));
    
    refreshSnapshots();
    setDeleteDialogOpen(false);
    setSnapshotToDelete(null);
    
    toast({
      title: "Snapshot deleted",
      description: "The market snapshot has been removed.",
    });
  };

  const handleImport = () => {
    if (!importText.trim()) return;

    let successCount = 0;
    let failedCount = 0;

    // Parse CSV or JSON
    try {
      // Try JSON first
      const jsonData = JSON.parse(importText);
      const items = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      items.forEach(item => {
        try {
          if (item.location && item.medianDOM !== undefined && item.saleToListRatio !== undefined) {
            saveCustomSnapshot({
              location: item.location,
              medianDOM: parseInt(item.medianDOM),
              saleToListRatio: parseFloat(item.saleToListRatio),
              inventorySignal: item.inventorySignal || 'balanced',
              lastUpdated: new Date().toISOString().split('T')[0],
              sourceLabel: item.sourceLabel || 'Imported data',
            });
            successCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      });
    } catch {
      // Try CSV
      const lines = importText.trim().split('\n');
      const hasHeader = lines[0].toLowerCase().includes('location');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      dataLines.forEach(line => {
        try {
          // Handle quoted fields
          const matches = line.match(/(".*?"|[^,]+)/g);
          if (!matches || matches.length < 3) {
            failedCount++;
            return;
          }

          const cleanField = (s: string) => s.replace(/^"|"$/g, '').trim();
          const location = cleanField(matches[0]);
          const dom = parseInt(cleanField(matches[1]));
          const stl = parseFloat(cleanField(matches[2]));
          const inventory = matches[3] ? cleanField(matches[3]) as 'low' | 'balanced' | 'high' : 'balanced';
          const source = matches[4] ? cleanField(matches[4]) : 'Imported data';

          if (location && !isNaN(dom) && !isNaN(stl)) {
            saveCustomSnapshot({
              location,
              medianDOM: dom,
              saleToListRatio: stl,
              inventorySignal: ['low', 'balanced', 'high'].includes(inventory) ? inventory : 'balanced',
              lastUpdated: new Date().toISOString().split('T')[0],
              sourceLabel: source,
            });
            successCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      });
    }

    refreshSnapshots();
    setImportResults({ success: successCount, failed: failedCount });
    
    if (successCount > 0) {
      toast({
        title: "Import complete",
        description: `${successCount} snapshot(s) imported${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      });
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-snapshot-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isCustomSnapshot = (id: string) => id.startsWith('custom-');

  const getInventoryBadge = (signal: 'low' | 'balanced' | 'high') => {
    switch (signal) {
      case 'low':
        return <Badge variant="destructive" className="text-xs">Low Inventory</Badge>;
      case 'high':
        return <Badge variant="success" className="text-xs">High Inventory</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Balanced</Badge>;
    }
  };

  const seededCount = snapshots.filter(s => !isCustomSnapshot(s.id)).length;
  const customCount = snapshots.filter(s => isCustomSnapshot(s.id)).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Database className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Market Data</h1>
                  <p className="text-sm text-primary-foreground/70">
                    {snapshots.length} market{snapshots.length !== 1 ? 's' : ''} • {seededCount} built-in, {customCount} custom
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setImportDialogOpen(true)}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button 
                variant="accent" 
                size="sm" 
                onClick={() => { resetForm(); setAddDialogOpen(true); }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Market
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Info Card */}
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">About Market Snapshots</p>
                  <p className="text-xs text-muted-foreground">
                    Market snapshots provide town-level context for reports. They are derived from 
                    public market trend research and are not property-specific valuations. 
                    When a report is generated for a location with a snapshot, it uses this data 
                    to anchor assumptions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generic Baseline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Generic Baseline (Fallback)
              </CardTitle>
              <CardDescription>
                Used when no market-specific snapshot exists for a location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Median DOM</p>
                  <p className="text-lg font-semibold">{GENERIC_BASELINE.medianDOM}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Sale-to-List</p>
                  <p className="text-lg font-semibold">{(GENERIC_BASELINE.saleToListRatio * 100).toFixed(0)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Inventory</p>
                  <p className="text-lg font-semibold capitalize">{GENERIC_BASELINE.inventorySignal}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Snapshots List */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground px-1">All Markets</h3>
            <AnimatePresence mode="popLayout">
              {snapshots.map((snapshot, index) => (
                <motion.div
                  key={snapshot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="group">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-secondary/50">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium">{snapshot.location}</p>
                              {isCustomSnapshot(snapshot.id) && (
                                <Badge variant="outline" className="text-[10px] h-5">Custom</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {snapshot.medianDOM} DOM
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {(snapshot.saleToListRatio * 100).toFixed(0)}% S/L
                              </span>
                              {getInventoryBadge(snapshot.inventorySignal)}
                            </div>
                          </div>
                        </div>
                        {isCustomSnapshot(snapshot.id) && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleEdit(snapshot)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleDeleteClick(snapshot.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Market Snapshot' : 'Add Market Snapshot'}</DialogTitle>
            <DialogDescription>
              Enter market trend data for a city or town. This data will be used to anchor report assumptions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location (City, State) *</Label>
              <Input
                id="location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g., Portland, ME"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dom">Median Days on Market *</Label>
                <Input
                  id="dom"
                  type="number"
                  value={formDOM}
                  onChange={(e) => setFormDOM(e.target.value)}
                  placeholder="35"
                  min={1}
                  max={365}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stl">Sale-to-List Ratio *</Label>
                <Input
                  id="stl"
                  type="number"
                  step="0.01"
                  value={formSaleToList}
                  onChange={(e) => setFormSaleToList(e.target.value)}
                  placeholder="0.98"
                  min={0.5}
                  max={1.5}
                />
                <p className="text-[10px] text-muted-foreground">1.00 = 100% of list price</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inventory Signal</Label>
              <Select value={formInventory} onValueChange={(v: 'low' | 'balanced' | 'high') => setFormInventory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Seller's Market)</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="high">High (Buyer's Market)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source Label (optional)</Label>
              <Input
                id="source"
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                placeholder="Public market data"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOrUpdate}>
              {editingId ? 'Update' : 'Add'} Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) {
          setImportText('');
          setImportResults(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Market Data</DialogTitle>
            <DialogDescription>
              Paste CSV or JSON data to import multiple market snapshots at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>
            </div>
            <div className="space-y-2">
              <Label>CSV or JSON Data</Label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`Paste CSV like:\nlocation,medianDOM,saleToListRatio,inventorySignal,sourceLabel\n"Portland, ME",42,0.97,balanced,Public market data`}
                className="min-h-[200px] font-mono text-xs"
              />
            </div>
            {importResults && (
              <div className="flex items-center gap-2 text-sm">
                {importResults.success > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {importResults.success} imported
                  </span>
                )}
                {importResults.failed > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {importResults.failed} failed
                  </span>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importText.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the custom market snapshot. Built-in snapshots cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketData;
