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
  Calendar,
  MessageSquare,
  Star,
  Sprout,
  Wrench,
  Gift,
} from "lucide-react";

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

function TagGroup({ icon: Icon, label, items }: { icon: any; label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const { data: member, isLoading, error } = useQuery<any>({
    queryKey: ["/api/members", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/members/${id}`);
      return res.json();
    },
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/reviews/user", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reviews/user/${id}`);
      const body = await res.json();
      return Array.isArray(body) ? body : (body.data ?? []);
    },
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reviews", {
        subjectType: "user",
        subjectId: id,
        rating: reviewRating,
        title: reviewTitle || undefined,
        comment: reviewComment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/user", id] });
      setReviewRating(0);
      setReviewTitle("");
      setReviewComment("");
      toast({ title: "Review submitted!", description: "Thanks for your feedback." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit review", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const isOwnProfile = (currentUser as any)?.id === id;

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/members")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
        </Button>
        <Card className="p-12 text-center text-muted-foreground">Member not found.</Card>
      </div>
    );
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const canReview =
    !isOwnProfile &&
    currentUser &&
    !reviews.some((r: any) => r.reviewerUserId === (currentUser as any).id);

  const hasTagContent =
    (member.interests?.length > 0) ||
    (member.skills?.length > 0) ||
    (member.offerings?.length > 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/members")} className="pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
      </Button>

      {/* Profile hero */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 flex-shrink-0">
              <AvatarImage src={member.profileImageUrl || undefined} alt={member.name} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-serif font-bold mb-2">{member.name}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                {(member.city || member.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[member.city, member.region, member.country].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(member.createdAt)}
                </span>
                {avgRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{avgRating}</span>
                    <span>({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                  </span>
                )}
              </div>

              {member.bio && (
                <p className="text-muted-foreground leading-relaxed mb-4">{member.bio}</p>
              )}

              {!isOwnProfile && (
                <Button
                  size="sm"
                  onClick={() => setLocation(`/messages?user=${member.id}`)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interests / Skills / Offerings */}
      {hasTagContent && (
        <Card>
          <CardHeader>
            <CardTitle>About {(member.name || "Unknown").split(" ")[0]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <TagGroup icon={Sprout} label="Interests" items={member.interests} />
            <TagGroup icon={Wrench} label="Skills" items={member.skills} />
            <TagGroup icon={Gift} label="Offerings" items={member.offerings} />
          </CardContent>
        </Card>
      )}

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
            <p className="text-sm text-muted-foreground text-center py-4">
              No reviews yet.{!isOwnProfile && " Be the first to leave one!"}
            </p>
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
                placeholder="Share your experience with this member..."
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
