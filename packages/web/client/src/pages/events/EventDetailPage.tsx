import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Monitor,
  Users,
  DollarSign,
  CheckCircle2,
  Star,
  Tag,
} from "lucide-react";

const typeColors: Record<string, string> = {
  workshop: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  meetup: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  market: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  tour: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  webinar: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function formatDateTime(dateStr: string, tz?: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz || undefined,
  });
}

function formatTime(dateStr: string, tz?: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz || undefined,
  });
}

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

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const { data: event, isLoading, error } = useQuery<any>({
    queryKey: ["/api/events", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/events/${id}`);
      return res.json();
    },
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/reviews/event", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reviews/event/${id}`);
      const body = await res.json();
      return Array.isArray(body) ? body : (body.data ?? []);
    },
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${id}/register`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
      toast({ title: "Registered!", description: "You're registered for this event." });
    },
    onError: (error: any) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reviews", {
        subjectType: "event",
        subjectId: id,
        rating: reviewRating,
        title: reviewTitle || undefined,
        comment: reviewComment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/event", id] });
      setReviewRating(0);
      setReviewTitle("");
      setReviewComment("");
      toast({ title: "Review submitted!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit review", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/events")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
        </Button>
        <Card className="p-12 text-center text-muted-foreground">Event not found.</Card>
      </div>
    );
  }

  const isFull = event.capacity && event.registeredCount >= event.capacity;
  const isPast = new Date(event.endDateTime) < new Date();
  const isHost = (currentUser as any)?.id === event.hostUserId;
  const spotsLeft = event.capacity ? event.capacity - event.registeredCount : null;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const canReview =
    !isHost &&
    currentUser &&
    !reviews.some((r: any) => r.reviewerUserId === (currentUser as any).id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/events")} className="pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
      </Button>

      {/* Hero image */}
      {event.imageUrl ? (
        <div className="w-full h-56 rounded-xl overflow-hidden bg-muted">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-32 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center">
          <Calendar className="h-12 w-12 text-primary/40" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title + badges */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 ${typeColors[event.type] || "bg-muted text-muted-foreground"}`}>
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 ${statusColors[event.status] || "bg-muted text-muted-foreground"}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
              {event.isFeatured && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Featured
                </span>
              )}
            </div>
            <h1 className="text-3xl font-serif font-bold mb-2">{event.title}</h1>
            {avgRating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-foreground">{avgRating}</span>
                <span>({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
              </div>
            )}
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About This Event</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {event.description}
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
                    placeholder="How was this event?"
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

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Registration card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              {/* Price */}
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-lg">
                  {event.price > 0 ? `${event.currency} ${event.price}` : "Free"}
                </span>
              </div>

              {/* Capacity */}
              {event.capacity && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {event.registeredCount} / {event.capacity} registered
                    {spotsLeft !== null && spotsLeft > 0 && !isFull && (
                      <span className="text-green-600 dark:text-green-400 ml-1">
                        · {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                      </span>
                    )}
                    {isFull && (
                      <span className="text-red-600 dark:text-red-400 ml-1">· Full</span>
                    )}
                  </span>
                </div>
              )}

              {/* Registration action */}
              {event.isRegistered ? (
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  You're registered!
                </div>
              ) : isPast ? (
                <p className="text-sm text-muted-foreground text-center">This event has ended.</p>
              ) : event.status === "cancelled" ? (
                <p className="text-sm text-muted-foreground text-center">This event was cancelled.</p>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => registerMutation.mutate()}
                  disabled={!!isFull || registerMutation.isPending || isHost}
                >
                  {registerMutation.isPending
                    ? "Registering..."
                    : isFull
                    ? "Event Full"
                    : isHost
                    ? "You're the host"
                    : "Register for Event"}
                </Button>
              )}

              {isHost && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setLocation(`/events/edit/${id}`)}
                >
                  Edit Event
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Date & time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {formatDateTime(event.startDateTime, event.timeZone)}
              </p>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Ends at {formatTime(event.endDateTime, event.timeZone)}
                  {event.timeZone && ` (${event.timeZone})`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {event.locationOnline ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {event.locationOnline ? (
                <p>Online Event</p>
              ) : event.locationAddress ? (
                <p>{event.locationAddress}</p>
              ) : (
                <p>Location TBA</p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex flex-wrap gap-2">
                {event.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
