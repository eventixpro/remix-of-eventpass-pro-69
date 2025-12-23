import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { MobileNavigation } from "@/components/MobileNavigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateEvent from "./pages/CreateEvent";
import Events from "./pages/Events";
import Scan from "./pages/Scan";
import Attendance from "./pages/Attendance";
import TicketManagement from "./pages/TicketManagement";
import TicketViewer from "./pages/TicketViewer";
import PublicEvent from "./pages/PublicEvent";
import PublicEvents from "./pages/PublicEvents";
import Dashboard from "./pages/Dashboard";
import AdminEvents from "./pages/AdminEvents";
import AdminDashboard from "./pages/AdminDashboard";
import EventCustomizationPage from "./pages/EventCustomizationPage";
import Pricing from "./pages/Pricing";
import BusinessSignup from "./pages/BusinessSignup";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import BusinessDashboard from "./pages/BusinessDashboard";
import BankAccounts from "./pages/BankAccounts";
import NotFound from "./pages/NotFound";
import AuthRoute from "@/components/RouteGuards/AuthRoute";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import MobileSettings from "./pages/MobileSettings";
import Analytics from "./pages/Analytics";
import GlobalTickets from "./pages/GlobalTickets";
import PendingTicket from "./pages/PendingTicket";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/business-signup" element={<BusinessSignup />} />
              <Route path="/e/:eventId" element={<PublicEvent />} />
              <Route path="/e/:eventId/pending" element={<PendingTicket />} />
              <Route path="/public-events" element={<PublicEvents />} />
              <Route path="/ticket/:ticketId" element={<TicketViewer />} />

              {/* Protected Routes */}
              <Route path="/create-event" element={<AuthRoute><CreateEvent /></AuthRoute>} />
              <Route path="/events" element={<AuthRoute><Events /></AuthRoute>} />
              <Route path="/event/:eventId/tickets" element={<AuthRoute><TicketManagement /></AuthRoute>} />
              <Route path="/event/:eventId/customize" element={<AuthRoute><EventCustomizationPage /></AuthRoute>} />
              <Route path="/scan" element={<AuthRoute><Scan /></AuthRoute>} />
              <Route path="/attendance" element={<AuthRoute><Attendance /></AuthRoute>} />
              <Route path="/dashboard" element={<AuthRoute><Dashboard /></AuthRoute>} />
              <Route path="/business-dashboard" element={<AuthRoute><BusinessDashboard /></AuthRoute>} />
              <Route path="/bank-accounts" element={<AuthRoute><BankAccounts /></AuthRoute>} />
              <Route path="/admin" element={<AuthRoute><AdminDashboard /></AuthRoute>} />
              <Route path="/admin/events" element={<AuthRoute><AdminEvents /></AuthRoute>} />
              <Route path="/admin/subscriptions" element={<AuthRoute><AdminSubscriptions /></AuthRoute>} />
              <Route path="/mobile-settings" element={<AuthRoute><MobileSettings /></AuthRoute>} />
              <Route path="/analytics" element={<AuthRoute><Analytics /></AuthRoute>} />
              <Route path="/global-tickets" element={<AuthRoute><GlobalTickets /></AuthRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileNavigation />
          </div>
        </BrowserRouter>
        <PWAInstallPrompt />
        <PWAUpdateNotification />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
