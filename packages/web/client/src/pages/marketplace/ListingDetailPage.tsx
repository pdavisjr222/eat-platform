import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  Eye,
  MessageSquare,
  Pencil,
  Star,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

const typeStyles: Record<string, string> = {
  sell:   "bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200",
  buy:    "bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200",
  trade:  "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  barter: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  rent:   "bg-teal-100   text-teal-800   dark:bg-teal-900   dark:text-teal-200",
  lease:  "bg-gray-100   text-gray-700   dark:bg-gray-800   dark:text-gray-300",
};

const statusIcons: Record<string, { icon: any; label: string; cls: string }> = {
  available:   { icon: CheckCircle, label: "Available",    cls: "text-green-600 dark:text-green-400" },
  sold:        { icon: XCircle,     label: "Sold",         cls: "text-red-600   dark:text-red-400"   },
  reserved:    { icon: Clock,       label: "Reserved",     cls: "text-yellow-600 dark:text-yellow-400" },
  unavailable: { icon: XCircle,     label: "Unavailable",  cls: "text-gray-500" },
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star className={`h-5 w-5 ${star <= (hovered || value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [activeImage, setActiveImage] = useState(0);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const { data: listing, isLoading, error } = useQuery<any>({
    queryKey: ["/api/listings", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/listings/${id}`);
      return res.json();
    },
  });

  const { data: seller } = useQuery<any>({
    queryKey: ["/api/members", listing?.ownerUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/members/${listing.ownerUserId}`);
      return res.json();
    },
    enabled: !!listing?.ownerUserId,
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/reviews/listing", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reviews/listing/${id}`);
      const body = await res.json();
      return Array.isArray(body) ? body : (body.data ?? []);
    },
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reviews", {
        subjectType: "listing",
        subjectId: id,
        rating: reviewRating,
        title: reviewTitle || undefined,
        comment: reviewComment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/listing", id] });
      setReviewRating(0);
      setReviewTitle("");
      setReviewComment("");
      toast({ title: "Review submitted!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit review", description: error.message, variant: "destructive" });
    },
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
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/marketplace")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace
        </Button>
        <Card className="p-12 text-center text-muted-foreground">Listing not found.</Card>
      </div>
    );
  }

  const isOwner = (currentUser as any)?.id === listing.ownerUserId;
  const images: string[] = listing.images ?? [];
  const status = statusIcons[listing.availabilityStatus] ?? statusIcons.available;
  const StatusIcon = status.icon;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const canReview =
    !isOwner &&
    currentUser &&
    !reviews.some((r: any) => r.reviewerUserId === (currentUser as any).id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/marketplace")} className="pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace
      </Button>

      {/* Image gallery + info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Images */}
        <div className="space-y-2">
          <div className="aspect-square rounded-xl overflow-hidden bg-muted border">
            {images.length > 0 ? (
              <img
                src={images[activeImage]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 opacity-30" />
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

        {/* Listing info */}
        <div className="space-y-4">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeStyles[listing.type] ?? "bg-muted text-muted-foreground"}`}>
              {listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}
            </span>
            <Badge variant="secondary" className="text-xs">{listing.category}</Badge>
            {listing.isFeatured && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Featured
              </span>
            )}
          </div>

          <h1 className="text-2xl font-serif font-bold leading-tight">{listing.title}</h1>

          {/* Price */}
          <div>
            {listing.price ? (
              <p className="text-3xl font-bold text-primary">
                {listing.currency ?? "USD"} {Number(listing.price).toFixed(2)}
              </p>
            ) : (
              <p className="text-lg text-muted-foreground italic">
                {listing.type === "trade" || listing.type === "barter"
                  ? "Contact to arrange trade"
                  : "Price not listed"}
              </p>
            )}
          </div>

          {/* Status + meta */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className={`flex items-center gap-1.5 font-medium ${status.cls}`}>
              <StatusIcon className="h-4 w-4" />
              {status.label}
            </span>
            {listing.locationText && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {listing.locationText}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {listing.viewCount ?? 0} view{listing.viewCount !== 1 ? "s" : ""}
            </span>
            {avgRating && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {avgRating} ({reviews.length})
              </span>
            )}
          </div>

          {/* Seller */}
          {seller && (
            <button
              onClick={() => setLocation(`/members/${seller.id}`)}
              className="flex items-center gap-3 w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={seller.profileImageUrl ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(seller.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Listed by</p>
                <p className="font-medium text-sm truncate">{seller.name}</p>
                {(seller.city || seller.country) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[seller.city, seller.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            {isOwner ? (
              <Button onClick={() => setLocation(`/marketplace/edit/${id}`)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit Listing
              </Button>
            ) : (
              <Button
                onClick={() => setLocation(`/messages?user=${listing.ownerUserId}`)}
                disabled={listing.availabilityStatus === "sold"}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {listing.availabilityStatus === "sold" ? "Item Sold" : "Contact Seller"}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Listed {formatDate(listing.createdAt)}
          </p>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Reviews</span>
            {reviews.length > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No reviews yet.</p>
          ) : (
            reviews.map((review: any) => (
              <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <StarRating value={review.rating} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.title && <p className="font-medium text-sm mt-1">{review.title}</p>}
                {review.comment && <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Write a review */}
      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave a Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Your rating *</p>
              <StarRating value={reviewRating} onChange={setReviewRating} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1.5">Title (optional)</p>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your experience"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1.5">Comment *</p>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Describe your experience with this listing or seller..."
                className="min-h-[100px]"
              />
            </div>
            <Button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewRating === 0 || !reviewComment.trim() || reviewMutation.isPending}
              className="w-full"
            >
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
