import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { ArrowLeft } from 'lucide-react';

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File too large. Maximum size is 5MB');
        return;
      }

      // Validate MIME type
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      let imageUrl = null;

      // Upload event image if selected
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
        currency: 'INR'
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

              {/* ... Ticket Type Section ... */}
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
                {/* Capacity, Category, Tags from before */}
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