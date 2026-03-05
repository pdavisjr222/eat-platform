import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening in your sustainable community
        </p>
      </div>

      {/* Garden Club CTA — first prominent action */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Credit Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary mb-2">
              {user?.creditBalance || 0}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Credits available for rewards
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Referral Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-2 bg-muted rounded-md text-lg font-mono font-semibold">
                {user?.referralCode || "Generating..."}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={copyReferralCode}
                data-testid="button-copy-referral"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Share this code with friends to earn credits when they join
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Events
              </CardTitle>
            </div>
            <CardDescription>Events happening soon in your area</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-md border hover-elevate cursor-pointer"
                    data-testid={`card-event-${event.id}`}
                  >
                    <h4 className="font-semibold text-sm mb-1">{event.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.startDateTime).toLocaleDateString()} • {event.type}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming events
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Nearby Listings
              </CardTitle>
            </div>
            <CardDescription>Recent marketplace activity</CardDescription>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : nearbyListings && nearbyListings.length > 0 ? (
              <div className="space-y-3">
                {nearbyListings.slice(0, 3).map((listing) => (
                  <div
                    key={listing.id}
                    className="p-3 rounded-md border hover-elevate cursor-pointer"
                    data-testid={`card-listing-${listing.id}`}
                  >
                    <h4 className="font-semibold text-sm mb-1">{listing.title}</h4>
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="secondary" className="text-xs">
                        {listing.type}
                      </Badge>
                      {listing.price && (
                        <span className="font-semibold text-primary">
                          ${listing.price}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No nearby listings
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              New Foraging Spots
            </CardTitle>
          </div>
          <CardDescription>Recently added spots in your region</CardDescription>
        </CardHeader>
        <CardContent>
          {spotsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : newForagingSpots && newForagingSpots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newForagingSpots.slice(0, 3).map((spot) => (
                <div
                  key={spot.id}
                  className="p-4 rounded-md border hover-elevate cursor-pointer"
                  data-testid={`card-spot-${spot.id}`}
                >
                  <h4 className="font-semibold mb-2">{spot.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {spot.plantType}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {spot.seasonality || "Year-round"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No new foraging spots
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
