import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Leaf, MapPin, Users, Search, Plus, Mail, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GardenClub {
  id: string;
  name: string;
  description: string;
  city?: string;
  region?: string;
  country?: string;
  email?: string;
  website?: string;
  meetingSchedule?: string;
  memberCount?: number;
  imageUrl?: string;
}

const emptyForm = { name: "", description: "", city: "", country: "", region: "", email: "", website: "", meetingSchedule: "" };

export default function GardenClubsPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: GardenClub[] }>({
    queryKey: ["/api/garden-clubs"],
    retry: false,
  });

  const clubs: GardenClub[] = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: async (body: typeof emptyForm) => {
      const res = await apiRequest("POST", "/api/garden-clubs", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/garden-clubs"] });
      toast({ title: "Garden Club created!", description: "Your club is now listed." });
      setShowCreate(false);
      setForm(emptyForm);
    },
    onError: () => {
      toast({ title: "Failed to create club", variant: "destructive" });
    },
  });

  const field = (key: keyof typeof emptyForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const filtered = clubs.filter((c) =>
    [c.name, c.city, c.country, c.description].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6 space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-8 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-9xl">🌿</div>
          <div className="absolute bottom-4 left-8 text-7xl">🥕</div>
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="h-6 w-6" />
            <span className="text-green-100 font-medium uppercase text-sm tracking-wider">Garden Clubs</span>
          </div>
          <h1 className="text-4xl font-serif font-bold mb-3">
            Neighbors Growing &amp; Sharing Food &amp; Seed
          </h1>
          <p className="text-green-100 text-lg mb-6">
            Connect with local growers, share seeds, swap produce, and build a stronger food community in your neighborhood.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              className="bg-white text-green-700 hover:bg-green-50 font-semibold"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Start a Garden Club
            </Button>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => howItWorksRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div ref={howItWorksRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "🌱", title: "Grow Together", desc: "Share knowledge, tools, and growing tips with neighbors" },
          { icon: "🌾", title: "Share the Harvest", desc: "Exchange surplus produce and reduce food waste" },
          { icon: "🫘", title: "Seed Library", desc: "Save, swap, and preserve heirloom seed varieties" },
        ].map((item) => (
          <Card key={item.title} className="text-center p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowCreate(true)}>
            <div className="text-4xl mb-3">{item.icon}</div>
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-serif font-bold flex-1">Find a Club Near You</h2>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Start a Club
          </Button>
        </div>
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by city, country, or name..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Club list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((club) => (
            <Card key={club.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mr-3 flex-shrink-0">
                    <Leaf className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base leading-tight">{club.name}</CardTitle>
                    {(club.city || club.country) && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {[club.city, club.country].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {club.memberCount && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {club.memberCount} members
                    </span>
                  )}
                  {club.meetingSchedule && (
                    <Badge variant="outline" className="text-xs">{club.meetingSchedule}</Badge>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  {club.email && (
                    <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                      <a href={`mailto:${club.email}`}>
                        <Mail className="h-3 w-3 mr-1" />
                        Contact
                      </a>
                    </Button>
                  )}
                  {club.website && (
                    <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                      <a href={club.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-3 w-3 mr-1" />
                        Website
                      </a>
                    </Button>
                  )}
                  {!club.email && !club.website && (
                    <Button size="sm" variant="outline" className="w-full text-xs">View Details</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-xl font-semibold mb-2">
              {search ? "No clubs found" : "No clubs yet in your area"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {search
                ? "Try a different search term"
                : "Be the first to start a Garden Club in your community!"}
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start a Garden Club
            </Button>
          </div>
        </Card>
      )}

      {/* Create Garden Club Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start a Garden Club</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Club Name *</Label>
              <Input placeholder="e.g. Brooklyn Seed Savers" {...field("name")} />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea placeholder="What does your club do?" rows={3} {...field("description")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>City</Label>
                <Input placeholder="City" {...field("city")} />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input placeholder="Country" {...field("country")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Meeting Schedule</Label>
              <Input placeholder="e.g. Every 2nd Saturday" {...field("meetingSchedule")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input placeholder="contact@club.org" type="email" {...field("email")} />
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input placeholder="https://..." {...field("website")} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name.trim() || !form.description.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
