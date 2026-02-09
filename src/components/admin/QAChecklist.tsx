import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';

interface QAItem {
  id: string;
  label: string;
  category: string;
}

const QA_ITEMS: QAItem[] = [
  { id: 'cash_dp', label: 'Cash offer removes down payment everywhere (report tiles, scenario explorer, input flow)', category: 'Cash Logic' },
  { id: 'contingencies_wrap', label: 'Contingencies wrap cleanly on iPhone (no hyphenation, comma-separated)', category: 'Mobile UI' },
  { id: 'buyer_header', label: 'No text clipped on iPhone in Buyer Report header', category: 'Mobile UI' },
  { id: 'offer_tiles', label: 'No text clipped on iPhone in Offer Details tiles', category: 'Mobile UI' },
  { id: 'scenario_explorer', label: 'No text clipped on iPhone in Scenario Explorer', category: 'Mobile UI' },
  { id: 'scenario_cta', label: '"Explore Scenarios" CTA does not overlap content', category: 'Mobile UI' },
  { id: 'scenario_safe_area', label: 'Scenario Explorer sheet respects iOS safe area (top & bottom)', category: 'Mobile UI' },
  { id: 'scenario_controls', label: 'Apply Changes and Reset buttons always visible in Scenario Explorer', category: 'Mobile UI' },
  { id: 'address_town_mode', label: 'Location mode toggle (Town/Address) works in buyer flow', category: 'Address Input' },
  { id: 'address_fallback', label: 'Address mode: if geocode fails, town fallback works', category: 'Address Input' },
  { id: 'address_privacy', label: 'Full address hidden in shared/client views', category: 'Address Input' },
  { id: 'pills_wrap', label: 'Pill tags/chips wrap to next line on mobile', category: 'Mobile UI' },
  { id: 'currency_overflow', label: 'Currency and numbers do not overflow containers on mobile', category: 'Mobile UI' },
];

const STORAGE_KEY = 'qa_checklist_state';

export function QAChecklist() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  const handleToggle = (id: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [id]: checked }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = QA_ITEMS.length;
  const categories = [...new Set(QA_ITEMS.map(i => i.category))];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5 text-accent" />
          QA Checklist
          <Badge variant={completedCount === totalCount ? 'success' : 'secondary'} className="ml-auto">
            {completedCount}/{totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map(category => (
          <div key={category}>
            <p className="text-xs font-medium text-muted-foreground mb-2">{category}</p>
            <div className="space-y-2">
              {QA_ITEMS.filter(i => i.category === category).map(item => (
                <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`qa-${item.id}`}
                    checked={!!checkedItems[item.id]}
                    onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
                    className="mt-0.5 shrink-0"
                  />
                  <label
                    htmlFor={`qa-${item.id}`}
                    className={`text-sm cursor-pointer ${checkedItems[item.id] ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={() => setCheckedItems({})}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Reset all
        </button>
      </CardContent>
    </Card>
  );
}
