import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Video, Clock } from "lucide-react";
import type { TrainingModule } from "@shared/schema";
import { useLocation } from "wouter";

const categories = ["all", "seedBank", "farmersMarket", "cleanEnergy", "ecoHomes", "tradeLogistics"];
const difficultyLevels = ["all", "beginner", "intermediate", "advanced"];

export default function LearningPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  const { data: modules, isLoading } = useQuery<{ data: TrainingModule[]; pagination: any }, Error, TrainingModule[]>({
    queryKey: ["/api/training-modules"],
    select: (res) => res.data,
  });

  const filteredModules = modules?.filter((module) => {
    const matchesCategory = selectedCategory === "all" || module.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || module.difficultyLevel === selectedDifficulty;
    return matchesCategory && matchesDifficulty;
  });

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "advanced":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
          Learning Hub
        </h1>
        <p className="text-muted-foreground">
          Expand your knowledge in sustainable living and eco-friendly practices
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger data-testid="select-category">
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
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger data-testid="select-difficulty">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {difficultyLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
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
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredModules && filteredModules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <Card
              key={module.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation(`/learning/${module.id}`)}
              data-testid={`card-module-${module.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{module.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {module.category.replace(/([A-Z])/g, " $1").trim()}
                    </CardDescription>
                  </div>
                  {module.videoUrl && (
                    <Video className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getDifficultyColor(module.difficultyLevel)}`}
                  >
                    {module.difficultyLevel}
                  </Badge>
                  {module.estimatedDuration && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {module.estimatedDuration} min
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" size="sm" className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Start Learning
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No training modules found</p>
          </div>
        </Card>
      )}
    </div>
  );
}
