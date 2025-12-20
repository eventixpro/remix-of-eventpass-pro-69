import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialShare } from '@/components/SocialShare';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, MapPin, Download, ArrowLeft, Ticket, Clock, HelpCircle, Image as ImageIcon, CalendarPlus, Users, AlertCircle, Video, Instagram, Facebook, Twitter, Linkedin, Youtube, Globe, Award, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { TicketCard } from '@/components/TicketCard';
import { TierSelector } from '@/components/TierSelector';
import { RazorpayCheckout } from '@/components/RazorpayCheckout';
import { downloadICS } from '@/utils/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface SelectedTier {
  id: string;
  name: string;
  price: number;
}

const claimSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z.string().trim().min(10, "Valid phone number required").max(20)
});

const PublicEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [claimedTicket, setClaimedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [selectedTier, setSelectedTier] = useState<SelectedTier | null>(null);
  const [hasTiers, setHasTiers] = useState(false);

  // Payment States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (error || !data) {
        toast.error('Event not found');
        navigate('/public-events');
        return;
      }

      setEvent(data);

      // Check if event has tiers
      const { data: tiers } = await supabase
        .from('ticket_tiers')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .limit(1);

      setHasTiers(tiers && tiers.length > 0);
    };

    fetchEvent();
  }, [eventId, navigate]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = claimSchema.parse(formData);

      if (event.capacity) {
        const { data: availabilityData } = await supabase
          .rpc('check_ticket_availability', { event_id_input: eventId });

        if (!availabilityData) {
          toast.error('Sorry, this event is sold out!');
          setLoading(false);
          return;
        }
      }

      const response = await supabase.functions.invoke('send-otp', {
        body: { email: validated.email }
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      const result = response.data;
      if (!result.success) {
        toast.error(result.error || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      setShowOtpInput(true);
      toast.success(`Verification code sent to ${validated.email}`);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Failed to send OTP. Please check your email.');
        console.error(error);
      }
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const verifyResponse = await supabase.functions.invoke('verify-otp', {
        body: { email: formData.email, otp }
      });

      if (verifyResponse.error) throw new Error(verifyResponse.error.message || "Invalid OTP");
      
      const verifyResult = verifyResponse.data;
      if (!verifyResult.success) throw new Error(verifyResult.error || "Verification failed");

      setIsEmailVerified(true);

      if (event.is_free) {
        await createTicket();
      } else {
        setShowPaymentDialog(true);
        setLoading(false);
      }

    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const createTicket = async (paymentType: 'online' | 'venue' = 'online') => {
    try {
      setLoading(true);
      const ticketCode = `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Determine status based on payment type
      let status = 'pending';
      let refId = transactionId || null;

      if (event.is_free) {
        status = 'paid';
      } else if (paymentType === 'venue') {
        status = 'pay_at_venue';
        refId = 'PAY_AT_VENUE';
      }

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          event_id: eventId,
          attendee_name: formData.name,
          attendee_phone: formData.phone,
          attendee_email: formData.email.toLowerCase(),
          ticket_code: ticketCode,
          tier_id: selectedTier?.id || null,
          payment_ref_id: refId,
          payment_status: status
        })
        .select()
        .single();

      if (error) throw error;

      // BRANCH LOGIC: Free/Venue vs Paid
      if (event.is_free || paymentType === 'venue') {
        // Instant Success (Free or Pay at Venue Token)
        setClaimedTicket({ ...ticket, events: event, tier_name: selectedTier?.name });
        setShowPaymentDialog(false);

        const successMsg = paymentType === 'venue'
          ? 'Booking Token Generated! Pay at venue to activate.'
          : 'Ticket claimed successfully!';
        toast.success(successMsg);

        // Send Email async
        try {
          await fetch('/api/send-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              ticketCode: ticketCode,
              eventTitle: event.title,
              eventDate: format(new Date(event.event_date), 'PPP'),
              venue: event.venue,
              ticketId: ticket.id,
              attendeeName: formData.name,
              isToken: paymentType === 'venue'
            })
          });
          if (paymentType !== 'venue') toast.success('Ticket sent to your email!');
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }

        // WhatsApp Link
        const ticketUrl = `${window.location.origin}/ticket/${ticket.id}`;
        const typeLabel = paymentType === 'venue' ? 'Booking Token' : 'Ticket';
        const message = `🎫 Your ${typeLabel} for ${event.title}\n\nEvent: ${event.title}\nDate: ${format(new Date(event.event_date), 'PPP')}\nVenue: ${event.venue}\nCode: ${ticketCode}\n\nView: ${ticketUrl}`;

        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (cleanPhone.length >= 10) {
          const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
        }
      } else {
        // PAID FLOW (Pending Approval)
        setShowPaymentDialog(false);
        toast.success('Payment recorded. Ticket is pending approval.');
        navigate(`/e/${eventId}/pending`, {
          state: { email: formData.email, ticketId: ticket.id }
        });
        return;
      }

    } catch (error: any) {
      console.error("Claim Error:", error);
      toast.error('Failed to claim ticket: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    toast.info('To save your ticket, take a screenshot or use the share options below');
  };

  const handleAddToCalendar = () => {
    downloadICS(event);
    toast.success('Event added to your calendar!');
  };

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading event...</div>
      </div>
    );
  }

  const ticketPrice = selectedTier ? selectedTier.price : (event.ticket_price || 0);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/public-events')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        {/* Event Details */}
        <Card className="mb-8 overflow-hidden border-2 border-primary/10">
          {event.image_url && (
            <div className="w-full h-64 md:h-80 overflow-hidden bg-muted">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              {format(new Date(event.event_date), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary" />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {event.venue}
                </a>
              </div>
              {event.capacity && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  <span>{event.tickets_issued} / {event.capacity} joined</span>
                </div>
              )}
            </div>

            {event.capacity && event.tickets_issued >= event.capacity && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This event is sold out. No more tickets available.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleAddToCalendar} size="sm">
                <CalendarPlus className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
            </div>

            {event.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
            )}

            {event.promotion_text && (
              <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-4">
                <p className="text-primary font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  {event.promotion_text}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gallery */}
        {event.gallery_images && event.gallery_images.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Event Gallery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {event.gallery_images.map((url: string, index: number) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border-2 border-border hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Videos */}
        {event.videos && event.videos.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Event Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {event.videos.map((url: string, index: number) => (
                  <div key={index} className="aspect-video rounded-lg overflow-hidden border-2 border-border">
                    <iframe
                      src={url}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`Event video ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule */}
        {event.schedule && event.schedule.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Event Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {event.schedule.map((item: any, index: number) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <div className="text-primary font-bold min-w-[80px]">
                      {item.time}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ */}
        {event.faq && event.faq.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {event.faq.map((item: any, index: number) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Sponsors */}
        {event.sponsors && event.sponsors.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Our Sponsors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {event.sponsors.map((sponsor: any, index: number) => (
                  <a
                    key={index}
                    href={sponsor.websiteUrl || '#'}
                    target={sponsor.websiteUrl ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow ${sponsor.websiteUrl ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      className="h-16 w-auto max-w-full object-contain"
                    />
                    <span className="text-sm font-medium text-center">{sponsor.name}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Info */}
        {event.additional_info && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {event.additional_info}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Social Links */}
        {event.social_links && Object.values(event.social_links).some(Boolean) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Connect With Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {event.social_links.instagram && (
                  <a href={event.social_links.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity">
                    <Instagram className="w-5 h-5" /> Instagram
                  </a>
                )}
                {event.social_links.facebook && (
                  <a href={event.social_links.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:opacity-90 transition-opacity">
                    <Facebook className="w-5 h-5" /> Facebook
                  </a>
                )}
                {event.social_links.twitter && (
                  <a href={event.social_links.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white hover:opacity-90 transition-opacity">
                    <Twitter className="w-5 h-5" /> Twitter/X
                  </a>
                )}
                {event.social_links.linkedin && (
                  <a href={event.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white hover:opacity-90 transition-opacity">
                    <Linkedin className="w-5 h-5" /> LinkedIn
                  </a>
                )}
                {event.social_links.youtube && (
                  <a href={event.social_links.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:opacity-90 transition-opacity">
                    <Youtube className="w-5 h-5" /> YouTube
                  </a>
                )}
                {event.social_links.website && (
                  <a href={event.social_links.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground border border-border hover:bg-accent transition-colors">
                    <Globe className="w-5 h-5" /> Website
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Section */}
        {!claimedTicket ? (
          <div id="register">
            {(event.capacity && event.tickets_issued >= event.capacity) ? (
              <Alert variant="destructive" className="mb-8">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-lg font-semibold">
                  Sold Out
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="border-2 border-primary/20 shadow-lg shadow-primary/5">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Ticket className="w-6 h-6 text-primary" />
                    {event.is_free ? 'Register for Free' : 'Buy Ticket'}
                  </CardTitle>
                  <CardDescription>
                    Enter your details to book your spot.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showOtpInput ? (
                    <form onSubmit={handleClaim} className="space-y-4">
                      {hasTiers && (
                        <TierSelector
                          eventId={eventId!}
                          isFreeEvent={event.is_free}
                          selectedTierId={selectedTier?.id || null}
                          onSelect={(tier) => setSelectedTier(tier ? { id: tier.id, name: tier.name, price: tier.price } : null)}
                        />
                      )}

                      {!event.is_free && !hasTiers && (
                        <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                          <span className="font-medium">Standard Ticket</span>
                          <span className="text-xl font-bold text-primary">₹{event.ticket_price}</span>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="John Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone (WhatsApp)</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            placeholder="+91 9876543210"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          placeholder="john@example.com"
                        />
                        <p className="text-xs text-muted-foreground">We'll verify this email with an OTP.</p>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                        size="lg"
                        disabled={loading || (hasTiers && !selectedTier)}
                      >
                        {loading ? 'Sending OTP...' : 'Verify Email & Continue'}
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold text-lg">Verify Email Address</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter the 6-digit code sent to <span className="text-foreground font-medium">{formData.email}</span>
                        </p>
                      </div>

                      <div className="flex justify-center my-4">
                        <InputOTP
                          maxLength={6}
                          value={otp}
                          onChange={(value) => setOtp(value)}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setShowOtpInput(false)}>
                          Change Details
                        </Button>
                        <Button className="flex-1" onClick={verifyOtp} disabled={otp.length !== 6 || loading}>
                          {loading ? 'Verifying...' : (event.is_free ? 'Claim Ticket' : 'Proceed to Payment')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Alert className={`bg-${claimedTicket.payment_status === 'pay_at_venue' ? 'yellow' : 'green'}-500/10 border-${claimedTicket.payment_status === 'pay_at_venue' ? 'yellow' : 'green'}-500/20 text-${claimedTicket.payment_status === 'pay_at_venue' ? 'yellow' : 'green'}-500`}>
              <CheckCircle2 className="h-4 w-4" />
              <div className="space-y-1">
                <AlertDescription className="font-medium">
                  {claimedTicket.payment_status === 'pay_at_venue'
                    ? 'Token Generated! Show this at the venue to pay and enter.'
                    : 'Success! Your ticket has been generated.'}
                </AlertDescription>
                {claimedTicket.payment_status === 'pay_at_venue' && (
                  <p className="text-sm opacity-90">
                    Payments need to made within 24 hours of booking post which the tickets get cancelled.
                    You can call at <strong>7507066880</strong> if you want to confirm on Phone.
                  </p>
                )}
              </div>
            </Alert>
            <TicketCard ticket={claimedTicket} />
            <div className="flex justify-center">
              <Button onClick={() => window.print()} variant="outline">Print / Save as PDF</Button>
            </div>
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Choose your preferred payment method to buy your ticket instantly.
              </DialogDescription>
            </DialogHeader>

            <RazorpayCheckout
              amount={ticketPrice}
              description={`${event.title} - ${selectedTier ? selectedTier.name : 'Standard'} Ticket`}
              orderId="" // This will be set when we create the order
              customerInfo={{
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
              }}
              onSuccess={async (paymentResponse) => {
                // For localhost development, simulate successful payment
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                  setTransactionId(`LOCAL_${Date.now()}`);
                  await createTicket('online');
                  toast.success('Payment successful! (Development mode)');
                  return;
                }

                // Production: Update ticket with payment reference
                setTransactionId(paymentResponse.paymentId);
                // Create ticket with payment confirmation
                await createTicket('online');
              }}
              onFailure={(error) => {
                console.error('Payment failed:', error);
                toast.error('Payment failed. Please try again.');
              }}
            />

            <div className="flex justify-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => createTicket('venue')}
                disabled={loading}
                className="border-primary text-primary hover:bg-primary/10"
              >
                Pay at Venue Instead
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default PublicEvent;
