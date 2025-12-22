import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { 
  ArrowLeft, 
  ChevronDown, 
  Sparkles, 
  UtensilsCrossed, 
  Shield, 
  Zap,
  Plus,
  Trash2
} from 'lucide-react';

interface Highlight {
  icon: string;
  text: string;
}

interface MenuItem {
  name: string;
  description: string;
}

interface MenuDetails {
  items: MenuItem[];
  disclaimer: string;
}

const HIGHLIGHT_ICONS = [
  { value: 'music', label: '🎵 Music' },
  { value: 'drink', label: '🍹 Drinks' },
  { value: 'food', label: '🍕 Food' },
  { value: 'parking', label: '🅿️ Parking' },
  { value: 'vip', label: '⭐ VIP' },
  { value: 'photo', label: '📸 Photo' },
  { value: 'wifi', label: '📶 WiFi' },
  { value: 'gift', label: '🎁 Gift' },
];

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    eventDate: '',
    promotionText: '',
    isFree: true,
    ticketPrice: '0',
    capacity: '',
    category: '',
    tags: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Optional enhancement sections
  const [openSections, setOpenSections] = useState({
    highlights: false,
    menu: false,
    rules: false,
    earlyBird: false
  });

  // Highlights state
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  
  // Menu state
  const [menuDetails, setMenuDetails] = useState<MenuDetails>({
    items: [],
    disclaimer: ''
  });
  
  // Rules state
  const [eventRules, setEventRules] = useState<string[]>([]);
  
  // Early bird state
  const [earlyBirdEnabled, setEarlyBirdEnabled] = useState(false);
  const [earlyBirdEndDate, setEarlyBirdEndDate] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File too large. Maximum size is 5MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(file);
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Highlights handlers
  const addHighlight = () => {
    setHighlights([...highlights, { icon: 'music', text: '' }]);
  };

  const updateHighlight = (index: number, field: keyof Highlight, value: string) => {
    const updated = [...highlights];
    updated[index][field] = value;
    setHighlights(updated);
  };

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  // Menu handlers
  const addMenuItem = () => {
    setMenuDetails({
      ...menuDetails,
      items: [...menuDetails.items, { name: '', description: '' }]
    });
  };

  const updateMenuItem = (index: number, field: keyof MenuItem, value: string) => {
    const updated = [...menuDetails.items];
    updated[index][field] = value;
    setMenuDetails({ ...menuDetails, items: updated });
  };

  const removeMenuItem = (index: number) => {
    setMenuDetails({
      ...menuDetails,
      items: menuDetails.items.filter((_, i) => i !== index)
    });
  };

  // Rules handlers
  const addRule = () => {
    setEventRules([...eventRules, '']);
  };

  const updateRule = (index: number, value: string) => {
    const updated = [...eventRules];
    updated[index] = value;
    setEventRules(updated);
  };

  const removeRule = (index: number) => {
    setEventRules(eventRules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
        const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Filter out empty values
      const filteredHighlights = highlights.filter(h => h.text.trim());
      const filteredRules = eventRules.filter(r => r.trim());
      const filteredMenu = menuDetails.items.length > 0 || menuDetails.disclaimer ? {
        items: menuDetails.items.filter(m => m.name.trim()),
        disclaimer: menuDetails.disclaimer
      } : null;

      const { error } = await (supabase as any).from('events').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        venue: formData.venue,
        event_date: formData.eventDate,
        promotion_text: formData.promotionText,
        is_free: formData.isFree,
        ticket_price: formData.isFree ? 0 : parseFloat(formData.ticketPrice),
        image_url: imageUrl,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        currency: 'INR',
        // New optional fields
        highlights: filteredHighlights.length > 0 ? filteredHighlights : [],
        menu_details: filteredMenu,
        event_rules: filteredRules,
        early_bird_end_date: earlyBirdEnabled && earlyBirdEndDate ? earlyBirdEndDate : null,
        original_price: earlyBirdEnabled && originalPrice ? parseFloat(originalPrice) : null
      });

      if (error) throw error;

      toast.success('Event created successfully!');
      navigate('/events');
    } catch (error: any) {
      console.error('Create event error:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="border-2 border-primary/20 shadow-neon-cyan">
          <CardHeader>
            <CardTitle className="text-3xl text-gradient-cyber">Create New Event</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="venue">Venue Address</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Full address for Google Maps"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image">Event Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border-2 border-border"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate">Event Date</Label>
                <Input
                  id="eventDate"
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  required
                />
              </div>

              {/* Ticket Type Section */}
              <div className="space-y-2">
                <Label>Ticket Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ticketType"
                      value="free"
                      checked={formData.isFree}
                      onChange={() => setFormData({ ...formData, isFree: true, ticketPrice: '0' })}
                      className="w-4 h-4"
                    />
                    <span>Free Event</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ticketType"
                      value="paid"
                      checked={!formData.isFree}
                      onChange={() => setFormData({ ...formData, isFree: false })}
                      className="w-4 h-4"
                    />
                    <span>Paid Event</span>
                  </label>
                </div>
              </div>

              {!formData.isFree && (
                <div className="space-y-2">
                  <Label htmlFor="ticketPrice">Standard Ticket Price (₹)</Label>
                  <Input
                    id="ticketPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ticketPrice}
                    onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                    placeholder="0.00"
                    required={!formData.isFree}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can add different Ticket Tiers and configure Payment Details in the "Customize Event" page after creating the event.
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Total Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    <option value="Concert">Concert</option>
                    <option value="Conference">Conference</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Meetup">Meetup</option>
                    <option value="Party">Party</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Music, Tech, VIP (comma separated)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotionText">Promotion Text</Label>
                <Input
                  id="promotionText"
                  value={formData.promotionText}
                  onChange={(e) => setFormData({ ...formData, promotionText: e.target.value })}
                  placeholder="e.g., Early bird discount 20% off!"
                />
              </div>

              {/* Optional Enhancement Sections */}
              <div className="space-y-3 pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground">Optional Enhancements</p>

                {/* Event Highlights */}
                <Collapsible open={openSections.highlights} onOpenChange={() => toggleSection('highlights')}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Event Highlights
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSections.highlights ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Add key perks and highlights for your event</p>
                    {highlights.map((highlight, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <select
                          value={highlight.icon}
                          onChange={(e) => updateHighlight(index, 'icon', e.target.value)}
                          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {HIGHLIGHT_ICONS.map(icon => (
                            <option key={icon.value} value={icon.value}>{icon.label}</option>
                          ))}
                        </select>
                        <Input
                          placeholder="e.g., Welcome drinks included"
                          value={highlight.text}
                          onChange={(e) => updateHighlight(index, 'text', e.target.value)}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeHighlight(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addHighlight}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Highlight
                    </Button>
                  </CollapsibleContent>
                </Collapsible>

                {/* Menu & Amenities */}
                <Collapsible open={openSections.menu} onOpenChange={() => toggleSection('menu')}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-primary" />
                        Menu & Amenities
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSections.menu ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Add food/drink menu items (optional)</p>
                    {menuDetails.items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Item name (e.g., Starter Platter)"
                            value={item.name}
                            onChange={(e) => updateMenuItem(index, 'name', e.target.value)}
                          />
                          <Input
                            placeholder="Description (optional)"
                            value={item.description}
                            onChange={(e) => updateMenuItem(index, 'description', e.target.value)}
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMenuItem(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addMenuItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Menu Item
                    </Button>
                    <div className="pt-2">
                      <Label>Menu Disclaimer</Label>
                      <Textarea
                        placeholder="e.g., Menu subject to change. Vegetarian options available."
                        value={menuDetails.disclaimer}
                        onChange={(e) => setMenuDetails({ ...menuDetails, disclaimer: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Event Rules */}
                <Collapsible open={openSections.rules} onOpenChange={() => toggleSection('rules')}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Event Rules & Restrictions
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSections.rules ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Add rules like age limits, dress code, etc.</p>
                    {eventRules.map((rule, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="e.g., Entry only for 21+ with valid ID"
                          value={rule}
                          onChange={(e) => updateRule(index, e.target.value)}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRule(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addRule}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rule
                    </Button>
                  </CollapsibleContent>
                </Collapsible>

                {/* Early Bird Pricing */}
                {!formData.isFree && (
                  <Collapsible open={openSections.earlyBird} onOpenChange={() => toggleSection('earlyBird')}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          Early Bird Pricing
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${openSections.earlyBird ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={earlyBirdEnabled}
                          onCheckedChange={setEarlyBirdEnabled}
                        />
                        <Label>Enable Early Bird Pricing</Label>
                      </div>
                      {earlyBirdEnabled && (
                        <div className="space-y-3 pt-2">
                          <div className="space-y-2">
                            <Label>Original Price (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={originalPrice}
                              onChange={(e) => setOriginalPrice(e.target.value)}
                              placeholder="Original price before discount"
                            />
                            <p className="text-xs text-muted-foreground">
                              This will be shown as strikethrough to highlight the discount
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Early Bird Ends On</Label>
                            <Input
                              type="datetime-local"
                              value={earlyBirdEndDate}
                              onChange={(e) => setEarlyBirdEndDate(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              <Button type="submit" variant="cyber" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Event'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEvent;