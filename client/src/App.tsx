import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthGuard } from "@/components/AuthGuard";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import MarketplacePage from "@/pages/MarketplacePage";
import CreateListingPage from "@/pages/marketplace/CreateListingPage";
import EditListingPage from "@/pages/marketplace/EditListingPage";
import ForagingMapPage from "@/pages/ForagingMapPage";
import VendorsPage from "@/pages/VendorsPage";
import MembersPage from "@/pages/MembersPage";
import EventsPage from "@/pages/EventsPage";
import CreateEventPage from "@/pages/events/CreateEventPage";
import EditEventPage from "@/pages/events/EditEventPage";
import LearningPage from "@/pages/LearningPage";
import JobBoardPage from "@/pages/JobBoardPage";
import MessagesPage from "@/pages/MessagesPage";
import ProfilePage from "@/pages/ProfilePage";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
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
      
      <Route path="/foraging-map">
        <AuthGuard>
          <AuthenticatedLayout>
            <ForagingMapPage />
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
      
      <Route path="/members">
        <AuthGuard>
          <AuthenticatedLayout>
            <MembersPage />
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
      
      <Route path="/messages">
        <AuthGuard>
          <AuthenticatedLayout>
            <MessagesPage />
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
