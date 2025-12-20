import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/safeClient';
import { ArrowLeft, Building2, Users, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  user_id: string;
  company_name: string;
  company_email: string;
  company_phone: string | null;
  plan: 'monthly' | 'annual' | 'pay_as_you_go';
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  price_per_month: number | null;
  events_limit: number | null;
  events_used: number;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  active: 'bg-green-500/20 text-green-400 border-green-500/50',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/50',
  expired: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

const planColors: Record<string, string> = {
  monthly: 'bg-primary/20 text-primary border-primary/50',
  annual: 'bg-accent/20 text-accent border-accent/50',
  pay_as_you_go: 'bg-muted text-muted-foreground border-border',
};

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('business_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions((data as Subscription[]) || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubscriptionStatus = async (id: string, status: Subscription['status']) => {
    try {
      const { error } = await supabase
        .from('business_subscriptions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setSubscriptions(prev =>
        prev.map(sub => (sub.id === id ? { ...sub, status: status as Subscription['status'] } : sub))
      );

      toast({
        title: 'Status Updated',
        description: `Subscription status changed to ${status}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    revenue: subscriptions
      .filter(s => s.status === 'active')
      .reduce((acc, s) => acc + (s.price_per_month || 0), 0),
    pending: subscriptions.filter(s => s.status === 'pending').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Business Subscriptions</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MRR</p>
                  <p className="text-2xl font-bold text-foreground">₹{stats.revenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">All Subscriptions</CardTitle>
            <CardDescription>Manage business subscriptions and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No business subscriptions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Company</TableHead>
                      <TableHead className="text-muted-foreground">Plan</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Price</TableHead>
                      <TableHead className="text-muted-foreground">Joined</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id} className="border-border">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{sub.company_name}</p>
                            <p className="text-sm text-muted-foreground">{sub.company_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={planColors[sub.plan]}>
                            {sub.plan.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[sub.status]}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          ₹{sub.price_per_month?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(sub.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={sub.status}
                            onValueChange={(value) => updateSubscriptionStatus(sub.id, value as Subscription['status'])}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSubscriptions;
