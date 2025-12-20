import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Smartphone, Wallet, Banknote } from 'lucide-react';
import { loadRazorpayScript, initializeRazorpay, RazorpayOptions } from '@/lib/payment';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

interface RazorpayCheckoutProps {
    amount: number;
    currency?: string;
    description: string;
    orderId: string;
    customerInfo: {
        name: string;
        email: string;
        phone: string;
    };
    onSuccess: (paymentResponse: {
        paymentId: string;
        orderId: string;
        signature: string;
    }) => void;
    onFailure: (error: any) => void;
    disabled?: boolean;
}

export const RazorpayCheckout = ({
    amount,
    currency = 'INR',
    description,
    orderId: initialOrderId,
    customerInfo,
    onSuccess,
    onFailure,
    disabled = false,
}: RazorpayCheckoutProps) => {
    const [loading, setLoading] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [orderId, setOrderId] = useState(initialOrderId);

    useEffect(() => {
        const loadScript = async () => {
            const loaded = await loadRazorpayScript();
            setScriptLoaded(loaded);
            if (!loaded) {
                toast.error('Failed to load payment system. Please refresh and try again.');
            }
        };

        loadScript();
    }, []);

    // Create payment order when component mounts if no orderId provided
    useEffect(() => {
        if (!initialOrderId && amount > 0) {
            createOrder();
        }
    }, [initialOrderId, amount]);

    const createOrder = async () => {
        // For localhost development, create a simple order ID
        // In production, this would call the Supabase function
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Generate a mock order ID for localhost testing
            const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            setOrderId(mockOrderId);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/functions/v1/create-payment-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({
                    amount,
                    currency,
                    eventId: window.location.pathname.split('/').pop(), // Extract eventId from URL
                    ticketId: `temp_${Date.now()}`, // This will be replaced when ticket is created
                }),
            });

            const orderData = await response.json();

            if (!response.ok) {
                throw new Error(orderData.error || 'Failed to create payment order');
            }

            setOrderId(orderData.orderId);
        } catch (error: any) {
            console.error('Order creation failed:', error);
            toast.error('Failed to initialize payment. Please try again.');
            onFailure(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!scriptLoaded) {
            toast.error('Payment system is still loading. Please wait.');
            return;
        }

        if (disabled) return;

        setLoading(true);

        try {
            const options: RazorpayOptions = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: amount * 100, // Razorpay expects amount in paise
                currency,
                name: 'EventTix',
                description,
                order_id: orderId,
                prefill: {
                    name: customerInfo.name,
                    email: customerInfo.email,
                    contact: customerInfo.phone,
                },
                notes: {
                    event_description: description,
                },
                theme: {
                    color: '#00D9FF', // Cyber theme color
                },
                handler: (response) => {
                    onSuccess({
                        paymentId: response.razorpay_payment_id,
                        orderId: response.razorpay_order_id,
                        signature: response.razorpay_signature,
                    });
                },
            };

            const rzp = initializeRazorpay(options);

            (rzp as any).on('payment.failed', (response: any) => {
                console.error('Payment failed:', response.error);
                onFailure(response.error);
            });

            rzp.open();

        } catch (error) {
            console.error('Payment initialization error:', error);
            toast.error('Failed to initialize payment. Please try again.');
            onFailure(error);
        } finally {
            setLoading(false);
        }
    };

    const paymentMethods = [
        { icon: Smartphone, label: 'UPI', description: 'GPay, PhonePe, Paytm, BHIM' },
        { icon: CreditCard, label: 'Cards', description: 'Visa, Mastercard, RuPay' },
        { icon: Wallet, label: 'Wallets', description: 'Amazon Pay, Mobikwik' },
        { icon: Banknote, label: 'Net Banking', description: 'All major banks' },
    ];

    return (
        <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Payment Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <span className="font-medium">{description}</span>
                        <span className="text-2xl font-bold text-primary">₹{amount}</span>
                    </div>

                    <Alert>
                        <AlertDescription>
                            <strong>Secure Payment:</strong> Your payment is protected by Razorpay's
                            industry-leading security. We never store your card details.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
                <CardHeader>
                    <CardTitle>Choose Payment Method</CardTitle>
                    <CardDescription>
                        Select from multiple secure payment options
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {paymentMethods.map((method, index) => (
                            <div
                                key={index}
                                className="flex flex-col items-center p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                            >
                                <method.icon className="w-8 h-8 text-primary mb-2" />
                                <span className="font-medium text-sm">{method.label}</span>
                                <span className="text-xs text-muted-foreground text-center">
                                    {method.description}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="text-center space-y-4">
                        <Button
                            onClick={handlePayment}
                            disabled={disabled || loading || !scriptLoaded}
                            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : !scriptLoaded ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Loading Payment System...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Pay ₹{amount} Securely
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-muted-foreground">
                            By proceeding, you agree to our terms and conditions.
                            Payments are processed securely by Razorpay.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
