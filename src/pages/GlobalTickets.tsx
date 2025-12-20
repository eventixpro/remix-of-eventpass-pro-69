import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Search, Download, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const GlobalTickets = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchTickets = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Fetch all tickets for events owned by the user
            // We use !inner on events to filter by the current user's events
            const { data, error } = await supabase
                .from('tickets')
                .select(`
          *,
          events!inner (
            title,
            event_date,
            user_id
          ),
          ticket_tiers (
            name,
            price
          )
        `)
                .eq('events.user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error: any) {
            console.error('Error fetching tickets:', error);
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [user]);

    // Filtering Logic
    const filteredTickets = tickets.filter(ticket => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            ticket.attendee_name?.toLowerCase().includes(searchLower) ||
            ticket.attendee_email?.toLowerCase().includes(searchLower) ||
            ticket.attendee_phone?.toLowerCase().includes(searchLower) ||
            ticket.ticket_code?.toLowerCase().includes(searchLower) ||
            ticket.events?.title?.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === 'all' || ticket.payment_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'pay_at_venue': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'pending': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const exportData = () => {
        const csvContent = [
            ['Ticket Code', 'Event', 'Attendee Name', 'Email', 'Phone', 'Status', 'Payment Ref', 'Tier', 'Price', 'Date'],
            ...filteredTickets.map(t => [
                t.ticket_code,
                t.events?.title,
                t.attendee_name,
                t.attendee_email,
                t.attendee_phone,
                t.payment_status,
                t.payment_ref_id,
                t.ticket_tiers?.name || 'Standard',
                t.ticket_tiers?.price || 'N/A',
                new Date(t.created_at).toLocaleString()
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `tickets_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Export downloaded!');
    };

    return (
        <div className="min-h-screen p-4 md:p-8 bg-background">
            <div className="container mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold text-gradient-cyber">All Tickets Database</h1>
                </div>

                <Card className="border-primary/20">
                    <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 space-y-0">
                        <CardTitle>Ticket Records</CardTitle>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            <Button variant="outline" size="sm" onClick={fetchTickets}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button variant="cyber" size="sm" onClick={exportData}>
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, phone, code or event..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Filter Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="pay_at_venue">Pay At Venue</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ticket Info</TableHead>
                                        <TableHead>Customer Details</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Loading tickets...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredTickets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No tickets found matching your criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTickets.map((ticket) => (
                                            <TableRow key={ticket.id}>
                                                <TableCell>
                                                    <div className="font-mono font-bold text-primary">{ticket.ticket_code}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {ticket.ticket_tiers ? `${ticket.ticket_tiers.name}` : 'Standard'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{ticket.attendee_name}</div>
                                                    <div className="text-xs text-muted-foreground">{ticket.attendee_email}</div>
                                                    <div className="text-xs text-muted-foreground">{ticket.attendee_phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium max-w-[150px] truncate" title={ticket.events?.title}>
                                                        {ticket.events?.title}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(ticket.events?.event_date), 'MMM d, yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`${getStatusColor(ticket.payment_status)}`}>
                                                        {ticket.payment_status?.replace(/_/g, ' ').toUpperCase()}
                                                    </Badge>
                                                    {ticket.payment_ref_id && (
                                                        <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[100px]" title={ticket.payment_ref_id}>
                                                            Ref: {ticket.payment_ref_id}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default GlobalTickets;
