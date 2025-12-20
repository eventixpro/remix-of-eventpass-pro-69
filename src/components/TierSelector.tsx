import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/safeClient';
import { IndianRupee, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  capacity: number | null;
  tickets_sold: number;
  is_active: boolean;
}

interface TierSelectorProps {
  eventId: string;
  isFreeEvent: boolean;
  selectedTierId: string | null;
  onSelect: (tier: TicketTier | null) => void;
}

export const TierSelector = ({ eventId, isFreeEvent, selectedTierId, onSelect }: TierSelectorProps) => {
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTiers();
  }, [eventId]);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
      
      // Auto-select first tier if only one available
      if (data && data.length === 1) {
        onSelect(data[0]);
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAvailable = (tier: TicketTier) => {
    if (!tier.capacity) return true;
    return tier.tickets_sold < tier.capacity;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-20 bg-muted rounded-lg"></div>
        <div className="h-20 bg-muted rounded-lg"></div>
      </div>
    );
  }

  if (tiers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Select Ticket Type</label>
      <div className="grid gap-3">
        {tiers.map((tier) => {
          const available = isAvailable(tier);
          const isSelected = selectedTierId === tier.id;
          
          return (
            <Card
              key={tier.id}
              className={cn(
                'cursor-pointer transition-all border-2',
                isSelected && 'border-primary bg-primary/5',
                !available && 'opacity-50 cursor-not-allowed',
                available && !isSelected && 'hover:border-primary/50'
              )}
              onClick={() => available && onSelect(isSelected ? null : tier)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{tier.name}</h4>
                      {!available && (
                        <Badge variant="destructive" className="shrink-0">Sold Out</Badge>
                      )}
                      {isSelected && available && (
                        <div className="shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {tier.description}
                      </p>
                    )}
                    {tier.capacity && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Users className="w-3 h-3" />
                        <span>{tier.capacity - tier.tickets_sold} remaining</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {isFreeEvent || tier.price === 0 ? (
                      <span className="text-lg font-bold text-primary">Free</span>
                    ) : (
                      <div className="flex items-center text-lg font-bold">
                        <IndianRupee className="w-4 h-4" />
                        {tier.price.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
