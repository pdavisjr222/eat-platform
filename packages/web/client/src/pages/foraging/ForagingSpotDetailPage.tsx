import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MapPin,
  Leaf,
  CheckCircle,
  Pencil,
  Sun,
  Info,
  Navigation,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const plantTypeColors: Record<string, string> = {
  fruit:          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  vegetable:      "bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200",
  herb:           "bg-teal-100   text-teal-800   dark:bg-teal-900   dark:text-teal-200",
  nut:            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  berry:          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  mushroom:       "bg-amber-100  text-amber-800  dark:bg-amber-900  dark:text-amber-200",
  "edible-green": "bg-lime-100   text-lime-800   dark:bg-lime-900   dark:text-lime-200",
};

export default function ForagingSpotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const [activeImage, setActiveImage] = useState(0);

  const { data: spot, isLoading, error } = useQuery<any>({
    queryKey: ["/api/foraging-spots", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/foraging-spots/${id}`);
      return res.json();
    },
  });

  const { data: poster } = useQuery<any>({
    queryKey: ["/api/members", spot?.createdByUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/members/${spot.createdByUserId}`);
      return res.json();
    },
    enabled: !!spot?.createdByUserId,
  });

  const getInitials = (name: string) =>
    name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/foraging-map")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Foraging Map
        </Button>
        <Card className="p-12 text-center text-muted-foreground">Foraging spot not found.</Card>
      </div>
    );
  }

  const isOwner = (currentUser as any)?.id === spot.createdByUserId;
  const images: string[] = spot.images ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/foraging-map")} className="pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Foraging Map
      </Button>

      {/* Image gallery + info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Images */}
        <div className="space-y-2">
          <div className="aspect-square rounded-xl overflow-hidden bg-muted border">
            {images.length > 0 ? (
              <img
                src={images[activeImage]}
                alt={spot.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Leaf className="h-16 w-16 opacity-30" />
                <span className="text-sm">No images</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImage ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${plantTypeColors[spot.plantType] ?? "bg-muted text-muted-foreground"}`}>
              {spot.plantType.charAt(0).toUpperCase() + spot.plantType.slice(1).replace(/-/g, " ")}
            </span>
            {spot.isVerified && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Verified
              </span>
            )}
          </div>

          <h1 className="text-2xl font-serif font-bold leading-tight">{spot.title}</h1>

          {spot.species && (
            <p className="text-sm italic text-muted-foreground">{spot.species}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {(spot.country || spot.region) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {[spot.region, spot.country].filter(Boolean).join(", ")}
              </span>
            )}
            {spot.seasonality && (
              <span className="flex items-center gap-1">
                <Sun className="h-4 w-4" />
                {spot.seasonality}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Added {formatDate(spot.createdAt)}</p>

          {isOwner && (
            <Button onClick={() => setLocation(`/foraging-map/edit/${id}`)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Spot
            </Button>
          )}

          {poster && (
            <button
              onClick={() => setLocation(`/members/${poster.id}`)}
              className="flex items-center gap-3 w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={poster.profileImageUrl ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(poster.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Added by</p>
                <p className="font-medium text-sm truncate">{poster.name}</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {spot.description}
          </p>
        </CardContent>
      </Card>

      {/* Plant details */}
      {(spot.edibleParts || spot.benefits) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spot.edibleParts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Leaf className="h-4 w-4" /> Edible Parts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{spot.edibleParts}</p>
              </CardContent>
            </Card>
          )}
          {spot.benefits && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" /> Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{spot.benefits}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Access notes */}
      {spot.accessNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" /> Access Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{spot.accessNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Coordinates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {(spot.country || spot.region) && (
            <p>{[spot.region, spot.country].filter(Boolean).join(", ")}</p>
          )}
          <p className="font-mono text-xs">
            {Number(spot.latitude).toFixed(6)}, {Number(spot.longitude).toFixed(6)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
