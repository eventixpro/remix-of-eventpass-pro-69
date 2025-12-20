import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CreditCard, Building2, Plus, Loader2, QrCode, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const BankAccounts = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [paymentType, setPaymentType] = useState("upi");
    const [formData, setFormData] = useState({
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        upi_id: '',
    });

    useEffect(() => {
        if (user) {
            fetchAccounts();
        }
    }, [user]);

    const fetchAccounts = async () => {
        try {
            const { data, error } = await supabase
                .from('bank_accounts' as any)
                .select('*')
                .eq('user_id', user?.id)
                .order('is_primary', { ascending: false });

            if (error) throw error;
            setAccounts(data || []);
        } catch (error: any) {
            console.error('Error fetching accounts:', error);
            // Don't show error on initial load if table empty/missing, just empty list
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        if (!formData.account_holder_name) {
            toast.error("Account holder name is required");
            return false;
        }
        if (paymentType === 'upi') {
            if (!formData.upi_id) {
                toast.error("UPI ID is required");
                return false;
            }
            if (!formData.upi_id.includes('@')) {
                toast.error("Invalid UPI ID format");
                return false;
            }
        } else {
            if (!formData.bank_name || !formData.account_number || !formData.ifsc_code) {
                toast.error("All bank details are required");
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (!user) return;

        setSubmitting(true);
        try {
            // Check if table exists by trying to insert
            const accountData = {
                user_id: user.id,
                account_holder_name: formData.account_holder_name,
                is_primary: accounts.length === 0, // Make first account primary
                ...(paymentType === 'upi' ? {
                    upi_id: formData.upi_id,
                    // Clear bank fields just in case
                    bank_name: 'UPI',
                    account_number: null,
                    ifsc_code: null
                } : {
                    bank_name: formData.bank_name,
                    account_number: formData.account_number,
                    ifsc_code: formData.ifsc_code,
                    upi_id: null
                })
            };

            const { error } = await supabase
                .from('bank_accounts' as any)
                .insert(accountData as any);

            if (error) throw error;

            toast.success("Payment method added successfully");
            setIsDialogOpen(false);
            setFormData({
                account_holder_name: '',
                bank_name: '',
                account_number: '',
                ifsc_code: '',
                upi_id: '',
            });
            fetchAccounts();
        } catch (error: any) {
            console.error('Error adding account:', error);
            toast.error(error.message || "Failed to add account");
        } finally {
            setSubmitting(false);
        }
    };

    const deleteAccount = async (id: string) => {
        try {
            const { error } = await supabase
                .from('bank_accounts' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Account deleted");
            fetchAccounts();
        } catch (error) {
            toast.error("Failed to delete account");
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="container mx-auto max-w-5xl">
                {/* Header */}
                <Button variant="ghost" onClick={() => navigate('/business-dashboard')} className="mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gradient-cyber">Payment Methods</h1>
                        <p className="text-muted-foreground mt-2">Manage your UPI and Bank accounts for receiving payments</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg hover:shadow-cyan-500/25 transition-all">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Payment Method
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Add Payment Method</DialogTitle>
                                <DialogDescription>
                                    Enter your account details to receive payouts.
                                </DialogDescription>
                            </DialogHeader>

                            <Tabs defaultValue="upi" value={paymentType} onValueChange={setPaymentType} className="w-full mt-4">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="upi">UPI ID</TabsTrigger>
                                    <TabsTrigger value="bank">Bank Account</TabsTrigger>
                                </TabsList>

                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="holder_name">Account Holder Name</Label>
                                        <Input
                                            id="holder_name"
                                            name="account_holder_name"
                                            placeholder="e.g. John Doe"
                                            value={formData.account_holder_name}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <TabsContent value="upi" className="space-y-4 mt-0">
                                        <div className="space-y-2">
                                            <Label htmlFor="upi_id">UPI ID (VPA)</Label>
                                            <Input
                                                id="upi_id"
                                                name="upi_id"
                                                placeholder="e.g. username@bank"
                                                value={formData.upi_id}
                                                onChange={handleInputChange}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Payments will be sent to this UPI ID directly.
                                            </p>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="bank" className="space-y-4 mt-0">
                                        <div className="space-y-2">
                                            <Label htmlFor="bank_name">Bank Name</Label>
                                            <Input
                                                id="bank_name"
                                                name="bank_name"
                                                placeholder="e.g. HDFC Bank"
                                                value={formData.bank_name}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="account_no">Account Number</Label>
                                                <Input
                                                    id="account_no"
                                                    name="account_number"
                                                    placeholder="XXXX XXXX XXXX"
                                                    value={formData.account_number}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ifsc">IFSC Code</Label>
                                                <Input
                                                    id="ifsc"
                                                    name="ifsc_code"
                                                    placeholder="HDFC0001234"
                                                    value={formData.ifsc_code}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancel</Button>
                                    <Button onClick={handleSubmit} disabled={submitting} className="bg-primary">
                                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Save Account
                                    </Button>
                                </DialogFooter>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : accounts.length === 0 ? (
                    <Card className="border-2 border-dashed border-border/50">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <CreditCard className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No payment methods added</h3>
                            <p className="text-muted-foreground text-center max-w-md mb-6">
                                Add a UPI ID or Bank Account to start receiving payments for your events.
                            </p>
                            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Method
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {accounts.map((account: any) => (
                            <Card key={account.id} className="border-2 border-primary/10 hover:border-primary/30 transition-all relative overflow-hidden group">
                                {account.is_primary && (
                                    <div className="absolute top-0 right-0 p-2">
                                        <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Primary</Badge>
                                    </div>
                                )}

                                <CardHeader className="pb-2">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                                            {account.upi_id ? (
                                                <QrCode className="w-6 h-6 text-primary" />
                                            ) : (
                                                <Building2 className="w-6 h-6 text-purple-500" />
                                            )}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">
                                                {account.upi_id ? 'UPI Payment' : account.bank_name}
                                            </CardTitle>
                                            <CardDescription className="font-medium text-foreground/80 mt-1">
                                                {account.account_holder_name}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4">
                                    {account.upi_id ? (
                                        <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
                                            <div className="bg-white p-2 rounded shrink-0">
                                                <QRCodeSVG value={`upi://pay?pa=${account.upi_id}&pn=${account.account_holder_name}`} size={64} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">UPI ID</p>
                                                <p className="font-mono text-lg truncate text-primary">{account.upi_id}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                                <span className="text-muted-foreground text-sm">Account Number</span>
                                                <span className="font-mono">{account.account_number?.replace(/.(?=.{4})/g, '•')}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                                <span className="text-muted-foreground text-sm">IFSC Code</span>
                                                <span className="font-mono">{account.ifsc_code}</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="pt-2 flex justify-between">
                                    {!account.is_primary && (
                                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                                            Make Primary
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                                        onClick={() => deleteAccount(account.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BankAccounts;
