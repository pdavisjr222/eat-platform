import { Switch, Route } from "wouter";
import { useEffect, useState } from "react";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { initStorage } from "@/lib/storage/init";
import { useAuth } from "@/lib/auth";
import { Mail, X } from "lucide-react";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import TermsOfServicePage from "@/pages/legal/TermsOfServicePage";
import PrivacyPolicyPage from "@/pages/legal/PrivacyPolicyPage";
import DashboardPage from "@/pages/DashboardPage";
import MarketplacePage from "@/pages/MarketplacePage";
import CreateListingPage from "@/pages/marketplace/CreateListingPage";
import EditListingPage from "@/pages/marketplace/EditListingPage";
import ListingDetailPage from "@/pages/marketplace/ListingDetailPage";
import ForagingMapPage from "@/pages/ForagingMapPage";
import VendorsPage from "@/pages/VendorsPage";
import MembersPage from "@/pages/MembersPage";
import EventsPage from "@/pages/EventsPage";
import CreateEventPage from "@/pages/events/CreateEventPage";
import EditEventPage from "@/pages/events/EditEventPage";
import CreateForagingSpotPage from "@/pages/foraging/CreateForagingSpotPage";
import EditForagingSpotPage from "@/pages/foraging/EditForagingSpotPage";
import ForagingSpotDetailPage from "@/pages/foraging/ForagingSpotDetailPage";
import MemberDetailPage from "@/pages/members/MemberDetailPage";
import EventDetailPage from "@/pages/events/EventDetailPage";
import CreateVendorPage from "@/pages/vendors/CreateVendorPage";
import EditVendorPage from "@/pages/vendors/EditVendorPage";
import VendorDetailPage from "@/pages/vendors/VendorDetailPage";
import LearningPage from "@/pages/LearningPage";
import JobBoardPage from "@/pages/JobBoardPage";
import CreateJobPage from "@/pages/jobs/CreateJobPage";
import EditJobPage from "@/pages/jobs/EditJobPage";
import JobDetailPage from "@/pages/jobs/JobDetailPage";
import MessagesPage from "@/pages/MessagesPage";
import ProfilePage from "@/pages/ProfilePage";
import EditProfilePage from "@/pages/EditProfilePage";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, setAuth, token } = useAuth();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Refresh user on mount so stale emailVerified state is corrected
  useEffect(() => {
    if (token) {
      apiRequest("GET", "/api/auth/me")
        .then((r) => r.json())
        .then((data) => { if (data.user) setAuth(data.user, token); })
        .catch(() => {});
    }
  }, [token]);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email: user?.email });
      return await res.json();
    },
  });

  const showBanner = !bannerDismissed && user && (user as any).emailVerified === false;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          {showBanner && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span className="text-yellow-800 dark:text-yellow-200">
                  Verify your email address to unlock all features.
                </span>
                <button
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending || resendMutation.isSuccess}
                  className="underline hover:no-underline text-yellow-700 dark:text-yellow-300 disabled:opacity-50"
                >
                  {resendMutation.isPending ? "Sending…" : resendMutation.isSuccess ? "Sent!" : "Resend email"}
                </button>
              </div>
              <button onClick={() => setBannerDismissed(true)} className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/auth/verify-email" component={VerifyEmailPage} />
      <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />
      <Route path="/terms" component={TermsOfServicePage} />
      <Route path="/privacy" component={PrivacyPolicyPage} />
      
      <Route path="/">
        <AuthGuard>
          <AuthenticatedLayout>
            <DashboardPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>
      
      <Route path="/marketplace">
        <AuthGuard>
          <AuthenticatedLayout>
            <MarketplacePage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/marketplace/create">
        <AuthGuard>
          <AuthenticatedLayout>
            <CreateListingPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/marketplace/edit/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <EditListingPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/marketplace/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <ListingDetailPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/foraging-map">
        <AuthGuard>
          <AuthenticatedLayout>
            <ForagingMapPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/foraging-map/create">
        <AuthGuard>
          <AuthenticatedLayout>
            <CreateForagingSpotPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/foraging-map/edit/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <EditForagingSpotPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/foraging-map/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <ForagingSpotDetailPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/vendors">
        <AuthGuard>
          <AuthenticatedLayout>
            <VendorsPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/vendors/create">
        <AuthGuard>
          <AuthenticatedLayout>
            <CreateVendorPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/vendors/edit/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <EditVendorPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/vendors/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <VendorDetailPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>
      
      <Route path="/members">
        <AuthGuard>
          <AuthenticatedLayout>
            <MembersPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/members/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <MemberDetailPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>
      
      <Route path="/events">
        <AuthGuard>
          <AuthenticatedLayout>
            <EventsPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/events/create">
        <AuthGuard>
          <AuthenticatedLayout>
            <CreateEventPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/events/edit/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <EditEventPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/events/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <EventDetailPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>
      
      <Route path="/learning">
        <AuthGuard>
          <AuthenticatedLayout>
            <LearningPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>
      
      <Route path="/jobs">
        <AuthGuard>
          <AuthenticatedLayout>
            <JobBoardPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/jobs/create">
        <AuthGuard>
          <AuthenticatedLayout>
            <CreateJobPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/jobs/edit/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <EditJobPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/jobs/:id">
        <AuthGuard>
          <AuthenticatedLayout>
            <JobDetailPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/messages">
        <AuthGuard>
          <AuthenticatedLayout>
            <MessagesPage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>
      
      <Route path="/profile/edit">
        <AuthGuard>
          <AuthenticatedLayout>
            <EditProfilePage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>

      <Route path="/profile">
        <AuthGuard>
          <AuthenticatedLayout>
            <ProfilePage />
          </AuthenticatedLayout>
        </AuthGuard>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  useEffect(() => {
    initStorage().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
