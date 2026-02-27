import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, CheckCircle, Star, Tag, Plus } from "lucide-react";
import type { Vendor } from "@shared/schema";
import { useLocation } from "wouter";

const vendorTypes = ["all", "ecoFriendly", "indigenous", "serviceProvider", "accommodation"];

export default function VendorsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const { data: vendors, isLoading } = useQuery<{ data: Vendor[]; pagination: any }, Error, Vendor[]>({
    queryKey: ["/api/vendors"],
    select: (res) => res.data,
  });

  const filteredVendors = vendors?.filter((vendor) => {
    const matchesSearch = !searchQuery || vendor.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || vendor.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Eco-Friendly Vendors
          </h1>
          <p className="text-muted-foreground">
            Discover sustainable businesses and indigenous vendors
          </p>
        </div>
        <Button onClick={() => setLocation("/vendors/create")} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Register Vendor
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-vendors"
              />
            </div>
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger data-testid="select-vendor-type">
              <SelectValue placeholder="Vendor Type" />
            </SelectTrigger>
            <SelectContent>
              {vendorTypes.map((type) => (
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
            <Card key={i} className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredVendors && filteredVendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <Card
              key={vendor.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation(`/vendors/${vendor.id}`)}
              data-testid={`card-vendor-${vendor.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={vendor.logoUrl || undefined} alt={vendor.name} />
                    <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                      {getInitials(vendor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{vendor.name}</h3>
                      {vendor.verified && (
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {vendor.type.replace(/([A-Z])/g, " $1").trim()}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {vendor.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary mr-1" />
                    <span className="font-semibold">4.5</span>
                    <span className="text-muted-foreground ml-1">(12 reviews)</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    Deals Available
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-3 bg-muted/30 border-t">
                <Button variant="ghost" size="sm" className="w-full">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            No vendors found matching your search
          </div>
        </Card>
      )}
    </div>
  );
}
