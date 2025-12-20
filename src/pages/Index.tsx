import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Ticket, QrCode, Sparkles, LogOut, Shield, Building2 } from 'lucide-react';
import heroImage from '@/assets/eventtix-hero.jpg';
import { supabase } from '@/integrations/supabase/safeClient';

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-primary/20 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Ticket className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600">EventTix</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" className="border-primary/50 hover:border-primary">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link to="/events">
                  <Button variant="ghost" className="hover:text-cyan-400">My Events</Button>
                </Link>
                <Link to="/create-event">
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]">Create Event</Button>
                </Link>
                <Link to="/scan">
                  <Button variant="ghost" size="icon" className="hover:text-cyan-400">
                    <QrCode className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-400">
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/pricing">
                  <Button variant="ghost" className="hover:text-cyan-400">
                    <Building2 className="w-4 h-4 mr-2" />
                    For Business
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="ghost" className="hover:text-cyan-400">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]">Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-gradient-x">
                  Digital Tickets
                </span>
                <br />
                <span className="text-white">For The Future</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
                Create stunning event tickets with QR codes. Secure, beautiful, and easy to validate.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={user ? "/create-event" : "/auth"}>
                  <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white border-0 shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all hover:scale-105">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Event
                  </Button>
                </Link>
                <Link to="/public-events">
                  <Button variant="outline" size="lg" className="h-14 px-8 text-lg border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all">
                    View Events
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <img
                src={heroImage}
                alt="Digital event tickets"
                className="relative w-full rounded-2xl border border-white/10 shadow-2xl transform transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-black/50 backdrop-blur-sm border-y border-white/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
              Everything You Need
            </span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-cyan-500/50 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                <Ticket className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Flexible Ticketing</h3>
              <p className="text-gray-400">Create free or paid events with multiple ticket tiers. VIP, Early Bird, or General Admission - you decide.</p>
            </div>
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-purple-500/50 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                <QrCode className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Secure Validation</h3>
              <p className="text-gray-400">Every ticket gets a unique, encrypted QR code. Scan and validate instantly with our built-in scanner.</p>
            </div>
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-pink-500/50 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center mb-6 group-hover:bg-pink-500/20 transition-colors">
                <Shield className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Fraud Protection</h3>
              <p className="text-gray-400">Prevent duplicate entries and fake tickets. Real-time sync ensures each ticket is used exactly once.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ticket Options Showcase */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Choose Your Experience</h2>
            <p className="text-gray-400">Support for all ticket types and pass configurations</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Standard Pass */}
            <div className="relative p-6 rounded-xl border border-white/10 bg-black/40 hover:transform hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-500 to-gray-700 rounded-t-xl" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">General Admission</h3>
                  <p className="text-sm text-gray-400">Standard Access</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white">FREE</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-400">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-500" />Entry to main event</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-500" />Digital QR Ticket</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-500" />Standard Support</li>
              </ul>
              <Button variant="outline" className="w-full border-white/20 hover:bg-white/10">Select Option</Button>
            </div>

            {/* VIP Pass */}
            <div className="relative p-6 rounded-xl border border-purple-500/30 bg-purple-900/10 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">VIP Access</h3>
                  <p className="text-sm text-purple-300">Premium Experience</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">₹2,499</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-300">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400" />Priority Entry</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400" />Backstage Access</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400" />Exclusive Merch</li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0">Select Option</Button>
            </div>

            {/* Season Pass */}
            <div className="relative p-6 rounded-xl border border-cyan-500/30 bg-cyan-900/10 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-t-xl" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Season Pass</h3>
                  <p className="text-sm text-cyan-300">All Access</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300">₹9,999</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-300">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Unlimited Events</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Guest Passes (x2)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />24/7 Concierge</li>
              </ul>
              <Button variant="outline" className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300">Select Option</Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Index;