import { Home, Map, ShoppingBag, Users, Book, Calendar, Briefcase, Sprout, MessageSquare, User, Leaf, Sparkles, Mail } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const allNavigationItems = [
  { title: "Dashboard",    url: "/",             icon: Home,         memberOnly: true  },
  { title: "Marketplace",  url: "/marketplace",  icon: ShoppingBag,  memberOnly: false },
  { title: "Foraging Map", url: "/foraging-map", icon: Map,          memberOnly: true  },
  { title: "Vendors",      url: "/vendors",      icon: Sprout,       memberOnly: false },
  { title: "Members",      url: "/members",      icon: Users,        memberOnly: true  },
  { title: "Events",       url: "/events",       icon: Calendar,     memberOnly: true  },
  { title: "Learning Hub", url: "/learning",     icon: Book,         memberOnly: true  },
  { title: "Job Board",    url: "/jobs",         icon: Briefcase,    memberOnly: false },
  { title: "Messages",     url: "/messages",     icon: MessageSquare,memberOnly: false },
  { title: "Garden Club",  url: "/garden-clubs", icon: Leaf,         memberOnly: false },
  { title: "Profile",      url: "/profile",      icon: User,         memberOnly: true  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const { toast } = useToast();
  const [resent, setResent] = useState(false);

  // A "member" is a user whose email has been verified
  const isMember = (user as any)?.emailVerified === true;

  const navigationItems = allNavigationItems.filter(
    (item) => !item.memberOnly || isMember
  );

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email: user?.email });
      return res.json();
    },
    onSuccess: () => {
      setResent(true);
      toast({ title: "Email sent!", description: "Check your inbox for the verification link." });
    },
    onError: () => {
      toast({ title: "Couldn't send email", description: "Please try again in a moment.", variant: "destructive" });
    },
  });

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xl font-serif font-bold text-primary px-4 py-5">
            E.A.T.
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="text-lg py-3 h-auto [&_svg]:h-6 [&_svg]:w-6"
                    data-testid={`link-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url} onClick={() => isMobile && setOpenMobile(false)}>
                      <item.icon className="h-6 w-6" />
                      <span className="font-semibold">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Become a Member prompt — only shown to unverified users */}
      {!isMember && (
        <SidebarFooter className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-semibold">Become a Member</p>
            </div>
            <p className="text-xs text-green-100 mb-3 leading-relaxed">
              Verify your email to unlock the full E.A.T. community — events, foraging map, learning hub, and more.
            </p>
            <button
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending || resent}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-60 transition-colors px-3 py-2 text-xs font-medium"
            >
              <Mail className="h-3.5 w-3.5" />
              {resent ? "Email sent — check inbox" : resendMutation.isPending ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
