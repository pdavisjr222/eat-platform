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
  CheckCircle,
  Globe,
  Mail,
  Phone,
  MapPin,
  Star,
  Tag,
  Calendar,
  ExternalLink,
  Pencil,
  MessageSquare,
} from "lucide-react";

const vendorTypeLabels: Record<string, string> = {
  ecoFriendly: "Eco-Friendly Business",
  indigenous: "Indigenous Vendor",
  serviceProvider: "Service Provider",
  accommodation: "Accommodation",
};

const discountTypeLabels: Record<string, string> = {
  percentage: "%",
  fixed: "$",
  freeShipping: "Free Shipping",
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
          <Star
            className={`h-5 w-5 ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const { data: vendor, isLoading, error } = useQuery<any>({
    queryKey: ["/api/vendors", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/vendors/${id}`);
      return res.json();
    },
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/reviews/vendor", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reviews/vendor/${id}`);
      const body = await res.json();
      return Array.isArray(body) ? body : (body.data ?? []);
    },
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reviews", {
        subjectType: "vendor",
        subjectId: id,
        rating: reviewRating,
        title: reviewTitle || undefined,
        comment: reviewComment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/vendor", id] });
      setReviewRating(0);
      setReviewTitle("");
      setReviewComment("");
      toast({ title: "Review submitted!", description: "Thanks for your feedback." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit review", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-start gap-6">
          <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/vendors")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Vendors
        </Button>
        <Card className="p-12 text-center text-muted-foreground">
          Vendor not found.
        </Card>
      </div>
    );
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const isOwner = (user as any)?.id === vendor.linkedUserId;
  const canReview = user && !isOwner && !reviews.some((r: any) => r.reviewerUserId === (user as any).id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation("/vendors")} className="pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Vendors
        </Button>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => setLocation(`/vendors/edit/${id}`)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
        )}
      </div>

      {/* Hero card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 flex-shrink-0">
              <AvatarImage src={vendor.logoUrl || undefined} alt={vendor.name} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials(vendor.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-3xl font-serif font-bold">{vendor.name}</h1>
                {vendor.verified && (
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" title="Verified vendor" />
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary">
                  {vendorTypeLabels[vendor.type] || vendor.type}
                </Badge>
                {vendor.verified && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">
                    Verified
                  </Badge>
                )}
              </div>

              {/* Rating */}
              {avgRating ? (
                <div className="flex items-center gap-2 mb-3">
                  <StarRating value={Math.round(parseFloat(avgRating))} />
                  <span className="font-semibold">{avgRating}</span>
                  <span className="text-muted-foreground text-sm">
                    ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">No reviews yet</p>
              )}

              <p className="text-muted-foreground leading-relaxed">{vendor.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — contact + location */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{vendor.website.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              )}
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">{vendor.email}</span>
                </a>
              )}
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span>{vendor.phone}</span>
                </a>
              )}
              {!vendor.website && !vendor.email && !vendor.phone && (
                <p className="text-sm text-muted-foreground">No contact info provided</p>
              )}
              {/* In-app messaging for vendors with a linked member account */}
              {vendor.linkedUserId && !isOwner && (
                <Button
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => setLocation(`/messages?user=${vendor.linkedUserId}`)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Vendor
                </Button>
              )}
            </CardContent>
          </Card>

          {(vendor.city || vendor.country || vendor.address) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Location</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    {vendor.address && <p>{vendor.address}</p>}
                    {(vendor.city || vendor.country) && (
                      <p>{[vendor.city, vendor.country].filter(Boolean).join(", ")}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Member Since</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(vendor.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — coupons + reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deals */}
          {vendor.coupons && vendor.coupons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Active Deals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.coupons.map((coupon: any) => (
                  <div
                    key={coupon.id}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/30"
                  >
                    <div>
                      <p className="font-medium text-sm">{coupon.title}</p>
                      {coupon.validTo && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Expires {formatDate(coupon.validTo)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {coupon.code && (
                        <code className="text-xs bg-background border rounded px-2 py-1 font-mono">
                          {coupon.code}
                        </code>
                      )}
                      {coupon.discountType !== "freeShipping" && coupon.discountValue && (
                        <p className="text-sm font-semibold text-primary mt-1">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}% off`
                            : `$${coupon.discountValue} off`}
                        </p>
                      )}
                      {coupon.discountType === "freeShipping" && (
                        <p className="text-sm font-semibold text-primary mt-1">Free Shipping</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Reviews list */}
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reviews yet. Be the first to leave one!
                </p>
              ) : (
                reviews.map((review: any) => (
                  <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={review.reviewer?.profileImageUrl ?? undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(review.reviewer?.name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">
                            {review.reviewer?.name ?? "Community Member"}
                          </p>
                          <StarRating value={review.rating} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    {review.title && (
                      <p className="font-medium text-sm mt-1">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                    )}
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
                    placeholder="Share your experience with this vendor..."
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
      </div>
    </div>
  );
}
