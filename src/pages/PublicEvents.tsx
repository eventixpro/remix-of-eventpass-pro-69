import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Ticket, IndianRupee, Search, Filter, Users, Archive, Sparkles } from 'lucide-react';
import { format, subDays, isPast, isAfter } from 'date-fns';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'music', label: '🎵 Music' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'conference', label: '💼 Conference' },
  { value: 'workshop', label: '🎓 Workshop' },
  { value: 'festival', label: '🎪 Festival' },
  { value: 'networking', label: '🤝 Networking' },
  { value: 'general', label: '📅 General' },
];

const PublicEvents = () => {
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [filteredUpcoming, setFilteredUpcoming] = useState<any[]>([]);
  const [filteredPast, setFilteredPast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const fetchEvents = async () => {
      const oneWeekAgo = subDays(new Date(), 7);

      // Fetch all events
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (data) {
        // Separate upcoming and past events (1 week old)
        const upcoming = data.filter(event => isAfter(new Date(event.event_date), new Date()));
        const past = data.filter(event => isPast(new Date(event.event_date)) && isAfter(new Date(event.event_date), oneWeekAgo));

        setUpcomingEvents(upcoming.reverse()); // Show upcoming in ascending order
        setPastEvents(past); // Show past in descending order (most recent first)
        setFilteredUpcoming(upcoming.reverse());
        setFilteredPast(past);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  // Filter logic
  useEffect(() => {
    const applyFilters = (eventsList: any[]) => {
      let filtered = [...eventsList];

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.title?.toLowerCase().includes(query) ||
          event.venue?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query)
        );
      }

      // Category filter
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(event => event.category === selectedCategory);
      }

      // Price filter
      if (priceFilter === 'free') {
        filtered = filtered.filter(event => event.is_free);
      } else if (priceFilter === 'paid') {
        filtered = filtered.filter(event => !event.is_free);
      }

      // Date filter (only for upcoming)
      if (activeTab === 'upcoming') {
        const now = new Date();
        if (dateFilter === 'today') {
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate.toDateString() === now.toDateString();
          });
        } else if (dateFilter === 'week') {
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate <= weekFromNow;
          });
        } else if (dateFilter === 'month') {
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate <= monthFromNow;
          });
        }
      }

      return filtered;
    };

    setFilteredUpcoming(applyFilters(upcomingEvents));
    setFilteredPast(applyFilters(pastEvents));
  }, [upcomingEvents, pastEvents, searchQuery, selectedCategory, priceFilter, dateFilter, activeTab]);

  const EventCard = ({ event, isPastEvent = false }: { event: any; isPastEvent?: boolean }) => (
    <Card
      className={`
        group border-2 transition-all duration-300 cursor-pointer
        ${isPastEvent
          ? 'border-muted/50 hover:border-muted opacity-60 hover:opacity-80'
          : 'border-primary/20 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]'
        }
        hover:-translate-y-1 hover:scale-[1.02]
        backdrop-blur-sm bg-card/50
      `}
      onClick={() => navigate(`/e/${event.id}`)}
    >
      {event.image_url && (
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          {isPastEvent && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="backdrop-blur-md bg-background/80">
                <Archive className="w-3 h-3 mr-1" />
                Past Event
              </Badge>
            </div>
          )}
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">{event.title}</CardTitle>
            {event.category && event.category !== 'general' && (
              <Badge variant="outline" className="text-xs animate-in fade-in-50">
                {CATEGORIES.find(c => c.value === event.category)?.label || event.category}
              </Badge>
            )}
          </div>
          {event.is_free ? (
            <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-300">
              FREE
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 transition-all duration-300 hover:scale-110">
              <IndianRupee className="w-3 h-3" />
              {event.ticket_price}
            </Badge>
          )}
        </div>
        <CardDescription className="flex items-center gap-2 animate-in slide-in-from-left-5 duration-300">
          <Calendar className="w-4 h-4" />
          {format(new Date(event.event_date), 'PPP')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 text-sm animate-in slide-in-from-left-5 duration-300 delay-75">
          <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
          <span className="line-clamp-1">{event.venue}</span>
        </p>
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 animate-in fade-in-50 duration-300 delay-150">
            {event.description}
          </p>
        )}
        {event.capacity && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-50 duration-300 delay-200">
            <Users className="w-3 h-3" />
            <span>{event.tickets_issued} / {event.capacity} tickets claimed</span>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-500"
                style={{ width: `${(event.tickets_issued / event.capacity) * 100}%` }}
              />
            </div>
          </div>
        )}
        {event.promotion_text && (
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded p-2 animate-pulse-slow">
            <p className="text-xs text-primary font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {event.promotion_text}
            </p>
          </div>
        )}
        <Button
          variant={event.is_free ? "default" : "outline"}
          className={`
            w-full mt-2 transition-all duration-300
            ${event.is_free
              ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70'
              : 'hover:bg-primary/10'
            }
            group-hover:scale-105
          `}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/e/${event.id}`);
          }}
          disabled={isPastEvent}
        >
          <Ticket className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" />
          {isPastEvent ? 'Event Ended' : event.is_free ? 'Get Free Ticket' : 'Buy Tickets'}
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in-50 duration-500">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground">Loading amazing events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in-50 duration-500">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8 animate-in slide-in-from-top-5 duration-700">
          <h1 className="text-5xl md:text-6xl font-bold text-gradient-cyber mb-4 animate-gradient-x">
            Discover Events
          </h1>
          <p className="text-xl text-muted-foreground">Find your next unforgettable experience</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 border-primary/20 backdrop-blur-sm bg-card/50 animate-in slide-in-from-top-8 duration-700 delay-100">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Search events by title, venue, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="free">Free Only</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Count & Clear */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="transition-all duration-300">
                  {activeTab === 'upcoming' ? filteredUpcoming.length : filteredPast.length} event
                  {(activeTab === 'upcoming' ? filteredUpcoming.length : filteredPast.length) !== 1 ? 's' : ''} found
                </span>
                {(searchQuery || selectedCategory !== 'all' || priceFilter !== 'all' || dateFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setPriceFilter('all');
                      setDateFilter('all');
                    }}
                    className="transition-all duration-300 hover:scale-105"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Upcoming and Past Events */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 animate-in slide-in-from-bottom-5 duration-700 delay-200">
          <TabsList className="grid w-full md:w-auto grid-cols-2 backdrop-blur-md bg-background/50">
            <TabsTrigger value="upcoming" className="transition-all duration-300">
              <Sparkles className="w-4 h-4 mr-2" />
              Upcoming ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="transition-all duration-300">
              <Archive className="w-4 h-4 mr-2" />
              Past Events ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6 animate-in fade-in-50 duration-500">
            {filteredUpcoming.length === 0 ? (
              <Card className="animate-in zoom-in-95 duration-500">
                <CardContent className="py-12 text-center">
                  <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
                  <p className="text-muted-foreground text-lg">
                    {upcomingEvents.length === 0 ? 'No upcoming events at the moment' : 'No events match your filters'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {upcomingEvents.length === 0 ? 'Check back soon!' : 'Try adjusting your search or filters'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUpcoming.map((event, index) => (
                  <div
                    key={event.id}
                    className="animate-in slide-in-from-bottom-8 duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-6 animate-in fade-in-50 duration-500">
            {filteredPast.length === 0 ? (
              <Card className="animate-in zoom-in-95 duration-500">
                <CardContent className="py-12 text-center">
                  <Archive className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
                  <p className="text-muted-foreground text-lg">
                    {pastEvents.length === 0 ? 'No past events in the archive' : 'No past events match your filters'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Events are archived for 1 week after they end
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPast.map((event, index) => (
                  <div
                    key={event.id}
                    className="animate-in slide-in-from-bottom-8 duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <EventCard event={event} isPastEvent />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PublicEvents;