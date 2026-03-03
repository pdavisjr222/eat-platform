import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Calendar as CalendarIcon, MapPin, Users } from "lucide-react";
import type { Event } from "@shared/schema";
import { useLocation } from "wouter";

const eventTypes = ["all", "workshop", "farmersMarket", "ecoTour", "onlineWebinar"];

export default function EventsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const { data: events, isLoading } = useQuery<{ data: Event[]; pagination: any }, Error, Event[]>({
    queryKey: ["/api/events"],
    select: (res) => res.data,
  });

  const filteredEvents = events?.filter((event) => {
    const matchesSearch = !searchQuery || event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || event.type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatEventDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.toLocaleString("default", { month: "short" }),
      time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Events
          </h1>
          <p className="text-muted-foreground">
            Discover workshops, markets, eco-tours, and community gatherings
          </p>
        </div>
        <Button
          onClick={() => setLocation("/events/create")}
          data-testid="button-create-event"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-events"
              />
            </div>
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger data-testid="select-event-type">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "all" ? "All Types" : type.replace(/([A-Z])/g, " $1").trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full rounded-t-md" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const eventDate = formatEventDate(event.startDateTime);
            return (
              <Card
                key={event.id}
                className="hover-elevate cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/events/${event.id}`)}
                data-testid={`card-event-${event.id}`}
              >
                <div className="aspect-video bg-muted relative">
                  {((event as any).images?.[0] ?? event.imageUrl) ? (
                    <img
                      src={(event as any).images?.[0] ?? event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <CalendarIcon className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-md p-2 text-center min-w-[60px]">
                    <div className="text-2xl font-bold">{eventDate.day}</div>
                    <div className="text-xs uppercase">{eventDate.month}</div>
                  </div>
                  <Badge className="absolute top-2 right-2">
                    {event.type.replace(/([A-Z])/g, " $1").trim()}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {event.description}
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <CalendarIcon className="h-3 w-3 mr-2" />
                      {eventDate.time}
                    </div>
                    {!event.locationOnline && event.locationAddress && (
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-2" />
                        {event.locationAddress}
                      </div>
                    )}
                    {event.locationOnline && (
                      <Badge variant="outline" className="text-xs">
                        Online Event
                      </Badge>
                    )}
                  </div>
                </CardContent>
                {event.capacity && (
                  <CardFooter className="px-4 py-3 bg-muted/30 border-t">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Users className="h-3 w-3 mr-1" />
                      Capacity: {event.capacity}
                    </div>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No events found</p>
            <Button onClick={() => setLocation("/events/create")}>
              Create Your First Event
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
