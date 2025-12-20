import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Camera, CheckCircle2, XCircle, BarChart3, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@/components/AuthProvider';

const Scan = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    // Require authentication to access scanner
    if (!user) {
      toast.error('Please sign in to access the scanner');
      navigate('/auth');
      return;
    }
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [user, navigate]);

  const playSuccessSound = () => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playErrorSound = () => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  };

  const validateTicket = async (ticketCode: string) => {
    // Validate ticket code format
    const TICKET_CODE_PATTERN = /^[A-Z0-9]{8}-[A-Z0-9]{8}$/i;
    const MAX_LENGTH = 50;

    if (!ticketCode || ticketCode.length > MAX_LENGTH || !TICKET_CODE_PATTERN.test(ticketCode)) {
      playErrorSound();
      toast.error('Invalid ticket code format');
      setLastScan({ success: false, message: 'Invalid ticket format', code: ticketCode });
      return;
    }

    try {
      if (!user) {
        playErrorSound();
        toast.error('Authentication required');
        setLastScan({ success: false, message: 'Not signed in', code: ticketCode });
        return;
      }
      const { data: ticket, error } = await (supabase as any)
        .from('tickets')
        .select('*, events(*)')
        .eq('ticket_code', ticketCode)
        .maybeSingle();

      const ticketTyped = ticket as any;

      if (error || !ticketTyped) {
        playErrorSound();
        toast.error('Invalid ticket code', {
          description: 'This ticket does not exist',
          duration: 3000,
        });
        setLastScan({ success: false, message: 'Invalid ticket', code: ticketCode });
        return;
      }

      // Authorization: ensure scanner owns the event
      const isOwner = ticketTyped?.events?.user_id === user.id;
      if (!isOwner) {
        playErrorSound();
        toast.error('Unauthorized', {
          description: 'You can only validate tickets for your own events.',
          duration: 3000,
        });
        setLastScan({ success: false, message: 'Unauthorized to validate this event', ticket: ticketTyped });
        return;
      }

      if (ticketTyped.is_validated) {
        playErrorSound();
        toast.error('Ticket already used', {
          description: `Validated on ${new Date(ticketTyped.validated_at).toLocaleString()}`,
          duration: 3000,
        });
        setLastScan({
          success: false,
          message: 'Already validated',
          ticket: ticketTyped,
          validatedAt: ticketTyped.validated_at
        });
        return;
      }

      // CHECK FOR EXPIRATION
      if (ticketTyped.payment_status === 'expired') {
        playErrorSound();
        toast.error('Ticket Expired', { description: 'Booking window (24h) has passed.' });
        setLastScan({
          success: false,
          message: 'Ticket Expired (Unpaid > 24h)',
          ticket: ticketTyped
        });
        return;
      }

      // CHECK PAYMENT STATUS
      if (ticketTyped.payment_status === 'pending' || ticketTyped.payment_status === 'pay_at_venue') {
        // Double Check Time on Client just in case it wasn't auto-expired yet
        const createdAt = new Date(ticketTyped.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (diffHours > 24) {
          playErrorSound();
          toast.error('Ticket Expired', { description: 'Booking window (24h) has passed.' });
          setLastScan({
            success: false,
            message: 'Ticket Expired (Unpaid > 24h)',
            ticket: ticketTyped
          });
          return;
        }

        playSuccessSound(); // Found it, but needs action
        toast.info('Payment Required', { description: 'Collect cash and confirm to validate.' });
        setLastScan({
          success: true,
          message: 'Payment Required',
          ticket: ticketTyped,
          requiresPayment: true
        });
        return;
      }

      const { error: updateError } = await (supabase as any)
        .from('tickets')
        .update({ is_validated: true, validated_at: new Date().toISOString() })
        .eq('id', ticketTyped.id);

      if (updateError) throw updateError;

      playSuccessSound();
      toast.success('✅ Ticket Valid!', {
        description: `${ticketTyped.attendee_name} - ${ticketTyped.events.title}`,
        duration: 4000,
      });

      setLastScan({
        success: true,
        message: 'Valid ticket',
        ticket: ticketTyped,
        validatedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Ticket validation error', error);
      playErrorSound();
      toast.error('Validation failed');
      setLastScan({ success: false, message: 'Validation error', code: ticketCode });
    }
  };

  const confirmPaymentAndValidate = async () => {
    if (!lastScan?.ticket?.id) return;

    try {
      const { error } = await (supabase as any)
        .from('tickets')
        .update({
          is_validated: true,
          validated_at: new Date().toISOString(),
          payment_status: 'paid',
          payment_ref_id: 'CASH_AT_VENUE'
        })
        .eq('id', lastScan.ticket.id);

      if (error) throw error;

      toast.success('Payment Confirmed & Ticket Validated!');
      playSuccessSound();

      setLastScan({
        ...lastScan,
        message: 'Valid ticket',
        requiresPayment: false,
        validatedAt: new Date().toISOString()
      });

      // Send Email Confirmation
      const ticket = lastScan.ticket;
      await fetch('/api/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ticket.attendee_email,
          ticketCode: ticket.ticket_code,
          eventTitle: ticket.events.title,
          eventDate: new Date(ticket.events.event_date).toLocaleDateString(),
          venue: ticket.events.venue,
          ticketId: ticket.id,
          attendeeName: ticket.attendee_name
        })
      });

    } catch (error: any) {
      console.error("Payment confirm error", error);
      toast.error("Failed to update ticket");
    }
  };

  const startScanning = async () => {
    try {
      setCameraError('');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          validateTicket(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (happens when no QR code is in view)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Unable to access camera. Please grant camera permissions.');
      toast.error('Camera access denied', {
        description: 'Please enable camera permissions in your browser settings',
      });
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="border-2 border-primary/20 shadow-neon-cyan mb-6">
          <CardHeader>
            <CardTitle className="text-3xl text-gradient-cyber">QR Scanner</CardTitle>
            <CardDescription>Scan tickets to validate entry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Scanner Container */}
            <div className="relative">
              <div
                id="qr-reader"
                className={`w-full rounded-lg overflow-hidden ${isScanning ? 'block' : 'hidden'}`}
                style={{ minHeight: '300px' }}
              />

              {!isScanning && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Camera className="w-16 h-16 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    {cameraError || 'Ready to scan QR codes'}
                  </p>
                </div>
              )}
            </div>

            {/* Scanner Controls */}
            <div className="flex gap-4">
              {!isScanning ? (
                <Button
                  variant="cyber"
                  size="lg"
                  className="w-full"
                  onClick={startScanning}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  onClick={stopScanning}
                >
                  Stop Camera
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Scan Result */}
        {lastScan && (
          <Card className={`border-2 ${lastScan.success ? (lastScan.requiresPayment ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-green-500/50 bg-green-500/5') : 'border-red-500/50 bg-red-500/5'}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {lastScan.success ? (
                  lastScan.requiresPayment ? (
                    <AlertCircle className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                  )
                ) : (
                  <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${lastScan.success ? (lastScan.requiresPayment ? 'text-yellow-500' : 'text-green-500') : 'text-red-500'}`}>
                    {lastScan.message}
                  </h3>
                  {lastScan.ticket && (
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {lastScan.ticket.attendee_name}</p>
                      <p><strong>Email:</strong> {lastScan.ticket.attendee_email}</p>
                      <p><strong>Event:</strong> {lastScan.ticket.events.title}</p>
                      <p><strong>Code:</strong> {lastScan.ticket.ticket_code}</p>
                      {lastScan.ticket.ticket_tiers && (
                        <p><strong>Tier:</strong> {lastScan.ticket.ticket_tiers.name} - ₹{lastScan.ticket.ticket_tiers.price}</p>
                      )}
                      {lastScan.ticket.payment_status && (
                        <p className="uppercase"><strong>Payment:</strong> {lastScan.ticket.payment_status}</p>
                      )}
                      {lastScan.validatedAt && (
                        <p className="text-muted-foreground">
                          <strong>Validated:</strong> {new Date(lastScan.validatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {lastScan.code && !lastScan.ticket && (
                    <p className="text-sm text-muted-foreground">Code: {lastScan.code}</p>
                  )}

                  {lastScan.requiresPayment && (
                    <div className="mt-4">
                      <Button
                        onClick={confirmPaymentAndValidate}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold"
                      >
                        Collect Cash & Validate
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Scan;