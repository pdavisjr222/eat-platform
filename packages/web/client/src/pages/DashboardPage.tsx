import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, MapPin, ShoppingBag, Copy, Check, Leaf, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Event, Listing, ForagingSpot } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/upcoming"],
  });

  const { data: nearbyListings, isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings/nearby"],
  });

  const { data: newForagingSpots, isLoading: spotsLoading } = useQuery<ForagingSpot[]>({
    queryKey: ["/api/foraging-spots/recent"],
  });

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="relative min-h-full">
      {/* Hero background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/bg-hero.png)" }}
      />
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />

      <div className="relative p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your sustainable community
          </p>
        </div>

        {/* Garden Club CTA */}
        <div
          className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-green-700 to-emerald-500 p-6 text-white cursor-pointer hover:opacity-95 transition-opacity"
          onClick={() => setLocation("/garden-clubs")}
        >
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-6xl opacity-20 select-none">🌿</div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold mb-1">Find or Start a Garden Club</h2>
                <p className="text-green-100 text-sm">Neighbors growing &amp; sharing food &amp; seed</p>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-white/70 flex-shrink-0" />
          </div>
        </div>

        {/* Credit Balance + Referral Code — combined card */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Credits */}
              <div className="flex-shrink-0">
                <p className="text-sm font-medium text-muted-foreground mb-1">Credit Balance</p>
                <div className="text-4xl font-bold text-primary">{user?.creditBalance || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Available for rewards</p>
              </div>

              <div className="hidden sm:block w-px self-stretch bg-border" />
              <div className="sm:hidden h-px w-full bg-border" />

              {/* Referral code */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-2">Your Referral Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 px-3 py-2 bg-muted rounded-md text-base font-mono font-semibold truncate">
                    {user?.referralCode || "Generating..."}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyReferralCode}
                    data-testid="button-copy-referral"
                  >
                    {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share to earn credits when friends join
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accordion sections */}
        <Accordion type="multiple" defaultValue={["events"]} className="space-y-3">
          {/* Upcoming Events */}
          <AccordionItem value="events" className="border rounded-xl bg-card/50 backdrop-blur-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Events
                {upcomingEvents && upcomingEvents.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{upcomingEvents.length}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : upcomingEvents && upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-md border hover-elevate cursor-pointer"
                      onClick={() => setLocation(`/events/${event.id}`)}
                      data-testid={`card-event-${event.id}`}
                    >
                      <h4 className="font-semibold text-sm mb-0.5">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.startDateTime).toLocaleDateString()} • {event.type}
                      </p>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setLocation("/events")}>
                    View all events
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Nearby Listings */}
          <AccordionItem value="listings" className="border rounded-xl bg-card/50 backdrop-blur-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Nearby Listings
                {nearbyListings && nearbyListings.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{nearbyListings.length}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {listingsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : nearbyListings && nearbyListings.length > 0 ? (
                <div className="space-y-2">
                  {nearbyListings.slice(0, 5).map((listing) => (
                    <div
                      key={listing.id}
                      className="p-3 rounded-md border hover-elevate cursor-pointer"
                      onClick={() => setLocation(`/marketplace/${listing.id}`)}
                      data-testid={`card-listing-${listing.id}`}
                    >
                      <h4 className="font-semibold text-sm mb-1">{listing.title}</h4>
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="secondary" className="text-xs">{listing.type}</Badge>
                        {listing.price && (
                          <span className="font-semibold text-primary">${listing.price}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setLocation("/marketplace")}>
                    View marketplace
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No nearby listings</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* New Foraging Spots */}
          <AccordionItem value="spots" className="border rounded-xl bg-card/50 backdrop-blur-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="h-5 w-5 text-primary" />
                New Foraging Spots
                {newForagingSpots && newForagingSpots.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{newForagingSpots.length}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {spotsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : newForagingSpots && newForagingSpots.length > 0 ? (
                <div className="space-y-2">
                  {newForagingSpots.slice(0, 5).map((spot) => (
                    <div
                      key={spot.id}
                      className="p-3 rounded-md border hover-elevate cursor-pointer"
                      onClick={() => setLocation(`/foraging-map/${spot.id}`)}
                      data-testid={`card-spot-${spot.id}`}
                    >
                      <h4 className="font-semibold text-sm mb-1">{spot.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{spot.plantType}</span>
                        <Badge variant="outline" className="text-xs">{spot.seasonality || "Year-round"}</Badge>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setLocation("/foraging-map")}>
                    View foraging map
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No new foraging spots</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
