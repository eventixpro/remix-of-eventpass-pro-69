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
import { ArrowLeft, Search, Download, Filter, RefreshCw, Ticket, Mail, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TicketActions } from '@/components/TicketActions';
import { TicketDetailDrawer } from '@/components/TicketDetailDrawer';
import { cn } from '@/lib/utils';

const GlobalTickets = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
    const [bulkSending, setBulkSending] = useState(false);
    const [verifying, setVerifying] = useState<string | null>(null);

    const fetchTickets = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    events!inner (
                        title,
                        event_date,
                        venue,
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

    const filteredTickets = tickets.filter(ticket => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            ticket.attendee_name?.toLowerCase().includes(searchLower) ||
            ticket.attendee_email?.toLowerCase().includes(searchLower) ||
            ticket.attendee_phone?.toLowerCase().includes(searchLower) ||
            ticket.ticket_code?.toLowerCase().includes(searchLower) ||
            ticket.events?.title?.toLowerCase().includes(searchLower);

        const status = ticket.is_validated ? 'validated' : (ticket.payment_status || 'pending');
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (ticket: any) => {
        if (ticket.is_validated) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        switch (ticket.payment_status) {
            case 'verified':
            case 'paid': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'pay_at_venue': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'pending': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusText = (ticket: any) => {
        if (ticket.is_validated) return 'VALIDATED';
        return (ticket.payment_status || 'pending').replace(/_/g, ' ').toUpperCase();
    };

    const toggleSelectAll = () => {
        if (selectedTickets.size === filteredTickets.length) {
            setSelectedTickets(new Set());
        } else {
            setSelectedTickets(new Set(filteredTickets.map(t => t.id)));
        }
    };

    const toggleTicketSelection = (ticketId: string) => {
        const newSelection = new Set(selectedTickets);
        if (newSelection.has(ticketId)) {
            newSelection.delete(ticketId);
        } else {
            newSelection.add(ticketId);
        }
        setSelectedTickets(newSelection);
    };

    const handleBulkEmail = async () => {
        if (selectedTickets.size === 0) {
            toast.error('No tickets selected');
            return;
        }

        setBulkSending(true);
        let successCount = 0;
        let failCount = 0;

        for (const ticketId of selectedTickets) {
            const ticket = tickets.find(t => t.id === ticketId);
            if (!ticket) continue;

            try {
                const { error } = await supabase.functions.invoke('send-ticket-email', {
                    body: {
                        ticketId: ticket.id,
                        attendeeEmail: ticket.attendee_email,
                        attendeeName: ticket.attendee_name,
                        eventTitle: ticket.events?.title,
                        eventDate: ticket.events?.event_date,
                        ticketCode: ticket.ticket_code,
                    },
                });

                if (error) throw error;
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        setBulkSending(false);
        setSelectedTickets(new Set());
        
        if (failCount === 0) {
            toast.success(`Sent ${successCount} ticket(s) successfully`);
        } else {
            toast.warning(`Sent ${successCount}, failed ${failCount}`);
        }
    };

    const handleVerifyPayment = async (ticketId: string, ticketEmail: string, ticketCode: string, eventTitle: string) => {
        setVerifying(ticketId);
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ 
                    payment_status: 'verified',
                    verified_at: new Date().toISOString()
                })
                .eq('id', ticketId);

            if (error) throw error;

            // Send verification email with ticket
            try {
                await supabase.functions.invoke('send-ticket-email', {
                    body: {
                        ticketId: ticketId,
                        attendeeEmail: ticketEmail,
                        ticketCode: ticketCode,
                        eventTitle: eventTitle,
                        isVerification: true
                    },
                });
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError);
            }

            toast.success('Payment verified! Ticket sent to attendee.');
            fetchTickets();
        } catch (error: any) {
            console.error('Error verifying payment:', error);
            toast.error('Failed to verify payment');
        } finally {
            setVerifying(null);
        }
    };

    const exportData = () => {
        const csvContent = [
            ['Ticket Code', 'Event', 'Attendee Name', 'Email', 'Phone', 'Status', 'Validated', 'Tier', 'Price', 'Date'],
            ...filteredTickets.map(t => [
                t.ticket_code,
                t.events?.title,
                t.attendee_name,
                t.attendee_email,
                t.attendee_phone || '',
                t.payment_status || 'pending',
                t.is_validated ? 'Yes' : 'No',
                t.ticket_tiers?.name || 'Standard',
                t.ticket_tiers?.price || 'Free',
                format(new Date(t.created_at), 'yyyy-MM-dd HH:mm')
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `tickets_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Export downloaded!');
    };

    const openTicketDetails = (ticket: any) => {
        setSelectedTicket(ticket);
        setDrawerOpen(true);
    };

    return (
        <div className="min-h-screen pb-20 md:pb-8 bg-background">
            <div className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="shrink-0">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold text-gradient-cyber">Ticket Database</h1>
                            <p className="text-xs md:text-sm text-muted-foreground">{tickets.length} total tickets</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Mobile */}
                <div className="grid grid-cols-3 gap-2 md:hidden">
                    <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-primary">{tickets.length}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                    </Card>
                    <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-green-400">{tickets.filter(t => t.is_validated).length}</p>
                        <p className="text-[10px] text-muted-foreground">Validated</p>
                    </Card>
                    <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{tickets.filter(t => !t.is_validated).length}</p>
                        <p className="text-[10px] text-muted-foreground">Pending</p>
                    </Card>
                </div>

                <Card className="border-primary/20">
                    <CardHeader className="flex flex-col gap-4 pb-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <CardTitle className="text-lg">Ticket Records</CardTitle>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <Button variant="outline" size="sm" onClick={fetchTickets} className="flex-1 sm:flex-none">
                                    <RefreshCw className={cn("w-4 h-4 mr-2", loading && 'animate-spin')} />
                                    Refresh
                                </Button>
                                <Button variant="outline" size="sm" onClick={exportData} className="flex-1 sm:flex-none">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </Button>
                            </div>
                        </div>
                        
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tickets..."
                                    className="pl-9 h-11"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[180px] h-11">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Filter Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="validated">Validated</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="pay_at_venue">Pay at Venue</SelectItem>
                                    <SelectItem value="pending">Pending Verification</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Bulk Actions */}
                        {selectedTickets.size > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <span className="text-sm font-medium">{selectedTickets.size} selected</span>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleBulkEmail}
                                    disabled={bulkSending}
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    {bulkSending ? 'Sending...' : 'Email Selected'}
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => setSelectedTickets(new Set())}
                                >
                                    Clear
                                </Button>
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="p-0 sm:p-6 sm:pt-0">
                        {/* Mobile List View */}
                        <div className="md:hidden space-y-2 px-4 pb-4">
                            {loading ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    Loading tickets...
                                </div>
                            ) : filteredTickets.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    No tickets found
                                </div>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="w-full p-4 bg-muted/30 rounded-xl text-left"
                                    >
                                        <button
                                            onClick={() => openTicketDetails(ticket)}
                                            className="w-full text-left active:scale-[0.98] transition-transform"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-mono font-bold text-primary text-sm">{ticket.ticket_code}</p>
                                                    <p className="font-medium mt-1">{ticket.attendee_name}</p>
                                                </div>
                                                <Badge variant="outline" className={cn("text-[10px]", getStatusColor(ticket))}>
                                                    {getStatusText(ticket)}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{ticket.events?.title}</p>
                                            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                                                <span>{ticket.attendee_email}</span>
                                                <span>{format(new Date(ticket.created_at), 'MMM d')}</span>
                                            </div>
                                        </button>
                                        
                                        {/* Verify button for pending tickets on mobile */}
                                        {ticket.payment_status === 'pending' && (
                                            <div className="mt-3 pt-3 border-t border-border">
                                                <div className="text-[10px] text-muted-foreground mb-2 font-mono">
                                                    UTR: {ticket.payment_ref_id || 'N/A'}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full border-green-500/50 text-green-500 hover:bg-green-500/10"
                                                    onClick={() => handleVerifyPayment(
                                                        ticket.id,
                                                        ticket.attendee_email,
                                                        ticket.ticket_code,
                                                        ticket.events?.title
                                                    )}
                                                    disabled={verifying === ticket.id}
                                                >
                                                    {verifying === ticket.id ? (
                                                        <>
                                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                            Verifying...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Verify Payment
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectedTickets.size === filteredTickets.length && filteredTickets.length > 0}
                                                onChange={toggleSelectAll}
                                                className="rounded border-border"
                                            />
                                        </TableHead>
                                        <TableHead>Ticket</TableHead>
                                        <TableHead>Attendee</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                Loading tickets...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredTickets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                No tickets found matching your criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTickets.map((ticket) => (
                                            <TableRow 
                                                key={ticket.id} 
                                                className={cn(
                                                    "cursor-pointer hover:bg-muted/50",
                                                    selectedTickets.has(ticket.id) && "bg-primary/5"
                                                )}
                                                onClick={() => openTicketDetails(ticket)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTickets.has(ticket.id)}
                                                        onChange={() => toggleTicketSelection(ticket.id)}
                                                        className="rounded border-border"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-mono font-bold text-primary">{ticket.ticket_code}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {ticket.ticket_tiers?.name || 'Standard'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{ticket.attendee_name}</div>
                                                    <div className="text-xs text-muted-foreground">{ticket.attendee_email}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium max-w-[180px] truncate">{ticket.events?.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(ticket.events?.event_date), 'MMM d, yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={getStatusColor(ticket)}>
                                                            {getStatusText(ticket)}
                                                        </Badge>
                                                        {ticket.payment_status === 'pending' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-6 px-2 text-xs border-green-500/50 text-green-500 hover:bg-green-500/10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleVerifyPayment(
                                                                        ticket.id,
                                                                        ticket.attendee_email,
                                                                        ticket.ticket_code,
                                                                        ticket.events?.title
                                                                    );
                                                                }}
                                                                disabled={verifying === ticket.id}
                                                            >
                                                                {verifying === ticket.id ? (
                                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                        Verify
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {ticket.payment_ref_id && ticket.payment_status === 'pending' && (
                                                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                                                            UTR: {ticket.payment_ref_id}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <TicketActions 
                                                        ticket={ticket} 
                                                        onViewDetails={() => openTicketDetails(ticket)}
                                                    />
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

            <TicketDetailDrawer
                ticket={selectedTicket}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
            />
        </div>
    );
};

export default GlobalTickets;
