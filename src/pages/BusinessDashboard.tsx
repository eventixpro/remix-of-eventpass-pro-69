import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    ArrowLeft,
    Calendar,
    TrendingUp,
    Building2,
    CreditCard,
    Ticket,
    QrCode,
    DollarSign,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const BusinessDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subscription, setSubscription] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            // Fetch subscription
            const { data: subData, error: subError } = await supabase
                .from('business_subscriptions')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (subError) {
                console.error('Subscription error:', subError);
                toast.error('No active subscription found');
                navigate('/pricing');
                return;
            }

            if (subData.status !== 'active') {
                toast.error('Your subscription is not active');
                navigate('/pricing');
                return;
            }

            setSubscription(subData);

            // Fetch events
            const { data: eventsData } = await supabase
                .from('events')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            setEvents(eventsData || []);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const totalRevenue = events.reduce((sum, event) => sum + (Number(event.total_revenue) || 0), 0);
    const totalTicketsSold = events.reduce((sum, event) => sum + (event.tickets_sold || 0), 0);
    const eventsUsed = subscription?.events_used || 0;
    const eventsLimit = subscription?.events_limit || Infinity;
    const usagePercentage = eventsLimit === null ? 0 : (eventsUsed / eventsLimit) * 100;

    const planDetails = {
        monthly: { name: 'Monthly', color: 'bg-gradient-to-r from-primary to-accent' },
        annual: { name: 'Annual', color: 'bg-gradient-to-r from-accent to-secondary' },
        pay_as_you_go: { name: 'Pay As You Go', color: 'bg-gradient-to-r from-gray-500 to-gray-700' },
    };

    const currentPlan = planDetails[subscription?.plan as keyof typeof planDetails] || planDetails.monthly;

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                        <h1 className="text-4xl font-bold text-gradient-cyber">Business Dashboard</h1>
                        <p className="text-muted-foreground mt-2">Welcome back, {subscription?.company_name || 'Business'}</p>
                    </div>
                    <Link to="/create-event">
                        <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                            <Calendar className="w-5 h-5 mr-2" />
                            Create Event
                        </Button>
                    </Link>
                </div>

                {/* Subscription Card */}
                <Card className="mb-8 border-2 border-primary/30 bg-gradient-to-br from-card to-card/50">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="w-6 h-6 text-primary" />
                                    {currentPlan.name} Plan
                                </CardTitle>
                                <CardDescription>
                                    {subscription?.status === 'active' ? 'Active' : 'Inactive'} •
                                    {subscription?.expires_at ? ` Expires ${format(new Date(subscription.expires_at), 'PPP')}` : ' No expiry'}
                                </CardDescription>
                            </div>
                            <Badge className={currentPlan.color}>
                                {subscription?.status?.toUpperCase()}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {eventsLimit !== null && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Events Used</span>
                                    <span className="font-semibold">{eventsUsed} / {eventsLimit}</span>
                                </div>
                                <Progress value={usagePercentage} className="h-2" />
                                {usagePercentage > 80 && (
                                    <div className="flex items-center gap-2 text-sm text-amber-500 mt-2">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>You're approaching your event limit</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {eventsLimit === null && (
                            <p className="text-sm text-muted-foreground">Unlimited events available</p>
                        )}
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="border-2 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Ticket className="w-5 h-5 text-cyan-400" />
                                Total Events
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{events.length}</p>
                            <p className="text-sm text-muted-foreground mt-1">Events created</p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <QrCode className="w-5 h-5 text-purple-400" />
                                Tickets Sold
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{totalTicketsSold}</p>
                            <p className="text-sm text-muted-foreground mt-1">Total tickets issued</p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <DollarSign className="w-5 h-5 text-green-400" />
                                Total Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">₹{totalRevenue.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground mt-1">Across all events</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <Card className="border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all cursor-pointer" onClick={() => navigate('/events')}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-cyan-400" />
                                My Events
                            </CardTitle>
                            <CardDescription>View and manage all your events</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="border-2 border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer" onClick={() => navigate('/bank-accounts')}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-purple-400" />
                                Bank Accounts
                            </CardTitle>
                            <CardDescription>Manage UPI and bank accounts for payouts</CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                {/* Recent Events */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Recent Events
                        </CardTitle>
                        <CardDescription>Your latest created events</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {events.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground mb-4">No events created yet</p>
                                <Link to="/create-event">
                                    <Button>
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Create Your First Event
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {events.slice(0, 5).map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex justify-between items-center p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer"
                                        onClick={() => navigate(`/event/${event.id}/tickets`)}
                                    >
                                        <div>
                                            <h4 className="font-semibold">{event.title}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(event.event_date), 'PPP')} • {event.venue}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{event.tickets_issued || 0} tickets</p>
                                            {event.total_revenue > 0 && (
                                                <p className="text-sm text-green-400">₹{Number(event.total_revenue).toFixed(2)}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default BusinessDashboard;
