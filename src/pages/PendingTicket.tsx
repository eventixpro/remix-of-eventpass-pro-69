import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, Home, RefreshCw, Mail } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const PendingTicket = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const ticketId = location.state?.ticketId;
  const email = location.state?.email;

  useEffect(() => {
    if (!ticketId) {
      toast.error('No ticket information found');
      navigate(`/e/${eventId}`);
      return;
    }

    const fetchTicket = async () => {
      const { data, error } = await (supabase as any)
        .from('tickets')
        .select('*, events(*)')
        .eq('id', ticketId)
        .single();

      if (error || !data) {
        toast.error('Ticket not found');
        navigate(`/e/${eventId}`);
        return;
      }

      setTicket(data);
      setEvent(data.events);
      setLoading(false);

      // If already verified, redirect to ticket viewer
      if (data.payment_status === 'verified') {
        navigate(`/ticket/${ticketId}`);
      }
    };

    fetchTicket();

    // Subscribe to ticket updates for real-time verification
    const channel = supabase
      .channel('pending-ticket')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`
        },
        (payload: any) => {
          setTicket((prev: any) => ({ ...prev, ...payload.new }));
          
          // Auto-redirect when verified
          if (payload.new.payment_status === 'verified') {
            toast.success('Payment verified! Redirecting to your ticket...');
            setTimeout(() => navigate(`/ticket/${ticketId}`), 1500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, eventId, navigate]);

  const getStatusDisplay = () => {
    if (!ticket) return { icon: Clock, text: 'Loading...', color: 'text-muted-foreground' };
    
    switch (ticket.payment_status) {
      case 'verified':
        return { 
          icon: CheckCircle, 
          text: 'Payment Verified!', 
          color: 'text-green-500',
          description: 'Your ticket is ready for download.'
        };
      case 'pending':
        return { 
          icon: Clock, 
          text: 'Awaiting Verification', 
          color: 'text-yellow-500',
          description: 'Your payment is being verified. This usually takes a few minutes.'
        };
      default:
        return { 
          icon: AlertCircle, 
          text: ticket.payment_status?.toUpperCase() || 'Unknown', 
          color: 'text-muted-foreground',
          description: 'Please contact support if you need assistance.'
        };
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('tickets')
      .select('*, events(*)')
      .eq('id', ticketId)
      .single();

    if (data) {
      setTicket(data);
      if (data.payment_status === 'verified') {
        toast.success('Payment verified!');
        navigate(`/ticket/${ticketId}`);
      }
    }
    setLoading(false);
  };

  if (loading || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto max-w-lg">
        <Card className="border-2 border-primary/20 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6 text-center">
            <div className={`inline-flex p-4 rounded-full ${ticket.payment_status === 'verified' ? 'bg-green-500/20' : 'bg-yellow-500/20'} mb-4`}>
              <StatusIcon className={`w-12 h-12 ${status.color}`} />
            </div>
            <h1 className="text-2xl font-bold mb-2">{status.text}</h1>
            <p className="text-muted-foreground">{status.description}</p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Ticket Details */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Event</span>
                <span className="font-medium">{event?.title}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Ticket Code</span>
                <code className="font-mono text-primary font-bold">{ticket.ticket_code}</code>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{ticket.attendee_name}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{ticket.attendee_email}</span>
              </div>
              {ticket.payment_ref_id && (
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <code className="font-mono text-sm">{ticket.payment_ref_id}</code>
                </div>
              )}
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`${ticket.payment_status === 'verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                  {ticket.payment_status?.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Download Window</p>
                  <p className="text-muted-foreground">
                    Once verified, you can download your ticket for 6 hours.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Email Notification</p>
                  <p className="text-muted-foreground">
                    You'll receive an email once your payment is verified.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                className="w-full"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Check Status
              </Button>
              <Button 
                onClick={() => navigate('/public-events')} 
                variant="ghost" 
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Browse Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingTicket;