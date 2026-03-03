import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Globe,
  Mail,
  ExternalLink,
  Pencil,
  ListChecks,
  Gift,
} from "lucide-react";

const typeStyles: Record<string, string> = {
  "full-time":  "bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200",
  "part-time":  "bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200",
  contract:     "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  volunteer:    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  internship:   "bg-teal-100   text-teal-800   dark:bg-teal-900   dark:text-teal-200",
  freelance:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  seasonal:     "bg-pink-100   text-pink-800   dark:bg-pink-900   dark:text-pink-200",
};

const statusConfig: Record<string, { icon: any; label: string; cls: string }> = {
  active:   { icon: CheckCircle, label: "Active",   cls: "text-green-600 dark:text-green-400" },
  closed:   { icon: XCircle,     label: "Closed",   cls: "text-red-600 dark:text-red-400" },
  expired:  { icon: Clock,       label: "Expired",  cls: "text-yellow-600 dark:text-yellow-400" },
  draft:    { icon: Clock,       label: "Draft",    cls: "text-gray-500" },
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();

  const { data: job, isLoading, error } = useQuery<any>({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/jobs/${id}`);
      return res.json();
    },
  });

  const { data: poster } = useQuery<any>({
    queryKey: ["/api/members", job?.postedByUserId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/members/${job.postedByUserId}`);
      return res.json();
    },
    enabled: !!job?.postedByUserId,
  });

  const getInitials = (name: string) =>
    name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const formatSalary = (job: any) => {
    if (job.compensationInfo) return job.compensationInfo;
    if (job.salaryMin || job.salaryMax) {
      const currency = job.salaryCurrency ?? "USD";
      const min = job.salaryMin ? `${currency} ${Number(job.salaryMin).toLocaleString()}` : null;
      const max = job.salaryMax ? `${currency} ${Number(job.salaryMax).toLocaleString()}` : null;
      if (min && max) return `${min} – ${max}`;
      return min ?? max;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/jobs")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Job Board
        </Button>
        <Card className="p-12 text-center text-muted-foreground">Job not found.</Card>
      </div>
    );
  }

  const isOwner = (currentUser as any)?.id === job.postedByUserId;
  const status = statusConfig[job.status] ?? statusConfig.active;
  const StatusIcon = status.icon;
  const salary = formatSalary(job);
  const requirements: string[] = job.requirements ?? [];
  const benefits: string[] = job.benefits ?? [];
  const isClosed = job.status === "closed" || job.status === "expired";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/jobs")} className="pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Job Board
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeStyles[job.jobType] ?? "bg-muted text-muted-foreground"}`}>
                {job.jobType.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </span>
              <Badge variant="secondary" className="text-xs">
                {job.category.replace(/([A-Z])/g, " $1").trim()}
              </Badge>
              {job.isRemote && (
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" /> Remote
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-serif font-bold leading-tight">{job.title}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className={`flex items-center gap-1.5 font-medium ${status.cls}`}>
                <StatusIcon className="h-4 w-4" />
                {status.label}
              </span>
              {job.locationText && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.locationText}
                </span>
              )}
              {salary && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {salary}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Posted {formatDate(job.createdAt)}
              {job.expiresAt && ` · Expires ${formatDate(job.expiresAt)}`}
            </p>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </CardContent>
          </Card>

          {/* Requirements */}
          {requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {benefits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="h-4 w-4" /> Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Apply / Edit */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {isOwner ? (
                <Button
                  className="w-full"
                  onClick={() => setLocation(`/jobs/edit/${id}`)}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit Job Post
                </Button>
              ) : (
                <>
                  {job.applicationUrl && (
                    <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full" disabled={isClosed}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {isClosed ? "Position Closed" : "Apply Now"}
                      </Button>
                    </a>
                  )}
                  {job.applicationEmail && (
                    <a href={`mailto:${job.applicationEmail}`} className="block">
                      <Button
                        variant={job.applicationUrl ? "outline" : "default"}
                        className="w-full"
                        disabled={isClosed}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {isClosed ? "Position Closed" : "Apply via Email"}
                      </Button>
                    </a>
                  )}
                  {!job.applicationUrl && !job.applicationEmail && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Contact the poster directly to apply.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Job details summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{job.jobType.replace(/-/g, " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{job.category.replace(/([A-Z])/g, " $1").trim()}</span>
              </div>
              {(job.locationText || job.isRemote) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-right">
                    {job.isRemote ? "Remote" : job.locationText}
                  </span>
                </div>
              )}
              {salary && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pay</span>
                  <span className="font-medium text-right">{salary}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posted by */}
          {poster && (
            <button
              onClick={() => setLocation(`/members/${poster.id}`)}
              className="w-full text-left rounded-xl border p-4 hover:bg-muted/50 transition-colors"
            >
              <p className="text-xs text-muted-foreground mb-2">Posted by</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={poster.profileImageUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(poster.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{poster.name}</p>
                  {(poster.city || poster.country) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[poster.city, poster.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
