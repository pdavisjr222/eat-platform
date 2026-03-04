import { Home, Map, ShoppingBag, Users, Book, Calendar, Briefcase, Sprout, MessageSquare, User, Leaf } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

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
  { title: "Garden Club",  url: "/garden-clubs", icon: Leaf,         memberOnly: true  },
  { title: "Profile",      url: "/profile",      icon: User,         memberOnly: true  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  // A "member" is a user whose email has been verified
  const isMember = (user as any)?.emailVerified === true;

  const navigationItems = allNavigationItems.filter(
    (item) => !item.memberOnly || isMember
  );

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-serif font-bold text-primary px-4 py-4">
            E.A.T.
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
