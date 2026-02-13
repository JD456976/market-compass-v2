import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Ruler, Calendar, Flame, Snowflake, Car, Layers, School, Building } from 'lucide-react';

interface PropertyDetailsCardProps {
  details: Record<string, string>;
}

const DETAIL_CONFIG: { key: string; label: string; icon: React.ComponentType<{ className?: string }>; format?: (v: string) => string }[] = [
  { key: 'mlsNumber', label: 'MLS#', icon: Building },
  { key: 'style', label: 'Style', icon: Home },
  { key: 'bedrooms', label: 'Bedrooms', icon: Home, format: (v) => `${v} BR` },
  { key: 'bathsFull', label: 'Bathrooms', icon: Home, format: (v) => `${v} Full` },
  { key: 'squareFeet', label: 'Living Area', icon: Ruler, format: (v) => `${parseInt(v).toLocaleString()} sqft` },
  { key: 'lotSize', label: 'Lot Size', icon: Layers },
  { key: 'yearBuilt', label: 'Year Built', icon: Calendar },
  { key: 'totalRooms', label: 'Total Rooms', icon: Home },
  { key: 'heating', label: 'Heating', icon: Flame },
  { key: 'cooling', label: 'Cooling', icon: Snowflake },
  { key: 'parking', label: 'Parking', icon: Car },
  { key: 'foundation', label: 'Foundation', icon: Layers },
  { key: 'basement', label: 'Basement', icon: Layers },
  { key: 'construction', label: 'Construction', icon: Building },
  { key: 'taxAmount', label: 'Annual Tax', icon: Building, format: (v) => `$${parseInt(v).toLocaleString()}` },
  { key: 'schools', label: 'Schools', icon: School },
];

export function PropertyDetailsCard({ details }: PropertyDetailsCardProps) {
  if (!details || Object.keys(details).length === 0) return null;

  const visibleDetails = DETAIL_CONFIG.filter(d => details[d.key]);

  return (
    <Card className="pdf-section pdf-avoid-break overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-accent/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-accent" />
          Property Details
          {details.mlsNumber && (
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              MLS# {details.mlsNumber}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visibleDetails.filter(d => d.key !== 'mlsNumber' && d.key !== 'schools').map(({ key, label, icon: Icon, format }) => (
            <div key={key} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30">
              <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-sm font-medium truncate">{format ? format(details[key]) : details[key]}</p>
              </div>
            </div>
          ))}
        </div>
        {details.schools && (
          <div className="mt-3 p-2.5 rounded-lg bg-secondary/30 flex items-start gap-2">
            <School className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Schools</p>
              <p className="text-xs">{details.schools}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
