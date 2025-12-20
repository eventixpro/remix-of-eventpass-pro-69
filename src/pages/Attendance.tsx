import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, CheckCircle, Clock, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceStats {
  totalTickets: number;
  validatedTickets: number;
  pendingTickets: number;
  validationRate: number;
  recentScans: any[];
  eventStats: any[];
}

const Attendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AttendanceStats>({
    totalTickets: 0,
    validatedTickets: 0,
    pendingTickets: 0,
    validationRate: 0,
    recentScans: [],
    eventStats: [],
  });
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchStats();
    fetchEvents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('attendance-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate, selectedEvent]);

  const fetchEvents = async () => {
    if (!user) return;
    
    const { data } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: false });
    
    if (data) setEvents(data);
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Build query based on selected event
      let ticketsQuery = (supabase as any)
        .from('tickets')
        .select('*, events!inner(*)')
        .eq('events.user_id', user.id);

      if (selectedEvent !== 'all') {
        ticketsQuery = ticketsQuery.eq('event_id', selectedEvent);
      }

      const { data: tickets } = await ticketsQuery;

      if (!tickets) return;

      const ticketsTyped = tickets as any[];
      const validated = ticketsTyped.filter((t: any) => t.is_validated);
      const pending = ticketsTyped.filter((t: any) => !t.is_validated);
      const validationRate = ticketsTyped.length > 0 ? (validated.length / ticketsTyped.length) * 100 : 0;

      // Recent scans (last 20)
      const recentScans = validated
        .sort((a: any, b: any) => new Date(b.validated_at).getTime() - new Date(a.validated_at).getTime())
        .slice(0, 20);

      // Event-wise statistics
      const eventStatsMap = new Map();
      ticketsTyped.forEach((ticket: any) => {
        const eventId = ticket.event_id;
        if (!eventStatsMap.has(eventId)) {
          eventStatsMap.set(eventId, {
            event: ticket.events,
            total: 0,
            validated: 0,
          });
        }
        const stat = eventStatsMap.get(eventId);
        stat.total++;
        if (ticket.is_validated) stat.validated++;
      });

      const eventStats = Array.from(eventStatsMap.values()).map(stat => ({
        ...stat,
        rate: stat.total > 0 ? (stat.validated / stat.total) * 100 : 0,
      }));

      setStats({
        totalTickets: tickets.length,
        validatedTickets: validated.length,
        pendingTickets: pending.length,
        validationRate,
        recentScans,
        eventStats,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <Button variant="ghost" onClick={() => navigate('/scan')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scanner
        </Button>

        <h1 className="text-4xl font-bold text-gradient-cyber mb-8">Attendance Dashboard</h1>

        {/* Event Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Filter by Event</label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full md:w-64 px-4 py-2 rounded-lg border-2 border-primary/20 bg-background focus:border-primary/40 outline-none"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gradient-cyber">{stats.totalTickets}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/20 hover:border-green-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validated</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.validatedTickets}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-500/20 hover:border-orange-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.pendingTickets}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-accent/20 hover:border-accent/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validation Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.validationRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2 md:inline-grid">
            <TabsTrigger value="recent">Recent Scans</TabsTrigger>
            <TabsTrigger value="events">By Event</TabsTrigger>
          </TabsList>

          {/* Recent Scans */}
          <TabsContent value="recent">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle>Recent Validations</CardTitle>
                <CardDescription>Last 20 scanned tickets</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentScans.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No scans yet</p>
                ) : (
                  <div className="space-y-4">
                    {stats.recentScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{scan.attendee_name}</p>
                          <p className="text-sm text-muted-foreground">{scan.attendee_email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {scan.events.title}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Validated</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(scan.validated_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Event */}
          <TabsContent value="events">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
                <CardDescription>Attendance breakdown by event</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.eventStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No events found</p>
                ) : (
                  <div className="space-y-4">
                    {stats.eventStats.map((eventStat) => (
                      <div
                        key={eventStat.event.id}
                        className="p-4 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{eventStat.event.title}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(eventStat.event.event_date), 'PPP')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gradient-cyber">
                              {eventStat.rate.toFixed(0)}%
                            </p>
                            <p className="text-xs text-muted-foreground">attendance</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Tickets</p>
                            <p className="text-xl font-bold">{eventStat.total}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Validated</p>
                            <p className="text-xl font-bold text-green-500">{eventStat.validated}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="w-full bg-secondary/20 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                              style={{ width: `${eventStat.rate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Attendance;
