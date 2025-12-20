import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/components/AuthProvider';
import { z } from 'zod';
import { Mail, CheckCircle2 } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [companyName, setCompanyName] = useState('');
  const [planType, setPlanType] = useState<'free' | 'paid'>('free');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email.trim()) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Please enter your email address',
        });
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: 'Check your email',
        description: 'We sent you a password reset link. Please check your inbox.',
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({ variant: 'destructive', title: 'Error', description: getUserFriendlyError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password });
      if (!validation.success) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: validation.error.errors[0].message,
        });
        return;
      }

      if (!isLogin && accountType === 'company' && !companyName.trim()) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Company name is required for company accounts',
        });
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;

        if (data.user) {
          // Check for active business subscription
          const { data: subscription } = await supabase
            .from('business_subscriptions')
            .select('*')
            .eq('user_id', data.user.id)
            .in('status', ['active', 'pending'])
            .maybeSingle();

          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in.'
          });

          // Route based on subscription status
          if (subscription && subscription.status === 'active') {
            navigate('/business-dashboard');
          } else if (subscription && subscription.status === 'pending') {
            navigate('/business-signup?status=pending');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              account_type: accountType,
              company_name: accountType === 'company' ? companyName : null,
              plan_type: planType,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Check if email confirmation is required
          if (data.session) {
            toast({
              title: 'Account created!',
              description: 'Your account has been created successfully.'
            });
            navigate('/dashboard');
          } else {
            // Email verification required - show pending state
            setEmailVerificationPending(true);
          }
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      const errorMessage = getUserFriendlyError(error);

      // If user already exists, suggest switching to login
      if (error?.message?.includes('User already registered')) {
        toast({
          variant: 'destructive',
          title: 'Account Already Exists',
          description: errorMessage
        });
        setIsLogin(true); // Auto-switch to login mode
      } else {
        toast({
          variant: 'destructive',
          title: isLogin ? 'Login Failed' : 'Signup Failed',
          description: errorMessage
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Email verification pending screen
  if (emailVerificationPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md p-8 space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground">
              We've sent a verification link to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>Click the link in your email to verify your account</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>After verification, you can sign in with your credentials</span>
            </div>
          </div>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmailVerificationPending(false);
                setIsLogin(true);
              }}
            >
              Back to Sign In
            </Button>
            <p className="text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => {
                  setEmailVerificationPending(false);
                  setIsLogin(false);
                }}
                className="text-primary hover:underline"
              >
                try again
              </button>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gradient-cyber">EventTix</h1>
          <p className="text-muted-foreground">
            {isForgotPassword
              ? 'Reset your password'
              : isLogin
                ? 'Welcome back! Sign in to continue'
                : 'Create your account to get started'}
          </p>
        </div>
        <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          {!isForgotPassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
          )}
          {!isLogin && !isForgotPassword && (
            <>
              <div className="space-y-3">
                <Label>Account Type</Label>
                <RadioGroup value={accountType} onValueChange={(value: any) => setAccountType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual" className="font-normal cursor-pointer">Individual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="company" id="company" />
                    <Label htmlFor="company" className="font-normal cursor-pointer">Company</Label>
                  </div>
                </RadioGroup>
              </div>
              {accountType === 'company' && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Company Name" />
                </div>
              )}
              <div className="space-y-3">
                <Label>Plan Type</Label>
                <RadioGroup value={planType} onValueChange={(value: any) => setPlanType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="free" id="free" />
                    <Label htmlFor="free" className="font-normal cursor-pointer">Free (200 tickets/month per event)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paid" id="paid" />
                    <Label htmlFor="paid" className="font-normal cursor-pointer">Paid (Unlimited tickets)</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Loading...' : isForgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>
        <div className="text-center space-y-2">
          {!isForgotPassword && isLogin && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-sm text-primary hover:underline block w-full"
            >
              Forgot password?
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsForgotPassword(false);
              setIsLogin(!isLogin);
            }}
            className="text-sm text-primary hover:underline"
          >
            {isForgotPassword ? 'Back to sign in' : isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
