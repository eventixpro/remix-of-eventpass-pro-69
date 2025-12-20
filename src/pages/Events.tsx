import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, MapPin, Ticket, QrCode, Share2, ExternalLink, Settings, Download, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import QRCodeDialog from '@/components/QRCodeDialog';

const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const PUBLIC_BASE_URL = (import.meta as any).env?.VITE_PUBLIC_SITE_URL || window.location.origin;

  useEffect(() => {
    if (!user) return;

    const fetchEvents = async () => {
      const { data } = await (supabase as any)
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: false });

      if (data) setEvents(data);
    };

    fetchEvents();
  }, [user]);

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h1 className="text-4xl font-bold text-gradient-cyber">My Events</h1>
          <Button onClick={() => navigate('/global-tickets')} variant="cyber" className="w-full md:w-auto">
            <Ticket className="w-4 h-4 mr-2" />
            Global Ticket Database
          </Button>
        </div>

        {/* Public Events Link Card */}
        <Card className="mb-8 border-2 border-primary/30 bg-gradient-to-r from-card to-card/80">
          <CardContent className="py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-bold mb-1">Public Events Page</h3>
                <p className="text-sm text-muted-foreground">
                  Share this link with attendees to view and claim tickets
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `${PUBLIC_BASE_URL}/public-events`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied!');
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    const url = `${PUBLIC_BASE_URL}/public-events`;
                    window.open(url, '_blank', 'noopener');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Public Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-neon-cyan">
              <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(event.event_date), 'PPP')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  {event.venue}
                </p>


                {/* Public Event QR Code */}
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 rounded-lg p-4 flex flex-col items-center gap-3 hover:border-primary/40 transition-all">
                  <p className="text-sm font-medium text-muted-foreground">Public Event QR</p>
                  <div className="bg-white p-2 rounded-lg shadow-md">
                    <QRCodeSVG
                      value={`${PUBLIC_BASE_URL}/e/${event.id}`}
                      size={100}
                      level="H"
                    />
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedEvent(event);
                        setQrDialogOpen(true);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const url = `${PUBLIC_BASE_URL}/e/${event.id}`;
                        if (navigator.share) {
                          navigator.share({ url });
                        } else {
                          navigator.clipboard.writeText(url);
                          toast.success('Link copied to clipboard!');
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Link to={`/event/${event.id}/tickets`} className="flex-1">
                      <Button variant="default" className="w-full">
                        <Ticket className="w-4 h-4 mr-2" />
                        Tickets
                      </Button>
                    </Link>
                    <Link to={`/e/${event.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <QrCode className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                  <Link to={`/event/${event.id}/customize`} className="w-full block">
                    <Button variant="secondary" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Customize Event Page
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* QR Code Dialog */}
        {selectedEvent && (
          <QRCodeDialog
            open={qrDialogOpen}
            onOpenChange={setQrDialogOpen}
            url={`${PUBLIC_BASE_URL}/e/${selectedEvent.id}`}
            title={selectedEvent.title}
          />
        )}
      </div>
    </div>
  );
};

export default Events;