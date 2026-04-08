import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Video, BookOpen, Lock, Construction } from "lucide-react";

const categoryColors: Record<string, string> = {
  seedBank: "from-green-600 to-emerald-500",
  farmersMarket: "from-orange-500 to-amber-400",
  cleanEnergy: "from-yellow-500 to-lime-500",
  ecoHomes: "from-teal-600 to-cyan-500",
  tradeLogistics: "from-blue-600 to-indigo-500",
  default: "from-primary to-primary/70",
};

const categoryEmoji: Record<string, string> = {
  seedBank: "\u{1F331}",
  farmersMarket: "\u{1F6D2}",
  cleanEnergy: "\u2600\uFE0F",
  ecoHomes: "\u{1F3E1}",
  tradeLogistics: "\u{1F69A}",
  default: "\u{1F4DA}",
};

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200",
  intermediate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200",
  advanced: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200",
};

export default function LearningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: module, isLoading, error } = useQuery<any>({
    queryKey: ["/api/training-modules", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/training-modules/${id}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/learning")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Learning Hub
        </Button>
        <Card className="p-12 text-center text-muted-foreground">Course not found.</Card>
      </div>
    );
  }

  const gradient = categoryColors[module.category] ?? categoryColors.default;
  const emoji = categoryEmoji[module.category] ?? categoryEmoji.default;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/learning")} className="pl-0">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Learning Hub
      </Button>

      {/* Hero banner */}
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} p-8 text-white`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center text-5xl flex-shrink-0">
            {emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-xs capitalize border-white/30 text-white ${difficultyColor[module.difficultyLevel] ? "" : ""}`}>
                {module.difficultyLevel}
              </Badge>
              <Badge className="bg-white/20 text-white border-none text-xs capitalize">
                {module.category.replace(/([A-Z])/g, " $1").trim()}
              </Badge>
              {module.isPremium && (
                <Badge className="bg-yellow-400 text-yellow-900 border-none gap-1">
                  <Lock className="h-3 w-3" /> Premium
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-2">{module.title}</h1>
            <div className="flex items-center gap-4 text-sm text-white/70">
              {module.estimatedDuration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {module.estimatedDuration} min
                </span>
              )}
              {module.videoUrl && (
                <span className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" />
                  Video included
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> About This Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {module.description}
              </p>
            </CardContent>
          </Card>

          {module.content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                  {module.content}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coming soon notice */}
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Interactive Lessons Coming Soon</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We're building interactive lessons, quizzes, and progress tracking for this course.
                Check back soon!
              </p>
              <Button variant="outline" onClick={() => setLocation("/learning")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Learning Hub
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Difficulty</span>
                <span className="font-medium capitalize">{module.difficultyLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{module.category.replace(/([A-Z])/g, " $1").trim()}</span>
              </div>
              {module.estimatedDuration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{module.estimatedDuration} min</span>
                </div>
              )}
              {module.isPremium && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Access</span>
                  <span className="font-medium">Premium</span>
                </div>
              )}
            </CardContent>
          </Card>

          {module.videoUrl && (
            <Card>
              <CardContent className="p-4">
                <a href={module.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full">
                    <Video className="h-4 w-4 mr-2" /> Watch Video
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
