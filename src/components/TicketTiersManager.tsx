import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Ticket, IndianRupee, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface TicketTier {
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  capacity: number | null;
  tickets_sold?: number;
  is_active: boolean;
  sort_order: number;
  benefits: string[];
  original_price: number | null;
  is_early_bird: boolean;
}

interface TicketTiersManagerProps {
  eventId: string;
  isFreeEvent: boolean;
}

export const TicketTiersManager = ({ eventId, isFreeEvent }: TicketTiersManagerProps) => {
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTiers();
  }, [eventId]);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
      toast.error('Failed to load ticket tiers');
    } finally {
      setLoading(false);
    }
  };

  const addTier = () => {
    const newTier: TicketTier = {
      name: '',
      description: '',
      price: isFreeEvent ? 0 : 100,
      currency: 'INR',
      capacity: null,
      is_active: true,
      sort_order: tiers.length,
      benefits: [],
      original_price: null,
      is_early_bird: false
    };
    setTiers([...tiers, newTier]);
  };

  const updateTier = (index: number, field: keyof TicketTier, value: any) => {
    const updated = [...tiers];
    (updated[index] as any)[field] = value;
    setTiers(updated);
  };

  const removeTier = async (index: number) => {
    const tier = tiers[index];
    if (tier.id) {
      // Check if tier has tickets
      if (tier.tickets_sold && tier.tickets_sold > 0) {
        toast.error('Cannot delete tier with existing tickets');
        return;
      }

      try {
        const { error } = await supabase
          .from('ticket_tiers')
          .delete()
          .eq('id', tier.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting tier:', error);
        toast.error('Failed to delete tier');
        return;
      }
    }
    setTiers(tiers.filter((_, i) => i !== index));
    toast.success('Tier removed');
  };

  const saveTiers = async () => {
    setSaving(true);
    try {
      // Validate tiers
      for (const tier of tiers) {
        if (!tier.name.trim()) {
          toast.error('All tiers must have a name');
          setSaving(false);
          return;
        }
        if (tier.price < 0) {
          toast.error('Price cannot be negative');
          setSaving(false);
          return;
        }
      }

      // Separate new and existing tiers
      const newTiers = tiers.filter(t => !t.id);
      const existingTiers = tiers.filter(t => t.id);

      // Update existing tiers
      for (const tier of existingTiers) {
        const { error } = await supabase
          .from('ticket_tiers')
          .update({
            name: tier.name.trim(),
            description: tier.description?.trim() || null,
            price: tier.price,
            currency: tier.currency,
            capacity: tier.capacity,
            is_active: tier.is_active,
            sort_order: tier.sort_order,
            benefits: tier.benefits || [],
            original_price: tier.original_price,
            is_early_bird: tier.is_early_bird
          })
          .eq('id', tier.id);

        if (error) throw error;
      }

      // Insert new tiers
      if (newTiers.length > 0) {
        const { error } = await supabase
          .from('ticket_tiers')
          .insert(
            newTiers.map(t => ({
              event_id: eventId,
              name: t.name.trim(),
              description: t.description?.trim() || null,
              price: t.price,
              currency: t.currency,
              capacity: t.capacity,
              is_active: t.is_active,
              sort_order: t.sort_order,
              benefits: t.benefits || [],
              original_price: t.original_price,
              is_early_bird: t.is_early_bird
            }))
          );

        if (error) throw error;
      }

      toast.success('Ticket tiers saved successfully!');
      fetchTiers(); // Refresh to get IDs
    } catch (error) {
      console.error('Error saving tiers:', error);
      toast.error('Failed to save ticket tiers');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading ticket tiers...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Ticket Tiers & Pricing
            </CardTitle>
            <CardDescription className="mt-1">
              Create different ticket options with various prices and capacities
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addTier}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tiers.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              No ticket tiers created yet. Add tiers to offer different pricing options.
            </p>
            <Button onClick={addTier}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Tier
            </Button>
          </div>
        ) : (
          <>
            {tiers.map((tier, index) => (
              <div 
                key={tier.id || `new-${index}`} 
                className="p-4 border rounded-lg space-y-4 bg-card"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    <span className="font-medium">Tier {index + 1}</span>
                    {tier.tickets_sold && tier.tickets_sold > 0 && (
                      <Badge variant="secondary">
                        {tier.tickets_sold} sold
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tier.is_active}
                        onCheckedChange={(checked) => updateTier(index, 'is_active', checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTier(index)}
                      disabled={tier.tickets_sold && tier.tickets_sold > 0}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tier Name *</Label>
                    <Input
                      placeholder="e.g., VIP, Early Bird, General"
                      value={tier.name}
                      onChange={(e) => updateTier(index, 'name', e.target.value)}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={tier.price}
                        onChange={(e) => updateTier(index, 'price', parseFloat(e.target.value) || 0)}
                        className="pl-9"
                        disabled={isFreeEvent}
                      />
                    </div>
                    {isFreeEvent && (
                      <p className="text-xs text-muted-foreground">
                        This is a free event. Tiers are for categorization only.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What's included in this tier? (e.g., Front row seating, VIP lounge access)"
                    value={tier.description}
                    onChange={(e) => updateTier(index, 'description', e.target.value)}
                    rows={2}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Capacity (leave empty for unlimited)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={tier.capacity || ''}
                    onChange={(e) => updateTier(index, 'capacity', e.target.value ? parseInt(e.target.value) : null)}
                  />
                  {tier.capacity && tier.tickets_sold !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {tier.capacity - tier.tickets_sold} remaining
                    </p>
                  )}
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  <Label>Benefits (one per line)</Label>
                  <Textarea
                    placeholder="e.g., Priority entry&#10;Free parking&#10;VIP lounge access"
                    value={(tier.benefits || []).join('\n')}
                    onChange={(e) => updateTier(index, 'benefits', e.target.value.split('\n').filter(b => b.trim()))}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Each line becomes a bullet point on the ticket</p>
                </div>

                {/* Early Bird Pricing */}
                {!isFreeEvent && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={tier.is_early_bird}
                        onCheckedChange={(checked) => updateTier(index, 'is_early_bird', checked)}
                      />
                      <Label className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Early Bird Pricing
                      </Label>
                    </div>
                    {tier.is_early_bird && (
                      <div className="space-y-2">
                        <Label>Original Price (₹)</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Original price (strikethrough)"
                            value={tier.original_price || ''}
                            onChange={(e) => updateTier(index, 'original_price', e.target.value ? parseFloat(e.target.value) : null)}
                            className="pl-9"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Shows as strikethrough to highlight the discount
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <Button onClick={saveTiers} className="w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Ticket Tiers'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
