import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { TicketCard } from '@/components/TicketCard';
import { SocialShare } from '@/components/SocialShare';
import { ArrowLeft, Download, Share2, Home } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import html2canvas from 'html2canvas';

const TicketViewer = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!ticketId) return;

    const fetchTicket = async () => {
      const { data, error } = await (supabase as any)
        .from('tickets')
        .select('*, events(*)')
        .eq('id', ticketId)
        .single();

      if (error || !data) {
        toast.error('Ticket not found');
        navigate('/');
        return;
      }

      setTicket(data);
    };

    fetchTicket();

    // Subscribe to ticket updates (validation status)
    const channel = supabase
      .channel('ticket-viewer')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`
        },
        (payload) => {
          setTicket((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, navigate]);

  const handleDownload = async (format: 'png' | 'jpg' = 'png') => {
    const ticketElement = document.getElementById('ticket-card');
    if (!ticketElement) return;

    setDownloading(true);
    try {
      toast.info('Generating ticket image...', { duration: 2000 });
      
      // Wait a bit for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(ticketElement, {
        backgroundColor: format === 'jpg' ? '#0a0f1c' : null,
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      // Convert to blob for better quality
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to generate image');
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `ticket-${ticket.ticket_code}.${format}`;
        link.href = url;
        link.click();
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        toast.success(`Ticket downloaded as ${format.toUpperCase()}!`);
      }, mimeType, 1.0);
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please take a screenshot instead.', {
        description: 'On mobile: Long press the ticket and select "Save Image"'
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const ticketElement = document.getElementById('ticket-card');
    if (!ticketElement) return;

    try {
      // Generate image for sharing
      const canvas = await html2canvas(ticketElement, {
        backgroundColor: '#0a0f1c',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
      });

      const file = new File([blob], `ticket-${ticket.ticket_code}.png`, { type: 'image/png' });
      const url = window.location.href;
      const text = `🎫 My ticket for ${ticket.events.title}`;

      // Try native share with image
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Ticket: ${ticket.events.title}`,
          text,
          files: [file],
          url
        });
      } else if (navigator.share) {
        // Fallback to sharing without image
        await navigator.share({
          title: `Ticket: ${ticket.events.title}`,
          text,
          url
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success('Link copied to clipboard!');
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      }
    }
  };

  if (!ticket) return null;

  return (
    <div className="min-h-screen p-8">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto max-w-2xl">
        <div className="flex gap-2 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="ghost" onClick={() => navigate('/public-events')}>
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>

        <div className="space-y-6">
          <div id="ticket-card">
            <TicketCard ticket={ticket} />
          </div>

          {/* Download Options */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-card/80">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-1">Download Your Ticket</h3>
                <p className="text-sm text-muted-foreground">Save as image for offline access</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="w-full border-primary/30 hover:bg-primary/10" 
                  onClick={() => handleDownload('png')}
                  disabled={downloading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloading ? 'Generating...' : 'PNG'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-primary/30 hover:bg-primary/10" 
                  onClick={() => handleDownload('jpg')}
                  disabled={downloading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloading ? 'Generating...' : 'JPG'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Share Section */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-card/80">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-1">Share Your Ticket</h3>
                <p className="text-sm text-muted-foreground">Share with friends & on social media</p>
              </div>
              
              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share Ticket
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or share via</span>
                </div>
              </div>
              
              <SocialShare 
                url={window.location.href}
                title={`Ticket for ${ticket.events.title}`}
                description={`Check out my ticket for ${ticket.events.title}!`}
              />
            </CardContent>
          </Card>

          {ticket.is_validated && (
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/10 text-center">
              <p className="text-sm text-primary font-semibold">
                ✓ This ticket has been validated and used for entry
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketViewer;