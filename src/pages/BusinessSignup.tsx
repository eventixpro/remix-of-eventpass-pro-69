import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/components/AuthProvider';
import { Ticket, ArrowLeft, Building2, CreditCard, Check, Loader2 } from 'lucide-react';

const signupSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  companyEmail: z.string().email('Invalid email address'),
  companyPhone: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  plan: z.enum(['monthly', 'annual', 'pay_as_you_go']),
});

type SignupFormData = z.infer<typeof signupSchema>;

const planDetails = {
  monthly: { name: 'Monthly', price: '₹2,999/month', priceValue: 2999 },
  annual: { name: 'Annual', price: '₹24,999/year', priceValue: 24999 },
  pay_as_you_go: { name: 'Pay As You Go', price: '₹499/event', priceValue: 499 },
};

const BusinessSignup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');

  const defaultPlan = (searchParams.get('plan') as keyof typeof planDetails) || 'monthly';

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      companyName: '',
      companyEmail: '',
      companyPhone: '',
      email: '',
      password: '',
      plan: defaultPlan,
    },
  });

  useEffect(() => {
    if (user) {
      // User is already logged in, check if they have a subscription
      checkExistingSubscription();
    }
  }, [user]);

  const checkExistingSubscription = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('business_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      toast({
        title: 'Subscription exists',
        description: 'You already have a business subscription.',
      });
      navigate('/dashboard');
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      let userId = user?.id;

      // If not logged in, create account
      if (!user) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              account_type: 'company',
              company_name: data.companyName,
              plan_type: data.plan,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create account');
        userId = authData.user.id;
      }

      // Create subscription
      const now = new Date();
      const expiresAt = data.plan === 'annual' 
        ? new Date(now.setFullYear(now.getFullYear() + 1))
        : data.plan === 'monthly'
        ? new Date(now.setMonth(now.getMonth() + 1))
        : null;

      const { error: subError } = await supabase.from('business_subscriptions').insert({
        user_id: userId,
        company_name: data.companyName,
        company_email: data.companyEmail,
        company_phone: data.companyPhone || null,
        plan: data.plan,
        status: 'pending',
        price_per_month: planDetails[data.plan].priceValue,
        events_limit: data.plan === 'pay_as_you_go' ? 1 : null,
        started_at: new Date().toISOString(),
        expires_at: expiresAt?.toISOString() || null,
      });

      if (subError) throw subError;

      setStep('payment');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockPayment = async () => {
    setIsLoading(true);
    try {
      // Mock payment - update subscription status to active
      const { error } = await supabase
        .from('business_subscriptions')
        .update({ status: 'active' })
        .eq('user_id', user?.id);

      if (error) throw error;

      setStep('success');
      toast({
        title: 'Payment Successful!',
        description: 'Your business account is now active.',
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlan = form.watch('plan');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <Ticket className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-gradient-cyber">EventTix</span>
          </Link>
          <Link to="/pricing">
            <Button variant="ghost" className="hover:text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pricing
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'details' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'details' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>
                {step !== 'details' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="hidden sm:inline">Details</span>
            </div>
              <div className="w-12 h-px bg-border" />
              <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-primary text-primary-foreground' : step === 'success' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                  {step === 'success' ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <span className="hidden sm:inline">Payment</span>
              </div>
              <div className="w-12 h-px bg-border" />
              <div className={`flex items-center gap-2 ${step === 'success' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'success' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  3
                </div>
                <span className="hidden sm:inline">Complete</span>
              </div>
            </div>
          </div>

          {step === 'details' && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Building2 className="w-5 h-5 text-primary" />
                  Business Registration
                </CardTitle>
                <CardDescription>
                  Create your business account to start organizing events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Plan Selection */}
                    <FormField
                      control={form.control}
                      name="plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Plan</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                            >
                              {Object.entries(planDetails).map(([key, plan]) => (
                                <div key={key}>
                                  <RadioGroupItem
                                    value={key}
                                    id={key}
                                    className="peer sr-only"
                                  />
                                  <Label
                                    htmlFor={key}
                                    className="flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card p-4 hover:bg-muted cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                  >
                                    <span className="font-semibold text-foreground">{plan.name}</span>
                                    <span className="text-sm text-muted-foreground">{plan.price}</span>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Company Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Company Details</h3>
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Company Ltd." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companyEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="contact@company.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="companyPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="+91 98765 43210" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Account Details */}
                    {!user && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">Account Details</h3>
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="you@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Continue to Payment
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {step === 'payment' && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payment
                </CardTitle>
                <CardDescription>
                  Complete your subscription payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Summary */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <h4 className="font-semibold mb-2 text-foreground">Order Summary</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{planDetails[selectedPlan].name} Plan</span>
                    <span>{planDetails[selectedPlan].price}</span>
                  </div>
                  <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold text-foreground">
                    <span>Total</span>
                    <span className="text-primary">{planDetails[selectedPlan].price}</span>
                  </div>
                </div>

                {/* Mock Payment Form */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 text-center">
                    <p className="text-muted-foreground mb-2">
                      🧪 This is a mock payment for testing
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click the button below to simulate a successful payment
                    </p>
                  </div>

                  <Button
                    onClick={handleMockPayment}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Complete Mock Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'success' && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome Aboard!</h2>
                <p className="text-muted-foreground mb-6">
                  Your business account has been activated. Redirecting to dashboard...
                </p>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessSignup;
