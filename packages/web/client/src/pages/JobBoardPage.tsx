import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MapPin, Briefcase, DollarSign } from "lucide-react";
import type { JobPost } from "@shared/schema";
import { useLocation } from "wouter";

const jobTypes = ["all", "part-time", "full-time", "freelance", "seasonal"];
const categories = ["all", "farmLabor", "construction", "media", "ecoTourism", "cleanEnergy"];

export default function JobBoardPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: jobs, isLoading } = useQuery<{ data: JobPost[]; pagination: any }, Error, JobPost[]>({
    queryKey: ["/api/jobs"],
    select: (res) => res.data,
  });

  const filteredJobs = jobs?.filter((job) => {
    const matchesSearch = !searchQuery || job.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || job.jobType === selectedType;
    const matchesCategory = selectedCategory === "all" || job.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Job Board
          </h1>
          <p className="text-muted-foreground">
            Find eco-friendly job opportunities in your community
          </p>
        </div>
        <Button
          onClick={() => setLocation("/jobs/create")}
          data-testid="button-create-job"
        >
          <Plus className="h-4 w-4 mr-2" />
          Post a Job
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-jobs"
              />
            </div>
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger data-testid="select-job-type">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              {jobTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredJobs && filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              className="hover-elevate"
              data-testid={`card-job-${job.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-xl mb-2" data-testid={`text-job-title-${job.id}`}>{job.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {job.description}
                    </p>
                  </div>
                  <Briefcase className="h-5 w-5 text-primary flex-shrink-0 ml-4" />
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary">
                    {job.jobType.replace("-", " ")}
                  </Badge>
                  <Badge variant="outline">
                    {job.category.replace(/([A-Z])/g, " $1").trim()}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {job.locationText && (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {job.locationText}
                    </div>
                  )}
                  {job.compensationInfo && (
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {job.compensationInfo}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="px-6 py-3 bg-muted/30 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(`/jobs/edit/${job.id}`)}
                  data-testid={`button-edit-job-${job.id}`}
                >
                  Edit Job
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No job postings found</p>
            <Button onClick={() => setLocation("/jobs/create")}>
              Post the First Job
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
