import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MapPin } from "lucide-react";
import type { Listing } from "@shared/schema";
import { useLocation } from "wouter";

const listingTypes = ["all", "sell", "buy", "trade", "barter", "rent", "lease"];
const categories = ["all", "food", "seeds", "plants", "spices", "handmade", "realEstate", "ecoTravel", "service"];

export default function MarketplacePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: listings, isLoading } = useQuery<{ data: Listing[]; pagination: any }, Error, Listing[]>({
    queryKey: ["/api/listings"],
    select: (res) => res.data,
  });

  const filteredListings = listings?.filter((listing) => {
    const matchesSearch = !searchQuery || listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || listing.type === selectedType;
    const matchesCategory = selectedCategory === "all" || listing.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Marketplace
          </h1>
          <p className="text-muted-foreground">
            Buy, sell, trade, and barter with the community
          </p>
        </div>
        <Button
          onClick={() => setLocation("/marketplace/create")}
          data-testid="button-create-listing"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Listing
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-listings"
              />
            </div>
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger data-testid="select-listing-type">
              <SelectValue placeholder="Listing Type" />
            </SelectTrigger>
            <SelectContent>
              {listingTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
      ) : filteredListings && filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <Card
              key={listing.id}
              className="hover-elevate overflow-hidden cursor-pointer"
              data-testid={`card-listing-${listing.id}`}
              onClick={() => setLocation(`/marketplace/${listing.id}`)}
            >
              <div className="aspect-video bg-muted relative">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
                <Badge className="absolute top-2 right-2">
                  {listing.type}
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2" data-testid={`text-listing-title-${listing.id}`}>{listing.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {listing.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {listing.category}
                  </Badge>
                  {listing.price && (
                    <span className="font-bold text-primary">
                      ${listing.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between gap-2">
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {listing.locationText || "Location not specified"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(`/marketplace/edit/${listing.id}`)}
                  data-testid={`button-edit-listing-${listing.id}`}
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No listings found</p>
            <Button onClick={() => setLocation("/marketplace/create")}>
              Create Your First Listing
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
