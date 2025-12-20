import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { ArrowLeft, Shield, Edit, Trash2, ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

const AdminEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminStatus();
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user?.id,
        _role: 'admin',
      });

      if (error) throw error;

      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await loadEvents();
    } catch (error: any) {
      console.error('Admin check error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getUserFriendlyError(error),
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;

      setEvents(data || []);
    } catch (error: any) {
      console.error('Load events error:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading events',
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Event deleted',
        description: `"${title}" has been deleted.`,
      });

      await loadEvents();
    } catch (error: any) {
      console.error('Delete event error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getUserFriendlyError(error),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gradient-cyber flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Manage All Events
            </h1>
            <p className="text-muted-foreground">View, edit, and delete any event</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tickets Issued</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No events found
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.venue}</TableCell>
                      <TableCell>
                        {format(new Date(event.event_date), 'PPP')}
                      </TableCell>
                      <TableCell>
                        {event.tickets_issued}
                        {event.capacity ? ` / ${event.capacity}` : ''}
                      </TableCell>
                      <TableCell>
                        {event.is_free ? 'Free' : `₹${event.ticket_price}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link to={`/e/${event.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link to={`/event/${event.id}/customize`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{event.title}"? This action cannot be undone and will delete all associated tickets.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEvent(event.id, event.title)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminEvents;