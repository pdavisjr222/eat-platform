import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { insertForagingSpotSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ArrowLeft } from "lucide-react";

const foragingSpotFormSchema = insertForagingSpotSchema.omit({ createdByUserId: true, images: true });

type ForagingSpotFormData = z.infer<typeof foragingSpotFormSchema>;

const plantTypes = ["fruit", "vegetable", "herb", "nut", "berry", "mushroom", "edible-green"];

export default function CreateForagingSpotPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<ForagingSpotFormData>({
    resolver: zodResolver(foragingSpotFormSchema),
    defaultValues: {
      title: "",
      plantType: "fruit",
      species: "",
      description: "",
      latitude: undefined,
      longitude: undefined,
      edibleParts: "",
      seasonality: "",
      benefits: "",
      accessNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ForagingSpotFormData) => {
      const res = await apiRequest("POST", "/api/foraging-spots", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foraging-spots"] });
      toast({
        title: "Success!",
        description: "Your foraging spot has been added.",
      });
      setLocation("/foraging-map");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create foraging spot",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForagingSpotFormData) => {
    createMutation.mutate(data);
  };

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
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Add Foraging Spot</CardTitle>
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
                          <SelectItem key={type} value={type}>
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

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Foraging Spot
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
