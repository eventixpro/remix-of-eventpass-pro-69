import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { EventCustomization } from '@/components/EventCustomization';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/errorHandler';

const EventCustomizationPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !eventId) {
      navigate('/auth');
      return;
    }

    fetchEvent();
  }, [user, eventId, navigate]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Event not found or access denied');
        navigate('/events');
        return;
      }

      setEvent(data);
    } catch (error: any) {
      console.error('Load event error:', error);
      toast.error(getUserFriendlyError(error));
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading event...</div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/events')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Events
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gradient-cyber mb-2">Customize Event</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>

        <EventCustomization
          eventId={eventId!}
          userId={user?.id!}
          isFreeEvent={event.is_free}
          initialData={{
            galleryImages: event.gallery_images || [],
            videos: event.videos || [],
            faq: event.faq || [],
            schedule: event.schedule || [],
            additionalInfo: event.additional_info || '',
            socialLinks: event.social_links || {},
            sponsors: event.sponsors || [],
            upiId: event.upi_id || '',
            paymentQrImageUrl: event.payment_qr_image_url || ''
          }}
        />
      </div>
    </div>
  );
};

export default EventCustomizationPage;
