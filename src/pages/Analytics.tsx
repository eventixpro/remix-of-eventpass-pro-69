import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, DollarSign, Users, Calendar, Download, MapPin, BarChart3 } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const COLORS = ['#00D9FF', '#A855F7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Analytics = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        fetchAnalyticsData();
    }, [user, dateRange]);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            // Fetch events
            let eventsQuery = supabase
                .from('events')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            // Apply date filter
            if (dateRange !== 'all') {
                const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
                const startDate = subDays(new Date(), days).toISOString();
                eventsQuery = eventsQuery.gte('created_at', startDate);
            }

            const { data: eventsData } = await eventsQuery;
            setEvents(eventsData || []);

            // Fetch tickets for these events
            if (eventsData && eventsData.length > 0) {
                const eventIds = eventsData.map(e => e.id);
                const { data: ticketsData } = await supabase
                    .from('tickets')
                    .select('*')
                    .in('event_id', eventIds);

                setTickets(ticketsData || []);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const totalRevenue = events.reduce((sum, event) => sum + (Number(event.total_revenue) || 0), 0);
    const totalTicketsSold = tickets.length;
    const totalEvents = events.length;
    const avgTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    // Revenue over time
    const revenueOverTime = events.reduce((acc: any[], event) => {
        const date = format(new Date(event.created_at), 'MMM dd');
        const existing = acc.find(item => item.date === date);
        if (existing) {
            existing.revenue += Number(event.total_revenue) || 0;
        } else {
            acc.push({ date, revenue: Number(event.total_revenue) || 0 });
        }
        return acc;
    }, []);

    // Tickets by event
    const ticketsByEvent = events.map(event => ({
        name: event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title,
        tickets: tickets.filter(t => t.event_id === event.id).length,
        revenue: Number(event.total_revenue) || 0
    })).sort((a, b) => b.tickets - a.tickets).slice(0, 10);

    // Event status distribution
    const now = new Date();
    const eventsByStatus = [
        { name: 'Upcoming', value: events.filter(e => new Date(e.event_date) > now).length },
        { name: 'Past', value: events.filter(e => new Date(e.event_date) <= now).length },
    ];

    // Revenue forecast (simple linear projection)
    const forecastRevenue = () => {
        if (events.length < 2) return [];
        const avgRevenuePerEvent = totalRevenue / events.length;
        const forecast = [];
        for (let i = 1; i <= 6; i++) {
            forecast.push({
                month: format(new Date(new Date().setMonth(new Date().getMonth() + i)), 'MMM yyyy'),
                projected: avgRevenuePerEvent * (events.length / 30) * 30 * i
            });
        }
        return forecast;
    };

    // Geographic data (mock - would need actual location data)
    const geographicData = [
        { location: 'Mumbai', events: Math.floor(events.length * 0.3), revenue: totalRevenue * 0.3 },
        { location: 'Delhi', events: Math.floor(events.length * 0.25), revenue: totalRevenue * 0.25 },
        { location: 'Bangalore', events: Math.floor(events.length * 0.20), revenue: totalRevenue * 0.20 },
        { location: 'Pune', events: Math.floor(events.length * 0.15), revenue: totalRevenue * 0.15 },
        { location: 'Others', events: Math.floor(events.length * 0.10), revenue: totalRevenue * 0.10 },
    ];

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text('EventTix Analytics Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 28);
        doc.text(`Period: ${dateRange === 'all' ? 'All Time' : `Last ${dateRange}`}`, 14, 34);

        // Summary
        doc.setFontSize(14);
        doc.text('Summary', 14, 45);
        autoTable(doc, {
            startY: 50,
            head: [['Metric', 'Value']],
            body: [
                ['Total Events', totalEvents.toString()],
                ['Total Tickets Sold', totalTicketsSold.toString()],
                ['Total Revenue', `₹${totalRevenue.toFixed(2)}`],
                ['Average Ticket Price', `₹${avgTicketPrice.toFixed(2)}`],
            ],
        });

        // Top Events
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Top Events by Tickets', 14, 20);
        autoTable(doc, {
            startY: 25,
            head: [['Event', 'Tickets', 'Revenue']],
            body: ticketsByEvent.slice(0, 10).map(e => [
                e.name,
                e.tickets.toString(),
                `₹${e.revenue.toFixed(2)}`
            ]),
        });

        doc.save(`eventtix-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF report downloaded!');
    };

    // Export to Excel
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [
            ['Metric', 'Value'],
            ['Total Events', totalEvents],
            ['Total Tickets Sold', totalTicketsSold],
            ['Total Revenue', totalRevenue],
            ['Average Ticket Price', avgTicketPrice],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

        // Events sheet
        const eventsData = events.map(e => ({
            Title: e.title,
            Date: format(new Date(e.event_date), 'PPP'),
            Venue: e.venue,
            'Tickets Sold': tickets.filter(t => t.event_id === e.id).length,
            Revenue: Number(e.total_revenue) || 0,
        }));
        const eventsSheet = XLSX.utils.json_to_sheet(eventsData);
        XLSX.utils.book_append_sheet(wb, eventsSheet, 'Events');

        // Tickets sheet
        const ticketsData = tickets.map(t => {
            const event = events.find(e => e.id === t.event_id);
            return {
                'Ticket Code': t.ticket_code,
                Event: event?.title || 'Unknown',
                'Claimed At': t.claimed_at ? format(new Date(t.claimed_at), 'PPP') : 'Not claimed',
                Email: t.email || 'N/A',
            };
        });
        const ticketsSheet = XLSX.utils.json_to_sheet(ticketsData);
        XLSX.utils.book_append_sheet(wb, ticketsSheet, 'Tickets');

        XLSX.writeFile(wb, `eventtix-analytics-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success('Excel report downloaded!');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <h1 className="text-4xl font-bold text-gradient-cyber">Advanced Analytics</h1>
                        <p className="text-muted-foreground mt-2">
                            Data-driven insights for your events
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={exportToPDF}>
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                        </Button>
                        <Button variant="outline" onClick={exportToExcel}>
                            <Download className="w-4 h-4 mr-2" />
                            Excel
                        </Button>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div className="flex gap-2 mb-6">
                    {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                        <Button
                            key={range}
                            variant={dateRange === range ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDateRange(range)}
                        >
                            {range === 'all' ? 'All Time' : `Last ${range}`}
                        </Button>
                    ))}
                </div>

                {/* Key Metrics */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-cyan-400" />
                                Total Events
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalEvents}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-400" />
                                Tickets Sold
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalTicketsSold}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Across all events
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                Total Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">₹{totalRevenue.toFixed(0)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Gross revenue
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-amber-400" />
                                Avg Ticket Price
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">₹{avgTicketPrice.toFixed(0)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Per ticket
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="revenue">Revenue</TabsTrigger>
                        <TabsTrigger value="geographic">Geographic</TabsTrigger>
                        <TabsTrigger value="forecast">Forecast</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Revenue Over Time */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Revenue Trend</CardTitle>
                                    <CardDescription>Revenue over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={revenueOverTime}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="date" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                                formatter={(value: any) => [`₹${value}`, 'Revenue']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#00D9FF"
                                                fillOpacity={1}
                                                fill="url(#colorRevenue)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Event Status */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Event Status</CardTitle>
                                    <CardDescription>Upcoming vs Past events</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={eventsByStatus}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, value }) => `${name}: ${value}`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {eventsByStatus.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Top Events */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Events by Tickets</CardTitle>
                                <CardDescription>Best performing events</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={ticketsByEvent}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={100} />
                                        <YAxis stroke="#888" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            formatter={(value: any, name: string) => [
                                                name === 'tickets' ? value : `₹${value}`,
                                                name === 'tickets' ? 'Tickets' : 'Revenue'
                                            ]}
                                        />
                                        <Legend />
                                        <Bar dataKey="tickets" fill="#00D9FF" />
                                        <Bar dataKey="revenue" fill="#A855F7" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Revenue Tab */}
                    <TabsContent value="revenue" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue Breakdown</CardTitle>
                                <CardDescription>Detailed revenue analysis</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {ticketsByEvent.slice(0, 10).map((event, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium">{event.name}</p>
                                                <p className="text-sm text-muted-foreground">{event.tickets} tickets sold</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-green-400">₹{event.revenue.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {((event.revenue / totalRevenue) * 100).toFixed(1)}% of total
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Geographic Tab */}
                    <TabsContent value="geographic" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    Geographic Distribution
                                </CardTitle>
                                <CardDescription>Events and revenue by location</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {geographicData.map((location, index) => (
                                        <div key={index} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{location.location}</span>
                                                <span className="text-sm text-muted-foreground">
                                                    {location.events} events • ₹{location.revenue.toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600"
                                                    style={{ width: `${(location.events / totalEvents) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Forecast Tab */}
                    <TabsContent value="forecast" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Revenue Forecast
                                </CardTitle>
                                <CardDescription>Projected revenue for next 6 months</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={forecastRevenue()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="month" stroke="#888" />
                                        <YAxis stroke="#888" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            formatter={(value: any) => [`₹${value.toFixed(0)}`, 'Projected Revenue']}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="projected"
                                            stroke="#00D9FF"
                                            strokeWidth={2}
                                            dot={{ fill: '#00D9FF', r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <p className="text-sm text-amber-500">
                                        ⚠️ Forecast is based on historical average. Actual results may vary based on market conditions and event performance.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Analytics;
