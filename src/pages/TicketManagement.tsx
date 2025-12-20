
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TicketCard } from '@/components/TicketCard';
import { AttendeeList } from '@/components/AttendeeList';
import { EventStats } from '@/components/EventStats';
import { EventCustomization } from '@/components/EventCustomization';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { ArrowLeft, Plus, Ticket as TicketIcon, Users, Settings, Printer, Download, Share2 } from 'lucide-react';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const attendeeSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  email: z.string().trim().email({ message: 'Invalid email address' }).max(255),
  phone: z.string().trim().min(10, { message: 'Phone number must be at least 10 digits' }).max(15)
});

const TicketManagement = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (searchParams.get('openGenerate') === 'true') {
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !eventId) return;

    const fetchEventAndTickets = async () => {
      // Housekeeping: Expire old tickets
      await (supabase as any).rpc('expire_unpaid_tickets');

      // Fetch event
      const { data: eventData, error: eventError } = await (supabase as any)
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('user_id', user.id)
        .single();

      if (eventError || !eventData) {
        toast.error('Event not found or access denied');
        navigate('/events');
        return;
      }

      setEvent(eventData);

      // Fetch tickets
      const { data: ticketsData } = await (supabase as any)
        .from('tickets')
        .select('*, events(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (ticketsData) setTickets(ticketsData);
    };

    fetchEventAndTickets();

    // Subscribe to ticket changes
    const channel = supabase
      .channel('ticket-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `event_id = eq.${eventId} `
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchEventAndTickets();
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev =>
              prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, eventId, navigate]);



  // State to hold and display the newly generated ticket
  const [newlyGeneratedTicket, setNewlyGeneratedTicket] = useState<any>(null);

  const downloadTicketImage = async () => {
    const ticketElement = document.getElementById('new-ticket-card');
    if (!ticketElement) return;


    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(ticketElement, {
        backgroundColor: '#030712', // Force strict dark background (Tailwind gray-950)
        scale: 3, // Higher resolution
        useCORS: true, // For external images (if any)
        logging: false
      });

      const link = document.createElement('a');
      link.download = `Ticket-${newlyGeneratedTicket.ticket_code}.png`;
      link.href = canvas.toDataURL('image/png', 1.0); // Max quality
      link.click();
      toast.success('Ticket image downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download ticket image');
    }
  };

  const printTicket = () => {
    const printContent = document.getElementById('new-ticket-card');
    if (!printContent) return;

    // Create a hidden print window/iframe or just simple window.print methodology 
    // Usually simpler to open a new window for clean print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
            <head>
            <title>Print Ticket</title>
            <style>
                body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; color: #000; }
                #ticket-container { transform: scale(1); }
            </style>
            </head>
            <body>
            <div id="ticket-container">${printContent.outerHTML}</div>
            <script>
                setTimeout(() => {
                    window.print();
                    window.close();
                }, 500);
            </script>
            </body>
        </html>
        `);
      printWindow.document.close();
    }
  };

  const shareTicket = async () => {
    if (!newlyGeneratedTicket) return;
    const ticketUrl = `${window.location.origin} /ticket/${newlyGeneratedTicket.id} `;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket for ${event.title}`,
          text: `Here is your ticket for ${event.title} at ${event.venue}.`,
          url: ticketUrl
        });
        toast.success('Ticket shared successfully');
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      await navigator.clipboard.writeText(ticketUrl);
      toast.success('Ticket URL copied to clipboard');
    }
  };

  // Modify existing generateTicket to update state instead of closing dialog
  /* Override the generateTicket function logic part */
  // NOTE: You will need to replace the original function completely or edit specifically. 
  // Since I am providing a complete block replacement, I will rewrite generateTicket slightly to set state.

  const handleGenerateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = attendeeSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      };

      const section1 = generateId().replace(/-/g, '').substring(0, 8).toUpperCase();
      const section2 = generateId().replace(/-/g, '').substring(0, 8).toUpperCase();
      const ticketCode = `${section1}-${section2}`;

      const { data: ticketData, error } = await (supabase as any).from('tickets').insert({
        event_id: eventId,
        ticket_code: ticketCode,
        attendee_name: formData.name,
        attendee_email: formData.email,
        attendee_phone: formData.phone,
        payment_status: 'paid', // Admin generated = Assumed Paid/Comp
        // payment_ref_id: `MANUAL_${ticketCode}`
      }).select().single();

      if (error) throw error;

      // Construct ticket object for display (mimicking needed structure for TicketCard)
      const paymentRefId = `MANUAL_${ticketCode}`;
      const fullTicket = {
        ...ticketData,
        payment_ref_id: paymentRefId, // Manually attach for display
        events: event // Event Data is available in parent scope
      };

      setNewlyGeneratedTicket(fullTicket);

      // Async email sending (don't await strictly to block UI if not needed, but good to wait for confirmation)
      fetch('/api/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          ticketCode: ticketCode,
          eventTitle: event.title,
          eventDate: new Date(event.event_date).toLocaleDateString(),
          venue: event.venue,
          ticketId: ticketData.id,
          attendeeName: formData.name,
          paymentRefId: paymentRefId // Send to email
        })
      }).catch(err => console.error("Email send warning:", err));

      toast.success('Ticket generated successfully');
      // Do NOT close dialog, instead show success view
    } catch (error: any) {
      console.error('Generate ticket error:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!event) return null;

  const validatedCount = tickets.filter(t => t.is_validated).length;
  const pendingCount = tickets.length - validatedCount;
  const uniqueAttendees = Array.from(new Set(tickets.map(t => t.attendee_email))).length;

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-6xl">
        <Button variant="ghost" onClick={() => navigate('/events')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gradient-cyber mb-2">
              {event.title}
            </h1>
            <p className="text-muted-foreground flex items-center gap-4">
              Event Management Dashboard
              <span className="text-sm">•</span>
              <span className="text-primary font-semibold">{tickets.length} Tickets Created</span>
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="cyber" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Generate Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 border-primary/30 max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl text-gradient-cyber">
                  {newlyGeneratedTicket ? 'Ticket Generated!' : 'Generate New Ticket'}
                </DialogTitle>
              </DialogHeader>

              {!newlyGeneratedTicket ? (
                <form onSubmit={handleGenerateTicket} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Attendee Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Attendee Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Attendee Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+919876543210"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Ticket will be emailed to the attendee automatically.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    variant="cyber"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Generating...' : 'Generate Ticket'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                  <div id="new-ticket-card" className="transform scale-90 sm:scale-100 origin-center">
                    <TicketCard ticket={newlyGeneratedTicket} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" onClick={printTicket} className="flex flex-col h-auto py-3 gap-2">
                      <Printer className="w-5 h-5" />
                      <span className="text-xs">Print</span>
                    </Button>
                    <Button variant="outline" onClick={downloadTicketImage} className="flex flex-col h-auto py-3 gap-2">
                      <Download className="w-5 h-5" />
                      <span className="text-xs">Download</span>
                    </Button>
                    <Button variant="outline" onClick={shareTicket} className="flex flex-col h-auto py-3 gap-2">
                      <Share2 className="w-5 h-5" />
                      <span className="text-xs">Share</span>
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setNewlyGeneratedTicket(null);
                      setFormData({ name: '', email: '', phone: '' });
                      setIsDialogOpen(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {tickets.length === 0 ? (
          <Card className="border-2 border-primary/20 p-12 text-center">
            <TicketIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
            <p className="text-muted-foreground mb-6">
              Generate your first ticket to get started
            </p>
            <Button variant="cyber" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Ticket
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            <EventStats
              totalTickets={tickets.length}
              validatedTickets={validatedCount}
              pendingTickets={pendingCount}
              attendees={tickets}
            />

            <Tabs defaultValue="tickets" className="space-y-6">
              <TabsList className="grid w-full md:w-auto grid-cols-3">
                <TabsTrigger value="tickets">
                  <TicketIcon className="w-4 h-4 mr-2" />
                  Tickets
                </TabsTrigger>
                <TabsTrigger value="attendees">
                  <Users className="w-4 h-4 mr-2" />
                  Attendees
                </TabsTrigger>
                <TabsTrigger value="customize">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tickets">
                <div className="grid md:grid-cols-2 gap-6">
                  {tickets.map((ticket) => (
                    <Link key={ticket.id} to={`/ ticket / ${ticket.id} `}>
                      <div className="transition-transform hover:scale-105">
                        <TicketCard ticket={ticket} compact />
                      </div>
                    </Link>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="attendees">
                <AttendeeList tickets={tickets} eventTitle={event.title} eventId={eventId!} />
              </TabsContent>

              <TabsContent value="customize">
                <EventCustomization
                  eventId={eventId!}
                  userId={user!.id}
                  initialData={{
                    galleryImages: event.gallery_images,
                    videos: event.videos,
                    faq: event.faq,
                    schedule: event.schedule,
                    additionalInfo: event.additional_info,
                    socialLinks: event.social_links,
                    sponsors: event.sponsors
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketManagement;