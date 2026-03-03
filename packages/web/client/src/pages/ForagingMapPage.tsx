import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MapPin, Leaf } from "lucide-react";
import type { ForagingSpot } from "@shared/schema";
import { useLocation } from "wouter";
import { resolveImageUrl } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const plantTypes = ["all", "fruit", "vegetable", "herb", "nut", "berry", "mushroom", "edible-green"];
const seasons = ["all", "spring", "summer", "fall", "winter", "year-round"];

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="bg-muted rounded-md aspect-video flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Interactive map will display here</p>
                <p className="text-xs mt-1">Showing {filteredSpots?.length || 0} foraging spots</p>
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
        ) : filteredSpots && filteredSpots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      src={resolveImageUrl(spot.images[0])}
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
