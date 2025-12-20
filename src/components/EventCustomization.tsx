import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload, Video, Instagram, Facebook, Twitter, Globe, Linkedin, Youtube, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { TicketTiersManager } from './TicketTiersManager';

interface FAQ {
  question: string;
  answer: string;
}

interface ScheduleItem {
  time: string;
  title: string;
  description: string;
}

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

interface Sponsor {
  name: string;
  logoUrl: string;
  websiteUrl?: string;
}

interface EventCustomizationProps {
  eventId: string;
  userId: string;
  isFreeEvent?: boolean;
  initialData?: {
    galleryImages?: string[];
    videos?: string[];
    faq?: FAQ[];
    schedule?: ScheduleItem[];
    additionalInfo?: string;
    socialLinks?: SocialLinks;
    sponsors?: Sponsor[];
    upiId?: string;
    paymentQrImageUrl?: string;
  };
}

export const EventCustomization = ({ eventId, userId, isFreeEvent = true, initialData }: EventCustomizationProps) => {
  const [galleryImages, setGalleryImages] = useState<string[]>(initialData?.galleryImages || []);
  const [videos, setVideos] = useState<string[]>(initialData?.videos || []);
  const [faq, setFaq] = useState<FAQ[]>(initialData?.faq || []);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialData?.schedule || []);
  const [additionalInfo, setAdditionalInfo] = useState(initialData?.additionalInfo || '');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(initialData?.socialLinks || {});
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialData?.sponsors || []);
  const [upiId, setUpiId] = useState(initialData?.upiId || '');
  const [paymentQrImageUrl, setPaymentQrImageUrl] = useState(initialData?.paymentQrImageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxGalleryImages = 10;
    if (galleryImages.length + files.length > maxGalleryImages) {
      toast.error(`Maximum ${maxGalleryImages} gallery images allowed`);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" is too large. Maximum size is 5MB`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" has invalid type. Only JPEG, PNG, GIF, and WebP images are allowed`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${userId}/gallery/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setGalleryImages([...galleryImages, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded!`);
    } catch (error: any) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  // Video handling
  const extractVideoEmbed = (url: string): string | null => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
  };

  const addVideo = () => {
    if (!newVideoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    if (videos.length >= 5) {
      toast.error('Maximum 5 videos allowed');
      return;
    }

    const embedUrl = extractVideoEmbed(newVideoUrl);
    if (!embedUrl) {
      toast.error('Please enter a valid YouTube or Vimeo URL');
      return;
    }

    if (videos.includes(embedUrl)) {
      toast.error('This video is already added');
      return;
    }

    setVideos([...videos, embedUrl]);
    setNewVideoUrl('');
    toast.success('Video added!');
  };

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  // FAQ handling
  const addFAQ = () => {
    setFaq([...faq, { question: '', answer: '' }]);
  };

  const updateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faq];
    updated[index][field] = value;
    setFaq(updated);
  };

  const removeFAQ = (index: number) => {
    setFaq(faq.filter((_, i) => i !== index));
  };

  // Schedule handling
  const addScheduleItem = () => {
    setSchedule([...schedule, { time: '', title: '', description: '' }]);
  };

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: string) => {
    const updated = [...schedule];
    updated[index][field] = value;
    setSchedule(updated);
  };

  const removeScheduleItem = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  // Social links handling
  const updateSocialLink = (platform: keyof SocialLinks, value: string) => {
    setSocialLinks({ ...socialLinks, [platform]: value });
  };

  // Sponsor handling
  const handleSponsorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

    if (file.size > maxSize) {
      toast.error('Logo is too large. Maximum size is 2MB');
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/sponsors/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      const updated = [...sponsors];
      updated[index].logoUrl = publicUrl;
      setSponsors(updated);
      toast.success('Sponsor logo uploaded!');
    } catch (error: any) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const addSponsor = () => {
    if (sponsors.length >= 20) {
      toast.error('Maximum 20 sponsors allowed');
      return;
    }
    setSponsors([...sponsors, { name: '', logoUrl: '', websiteUrl: '' }]);
  };

  const updateSponsor = (index: number, field: keyof Sponsor, value: string) => {
    const updated = [...sponsors];
    updated[index][field] = value;
    setSponsors(updated);
  };

  const removeSponsor = (index: number) => {
    setSponsors(sponsors.filter((_, i) => i !== index));
  };

  const handlePaymentQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      toast.error('File is too large. Maximum size is 2MB');
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/payment-qr/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      setPaymentQrImageUrl(publicUrl);
      toast.success('Payment QR Code uploaded!');
    } catch (error: any) {
      toast.error('Failed to upload QR Code');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          gallery_images: galleryImages,
          videos: videos,
          faq: faq.filter(f => f.question && f.answer) as any,
          schedule: schedule.filter(s => s.time && s.title) as any,
          additional_info: additionalInfo,
          social_links: socialLinks as any,
          sponsors: sponsors.filter(s => s.name && s.logoUrl) as any
        })
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Event customization saved!');
    } catch (error: any) {
      toast.error('Failed to save customization');
    }
  };

  return (
    <div className="space-y-6">
      {/* Ticket Tiers */}
      <TicketTiersManager eventId={eventId} isFreeEvent={isFreeEvent} />

      {!isFreeEvent && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID (VPA)</Label>
              <Input
                id="upiId"
                placeholder="e.g. merchant@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a UPI ID where customers can send payments directly.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Custom Payment QR Code</Label>
              {paymentQrImageUrl ? (
                <div className="flex flex-col items-start gap-4">
                  <img
                    src={paymentQrImageUrl}
                    alt="Payment QR"
                    className="w-48 h-48 object-contain border rounded-lg bg-white p-2"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('qr-upload')?.click()}>
                      Change Image
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPaymentQrImageUrl('')} className="text-destructive">
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a screenshot of your payment QR code (GPay, PhonePe, Paytm etc)
                  </p>
                  <Button variant="outline" onClick={() => document.getElementById('qr-upload')?.click()}>
                    Upload QR Image
                  </Button>
                </div>
              )}
              <Input
                id="qr-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePaymentQrUpload}
                disabled={uploading}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Event Gallery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="gallery">Upload Images (max 10)</Label>
            <Input
              id="gallery"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={uploading}
              className="mt-1"
            />
          </div>

          {galleryImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {galleryImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Event Videos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube or Vimeo URL"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addVideo} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add up to 5 videos from YouTube or Vimeo to showcase your event
          </p>

          {videos.length > 0 && (
            <div className="grid gap-4">
              {videos.map((url, index) => (
                <div key={index} className="relative">
                  <div className="aspect-video rounded-lg overflow-hidden border-2 border-border">
                    <iframe
                      src={url}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`Event video ${index + 1}`}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeVideo(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Social Media & Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Instagram className="w-5 h-5 text-pink-500" />
              <Input
                placeholder="Instagram URL (e.g., https://instagram.com/yourevent)"
                value={socialLinks.instagram || ''}
                onChange={(e) => updateSocialLink('instagram', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Facebook className="w-5 h-5 text-blue-600" />
              <Input
                placeholder="Facebook URL (e.g., https://facebook.com/yourevent)"
                value={socialLinks.facebook || ''}
                onChange={(e) => updateSocialLink('facebook', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Twitter className="w-5 h-5 text-sky-500" />
              <Input
                placeholder="Twitter/X URL (e.g., https://twitter.com/yourevent)"
                value={socialLinks.twitter || ''}
                onChange={(e) => updateSocialLink('twitter', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Linkedin className="w-5 h-5 text-blue-700" />
              <Input
                placeholder="LinkedIn URL"
                value={socialLinks.linkedin || ''}
                onChange={(e) => updateSocialLink('linkedin', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Youtube className="w-5 h-5 text-red-600" />
              <Input
                placeholder="YouTube Channel URL"
                value={socialLinks.youtube || ''}
                onChange={(e) => updateSocialLink('youtube', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Website URL"
                value={socialLinks.website || ''}
                onChange={(e) => updateSocialLink('website', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>FAQ</CardTitle>
            <Button variant="outline" size="sm" onClick={addFAQ}>
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {faq.map((item, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Question"
                    value={item.question}
                    onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                  />
                  <Textarea
                    placeholder="Answer"
                    value={item.answer}
                    onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFAQ(index)}
                  className="ml-2"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {faq.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No FAQ added yet. Click "Add FAQ" to add questions and answers.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Event Schedule</CardTitle>
            <Button variant="outline" size="sm" onClick={addScheduleItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedule.map((item, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    type="time"
                    placeholder="Time"
                    value={item.time}
                    onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
                  />
                  <Input
                    placeholder="Title"
                    value={item.title}
                    onChange={(e) => updateScheduleItem(index, 'title', e.target.value)}
                  />
                  <Textarea
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateScheduleItem(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScheduleItem(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {schedule.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No schedule items added yet. Click "Add Schedule Item" to create your event timeline.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional information about the event (dress code, parking info, special instructions, etc.)"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            rows={5}
          />
        </CardContent>
      </Card>

      {/* Sponsors */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Event Sponsors
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addSponsor}>
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sponsors.map((sponsor, index) => (
            <div key={index} className="space-y-3 p-4 border rounded-lg">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Sponsor Name</Label>
                    <Input
                      placeholder="e.g., Acme Corp"
                      value={sponsor.name}
                      onChange={(e) => updateSponsor(index, 'name', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Logo</Label>
                    {sponsor.logoUrl ? (
                      <div className="flex items-center gap-3 mt-1">
                        <img
                          src={sponsor.logoUrl}
                          alt={sponsor.name || 'Sponsor logo'}
                          className="h-16 w-auto max-w-[200px] object-contain border rounded p-1 bg-background"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSponsor(index, 'logoUrl', '')}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSponsorLogoUpload(e, index)}
                        disabled={uploading}
                        className="mt-1"
                      />
                    )}
                  </div>

                  <div>
                    <Label>Website URL (optional)</Label>
                    <Input
                      placeholder="https://sponsor-website.com"
                      value={sponsor.websiteUrl || ''}
                      onChange={(e) => updateSponsor(index, 'websiteUrl', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSponsor(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {sponsors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sponsors added yet. Click "Add Sponsor" to showcase your event partners.
            </p>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" size="lg" variant="cyber">
        Save Customization
      </Button>
    </div>
  );
};
