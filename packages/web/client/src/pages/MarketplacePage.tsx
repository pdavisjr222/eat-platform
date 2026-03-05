import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MapPin, Eye, ShoppingBag, Pencil, Tag } from "lucide-react";
import type { Listing } from "@shared/schema";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { resolveImageUrl } from "@/lib/utils";

const listingTypes = [
  { value: "all",    label: "All",    emoji: "🌿" },
  { value: "sell",   label: "Sell",   emoji: "🏷️" },
  { value: "buy",    label: "Buy",    emoji: "🛒" },
  { value: "trade",  label: "Trade",  emoji: "🔄" },
  { value: "barter", label: "Barter", emoji: "🤝" },
  { value: "rent",   label: "Rent",   emoji: "🏠" },
  { value: "lease",  label: "Lease",  emoji: "📋" },
];

const categories = [
  "all", "food", "seeds", "plants", "spices", "handmade", "realEstate", "ecoTravel", "service",
];

const typeStyles: Record<string, { bg: string; text: string; dot: string }> = {
  sell:   { bg: "bg-green-500",  text: "text-white", dot: "bg-green-500"  },
  buy:    { bg: "bg-blue-500",   text: "text-white", dot: "bg-blue-500"   },
  trade:  { bg: "bg-orange-500", text: "text-white", dot: "bg-orange-500" },
  barter: { bg: "bg-purple-500", text: "text-white", dot: "bg-purple-500" },
  rent:   { bg: "bg-teal-500",   text: "text-white", dot: "bg-teal-500"   },
  lease:  { bg: "bg-gray-500",   text: "text-white", dot: "bg-gray-500"   },
};

const categoryGradients: Record<string, string> = {
  food:       "from-orange-400 to-amber-300",
  seeds:      "from-green-500 to-lime-400",
  plants:     "from-emerald-500 to-green-400",
  spices:     "from-yellow-500 to-orange-400",
  handmade:   "from-pink-400 to-rose-300",
  realEstate: "from-blue-500 to-indigo-400",
  ecoTravel:  "from-cyan-500 to-teal-400",
  service:    "from-violet-500 to-purple-400",
  default:    "from-green-600 to-emerald-500",
};

const categoryEmoji: Record<string, string> = {
  food: "🥦", seeds: "🌱", plants: "🌿", spices: "🌶️",
  handmade: "🧶", realEstate: "🏡", ecoTravel: "🌍", service: "🛠️", default: "📦",
};

export default function MarketplacePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showMine, setShowMine] = useState(false);

  const { data: listings, isLoading } = useQuery<{ data: Listing[]; pagination: any }, Error, Listing[]>({
    queryKey: ["/api/listings"],
    select: (res) => res.data,
  });

  const currentUserId = (user as any)?.id;

  const filteredListings = listings?.filter((listing) => {
    const matchesSearch = !searchQuery || listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || listing.type === selectedType;
    const matchesCategory = selectedCategory === "all" || listing.category === selectedCategory;
    const matchesMine = !showMine || listing.ownerUserId === currentUserId;
    return matchesSearch && matchesType && matchesCategory && matchesMine;
  });

  const totalCount = filteredListings?.length ?? 0;

  return (
    <div className="space-y-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 px-4 sm:px-6 py-8 sm:py-10 text-white">
        <div className="max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-5 w-5 text-green-200" />
                <span className="text-green-200 text-sm font-medium uppercase tracking-wider">Marketplace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold mb-1">Buy, Sell &amp; Trade</h1>
              <p className="text-green-100">Exchange goods and services with your sustainable community</p>
            </div>
            <Button
              onClick={() => setLocation("/marketplace/create")}
              className="bg-white text-green-700 hover:bg-green-50 font-semibold flex-shrink-0"
              data-testid="button-create-listing"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          </div>

          {/* Integrated search */}
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-300" />
            <Input
              placeholder="Search listings…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-white/15 border-white/30 text-white placeholder:text-green-200 focus-visible:bg-white/20 focus-visible:ring-white/40"
              data-testid="input-search-listings"
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Type tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {listingTypes.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                selectedType === t.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-44 h-9" data-testid="select-category">
              <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat.replace(/([A-Z])/g, " $1").trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => setShowMine((p) => !p)}
            className={`h-9 px-4 rounded-md border text-sm font-medium transition-colors ${
              showMine
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            My Listings
          </button>

          {/* Result count */}
          <span className="ml-auto text-sm text-muted-foreground">
            {isLoading ? "" : `${totalCount} listing${totalCount !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredListings && filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredListings.map((listing) => {
              const isOwner = listing.ownerUserId === currentUserId;
              const typeStyle = typeStyles[listing.type] ?? typeStyles.sell;
              const gradient = categoryGradients[listing.category] ?? categoryGradients.default;
              const emoji = categoryEmoji[listing.category] ?? categoryEmoji.default;
              const hasImage = listing.images && listing.images.length > 0;

              return (
                <Card
                  key={listing.id}
                  className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                  data-testid={`card-listing-${listing.id}`}
                  onClick={() => setLocation(`/marketplace/${listing.id}`)}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    {hasImage ? (
                      <img
                        src={resolveImageUrl((listing.images as string[])[0])}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <span className="text-5xl opacity-80">{emoji}</span>
                      </div>
                    )}

                    {/* Type badge */}
                    <span className={`absolute top-3 left-3 ${typeStyle.bg} ${typeStyle.text} text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm capitalize`}>
                      {listing.type}
                    </span>

                    {/* Featured ribbon */}
                    {listing.isFeatured && (
                      <span className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                        ⭐ Featured
                      </span>
                    )}

                    {/* Owner edit shortcut */}
                    {isOwner && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLocation(`/marketplace/edit/${listing.id}`); }}
                        className="absolute bottom-3 right-3 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-edit-listing-${listing.id}`}
                        title="Edit listing"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <CardContent className="p-4">
                    <h3
                      className="font-semibold text-sm leading-snug mb-1 line-clamp-1"
                      data-testid={`text-listing-title-${listing.id}`}
                    >
                      {listing.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {listing.description}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {listing.category?.replace(/([A-Z])/g, " $1").trim()}
                      </Badge>
                      {listing.price ? (
                        <span className="font-bold text-primary text-sm">
                          {listing.currency ?? "USD"} {Number(listing.price).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {listing.type === "trade" || listing.type === "barter" ? "Open to trade" : "Contact for price"}
                        </span>
                      )}
                    </div>

                    {/* Footer meta */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{listing.locationText || "Location TBD"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Eye className="h-3 w-3" />
                        {listing.viewCount ?? 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery || selectedType !== "all" || selectedCategory !== "all" || showMine
                ? "No listings match your filters"
                : "No listings yet"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {showMine
                ? "You haven't created any listings yet."
                : "Be the first to list something in the community marketplace."}
            </p>
            <Button onClick={() => setLocation("/marketplace/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create a Listing
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
