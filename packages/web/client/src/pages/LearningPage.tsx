import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Video, Clock, Star, Users, Play, ChevronRight, Lock } from "lucide-react";
import type { TrainingModule } from "@shared/schema";
import { useLocation } from "wouter";

const categories = [
  { value: "all", label: "All Courses" },
  { value: "seedBank", label: "Seed Bank" },
  { value: "farmersMarket", label: "Farmers Market" },
  { value: "cleanEnergy", label: "Clean Energy" },
  { value: "ecoHomes", label: "Eco Homes" },
  { value: "tradeLogistics", label: "Trade Logistics" },
];

const categoryColors: Record<string, string> = {
  seedBank: "from-green-600 to-emerald-500",
  farmersMarket: "from-orange-500 to-amber-400",
  cleanEnergy: "from-yellow-500 to-lime-500",
  ecoHomes: "from-teal-600 to-cyan-500",
  tradeLogistics: "from-blue-600 to-indigo-500",
  default: "from-primary to-primary/70",
};

const categoryEmoji: Record<string, string> = {
  seedBank: "🌱",
  farmersMarket: "🛒",
  cleanEnergy: "☀️",
  ecoHomes: "🏡",
  tradeLogistics: "🚚",
  default: "📚",
};

export default function LearningPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: modules, isLoading } = useQuery<{ data: TrainingModule[]; pagination: any }, Error, TrainingModule[]>({
    queryKey: ["/api/training-modules"],
    select: (res) => res.data,
  });

  const filtered = modules?.filter((m) =>
    selectedCategory === "all" || m.category === selectedCategory
  ) ?? [];

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const difficultyColor: Record<string, string> = {
    beginner: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200",
    intermediate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200",
    advanced: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200",
  };

  return (
    <div className="space-y-0">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 px-6 py-12 text-white">
        <div className="max-w-3xl">
          <p className="text-green-200 text-sm font-medium uppercase tracking-widest mb-3">E.A.T. Learning Hub</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">
            Grow Your Knowledge,<br />Grow Your Community
          </h1>
          <p className="text-green-100 text-lg mb-6 max-w-xl">
            Expert-led courses on sustainable living, permaculture, food systems, and regenerative agriculture.
          </p>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm">
              <BookOpen className="h-4 w-4" />
              <span>{modules?.length ?? "—"} Courses</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm">
              <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
              <span>Expert Instructors</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm">
              <Users className="h-4 w-4" />
              <span>Community Learning</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                selectedCategory === cat.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground">Check back soon — new content is added regularly.</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Featured course */}
            {featured && (
              <div
                className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${
                  categoryColors[featured.category] ?? categoryColors.default
                } cursor-pointer group`}
                onClick={() => setLocation(`/learning/${featured.id}`)}
              >
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative z-10 p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center text-5xl flex-shrink-0">
                    {categoryEmoji[featured.category] ?? categoryEmoji.default}
                  </div>
                  <div className="flex-1 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-yellow-400 text-yellow-900 border-none text-xs font-semibold">
                        ⭐ Featured
                      </Badge>
                      <Badge className="bg-white/20 text-white border-none text-xs capitalize">
                        {featured.category.replace(/([A-Z])/g, " $1").trim()}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-serif font-bold mb-2">{featured.title}</h2>
                    <p className="text-white/80 text-sm mb-4 line-clamp-2">{featured.description}</p>
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <span className="capitalize">{featured.difficultyLevel}</span>
                      {featured.estimatedDuration && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {featured.estimatedDuration} min
                          </span>
                        </>
                      )}
                      {featured.videoUrl && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Video className="h-3.5 w-3.5" />
                            Video
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button className="bg-white text-green-700 hover:bg-green-50 font-semibold flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Play className="h-4 w-4 mr-2" />
                    Start Course
                  </Button>
                </div>
              </div>
            )}

            {/* Course grid */}
            {rest.length > 0 && (
              <div>
                <h2 className="text-xl font-serif font-semibold mb-4">
                  {selectedCategory === "all" ? "All Courses" : categories.find((c) => c.value === selectedCategory)?.label}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((module) => {
                    const gradient = categoryColors[module.category] ?? categoryColors.default;
                    const emoji = categoryEmoji[module.category] ?? categoryEmoji.default;
                    return (
                      <Card
                        key={module.id}
                        className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                        onClick={() => setLocation(`/learning/${module.id}`)}
                        data-testid={`card-module-${module.id}`}
                      >
                        {/* Thumbnail */}
                        <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <span className="text-6xl">{emoji}</span>
                          {module.isPremium && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-yellow-400 text-yellow-900 border-none gap-1">
                                <Lock className="h-3 w-3" />
                                Premium
                              </Badge>
                            </div>
                          )}
                          {module.videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                              <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="h-5 w-5 text-green-700 ml-0.5" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">
                              {module.title}
                            </h3>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {module.description}
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-xs capitalize ${difficultyColor[module.difficultyLevel] ?? ""}`}>
                              {module.difficultyLevel}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {module.category.replace(/([A-Z])/g, " $1").trim()}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {module.estimatedDuration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {module.estimatedDuration} min
                                </span>
                              )}
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={`h-3 w-3 ${s <= 4 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                                ))}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
