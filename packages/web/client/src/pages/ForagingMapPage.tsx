import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Leaf } from "lucide-react";
import type { ForagingSpot } from "@shared/schema";
import { useLocation } from "wouter";
import { getMediaUrl } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Fix Leaflet default marker icons in Vite builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const plantTypes = ["all", "fruit", "vegetable", "herb", "nut", "berry", "mushroom", "edible-green"];
const seasons = ["all", "spring", "summer", "fall", "winter", "year-round"];

function FitBounds({ spots }: { spots: ForagingSpot[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = spots
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => [s.latitude!, s.longitude!] as [number, number]);
    if (coords.length === 1) {
      map.setView(coords[0], 10);
    } else if (coords.length > 1) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots.length]);
  return null;
}

export default function ForagingMapPage() {
  const [, setLocation] = useLocation();
  const [selectedPlantType, setSelectedPlantType] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");

  const { data: foragingSpots, isLoading } = useQuery<{ data: ForagingSpot[]; pagination: any }, Error, ForagingSpot[]>({
    queryKey: ["/api/foraging-spots"],
    select: (res) => res.data,
  });

  const filteredSpots = foragingSpots?.filter((spot) => {
    const matchesType = selectedPlantType === "all" || spot.plantType === selectedPlantType;
    const matchesSeason = selectedSeason === "all" || spot.seasonality?.toLowerCase().includes(selectedSeason);
    return matchesType && matchesSeason;
  });

  const spotsWithCoords = filteredSpots?.filter((s) => s.latitude != null && s.longitude != null) ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
            Foraging Map
          </h1>
          <p className="text-muted-foreground">
            Discover wild edible plants and fruit trees in your area
          </p>
        </div>
        <Button
          onClick={() => setLocation("/foraging-map/create")}
          data-testid="button-create-spot"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Foraging Spot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="overflow-hidden">
            <div className="h-[588px] w-full relative">
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {spotsWithCoords.map((spot) => (
                  <Marker key={spot.id} position={[spot.latitude!, spot.longitude!]}>
                    <Popup>
                      <div className="min-w-[160px]">
                        <p className="font-semibold text-sm mb-1">{spot.title}</p>
                        <p className="text-xs text-gray-500 mb-1 capitalize">{spot.plantType}</p>
                        {spot.seasonality && (
                          <p className="text-xs text-gray-400 mb-2">{spot.seasonality}</p>
                        )}
                        <button
                          onClick={() => setLocation(`/foraging-map/${spot.id}`)}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          View details →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {(filteredSpots?.length ?? 0) > 0 && <FitBounds spots={filteredSpots ?? []} />}
              </MapContainer>
              <div className="absolute bottom-2 left-2 z-[1000] bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground border pointer-events-none">
                {spotsWithCoords.length} spot{spotsWithCoords.length !== 1 ? "s" : ""} on map
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Plant Type</label>
              <Select value={selectedPlantType} onValueChange={setSelectedPlantType}>
                <SelectTrigger data-testid="select-plant-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plantTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Season</label>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger data-testid="select-season">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season} value={season}>
                      {season.charAt(0).toUpperCase() + season.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-serif font-bold mb-4">Foraging Spots</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        ) : filteredSpots && filteredSpots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpots.map((spot) => (
              <Card
                key={spot.id}
                className="hover-elevate cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/foraging-map/${spot.id}`)}
                data-testid={`card-spot-${spot.id}`}
              >
                <div className="aspect-video bg-muted relative">
                  {spot.images && spot.images.length > 0 ? (
                    <img
                      src={getMediaUrl(spot.images[0])}
                      alt={spot.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Leaf className="h-12 w-12" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2" variant="secondary">
                    {spot.plantType}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{spot.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {spot.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {spot.edibleParts && (
                      <Badge variant="outline" className="text-xs">
                        {spot.edibleParts}
                      </Badge>
                    )}
                    {spot.seasonality && (
                      <Badge variant="outline" className="text-xs">
                        {spot.seasonality}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <Leaf className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No foraging spots found</p>
              <Button onClick={() => setLocation("/foraging-map/create")}>
                Add Your First Spot
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
