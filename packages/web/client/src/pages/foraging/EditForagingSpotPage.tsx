import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { type ForagingSpot } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const editForagingSpotFormSchema = z.object({
  title: z.string().min(1),
  plantType: z.string().min(1),
  species: z.string().optional().nullable(),
  description: z.string().min(1),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  edibleParts: z.string().optional().nullable(),
  seasonality: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
});

type EditForagingSpotFormData = z.infer<typeof editForagingSpotFormSchema>;

const plantTypes = ["fruit", "vegetable", "herb", "nut", "berry", "mushroom", "edible-green"];

export default function EditForagingSpotPage() {
  const params = useParams<{ id: string }>();
  const spotId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: spot, isLoading } = useQuery<ForagingSpot>({
    queryKey: [`/api/foraging-spots/${spotId}`],
    enabled: !!spotId,
  });

  const form = useForm<EditForagingSpotFormData>({
    resolver: zodResolver(editForagingSpotFormSchema),
    values: spot ? {
      title: spot.title,
      plantType: spot.plantType,
      species: spot.species,
      description: spot.description,
      latitude: spot.latitude,
      longitude: spot.longitude,
      edibleParts: spot.edibleParts,
      seasonality: spot.seasonality,
      benefits: spot.benefits,
      accessNotes: spot.accessNotes,
      images: spot.images,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditForagingSpotFormData) => {
      const res = await apiRequest("PUT", `/api/foraging-spots/${spotId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foraging-spots"] });
      toast({
        title: "Success!",
        description: "Your foraging spot has been updated.",
      });
      setLocation("/foraging-map");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update foraging spot",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/foraging-spots/${spotId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foraging-spots"] });
      toast({
        title: "Spot deleted",
        description: "Your foraging spot has been deleted successfully.",
      });
      setLocation("/foraging-map");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete foraging spot",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditForagingSpotFormData) => {
    updateMutation.mutate(data);
  };

  const onDelete = () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Foraging spot not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => setLocation("/foraging-map")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Foraging Map
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-3xl font-serif">Edit Foraging Spot</CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                data-testid="button-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Foraging Spot?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this foraging spot. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spot Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mango Tree Grove"
                        {...field}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plantType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plant Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plant-type">
                          <SelectValue placeholder="Select plant type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plantTypes.map((type) => (
                          <SelectItem key={type} value={type} data-testid={`option-plant-type-${type}`}>
                            {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="species"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Species (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mangifera indica"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-species"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the foraging spot, what can be found, and any important details..."
                        className="min-h-32"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="18.0179"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-latitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="-76.8099"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-longitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="edibleParts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edible Parts (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Fruit, leaves"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edible-parts"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seasonality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seasonality (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Summer, Fall"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-seasonality"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="benefits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benefits (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Rich in vitamins, antioxidants..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-benefits"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Public park, accessible by walking trail..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-access-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URLs (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter image URLs, one per line"
                        {...field}
                        value={field.value?.join('\n') || ""}
                        onChange={(e) => {
                          const urls = e.target.value.split('\n').filter(url => url.trim());
                          field.onChange(urls.length > 0 ? urls : null);
                        }}
                        data-testid="input-images"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/foraging-map")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
