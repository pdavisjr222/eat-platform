import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { type ForagingSpot } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { resolveImageUrl } from "@/lib/utils";
import { Loader2, ArrowLeft, Trash2, Upload, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });

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

  const [isUploading, setIsUploading] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast({ title: "Success!", description: "Your foraging spot has been updated." });
      setLocation("/foraging-map");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update foraging spot", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/foraging-spots/${spotId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foraging-spots"] });
      toast({ title: "Spot deleted", description: "Your foraging spot has been deleted successfully." });
      setLocation("/foraging-map");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete foraging spot", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const valid = files.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `${f.name} is too large`, description: "Max 2MB per image", variant: "destructive" });
        return false;
      }
      return true;
    });
    setNewFiles((prev) => [...prev, ...valid]);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setNewPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeNewFile = (i: number) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
    setNewPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const removeExistingImage = async (url: string) => {
    const updated = (spot?.images ?? []).filter((u) => u !== url);
    await apiRequest("PUT", `/api/foraging-spots/${spotId}`, { images: updated });
    queryClient.invalidateQueries({ queryKey: [`/api/foraging-spots/${spotId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/foraging-spots"] });
  };

  const uploadNewImages = async () => {
    if (!newFiles.length) return;
    setIsUploading(true);
    try {
      const compressed = await Promise.all(newFiles.map(compressImage));
      const allImages = [...(spot?.images ?? []), ...compressed];
      await apiRequest("PUT", `/api/foraging-spots/${spotId}`, { images: allImages });
      queryClient.invalidateQueries({ queryKey: [`/api/foraging-spots/${spotId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/foraging-spots"] });
      setNewFiles([]);
      setNewPreviews([]);
      toast({ title: "Images uploaded!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48 mb-4" />
        <Card><CardHeader><Skeleton className="h-8 w-64" /></CardHeader><CardContent className="space-y-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card><CardContent className="p-6"><p className="text-muted-foreground">Foraging spot not found</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation("/foraging-map")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Foraging Map
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" data-testid="button-delete">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Foraging Spot?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete this foraging spot. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Photo management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
          <CardDescription>Manage your foraging spot images</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(spot?.images ?? []).length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(spot?.images ?? []).map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img src={resolveImageUrl(url)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingImage(url)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {newPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {newPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-dashed border-primary bg-muted">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNewFile(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Select Images
            </Button>
            {newFiles.length > 0 && (
              <Button type="button" size="sm" onClick={uploadNewImages} disabled={isUploading}>
                {isUploading ? "Uploading..." : `Upload ${newFiles.length} Image${newFiles.length !== 1 ? "s" : ""}`}
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Edit Foraging Spot</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Spot Title *</FormLabel>
                  <FormControl><Input placeholder="Mango Tree Grove" {...field} data-testid="input-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="plantType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Plant Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-plant-type"><SelectValue placeholder="Select plant type" /></SelectTrigger>
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
              )} />

              <FormField control={form.control} name="species" render={({ field }) => (
                <FormItem>
                  <FormLabel>Species (optional)</FormLabel>
                  <FormControl><Input placeholder="Mangifera indica" {...field} value={field.value || ""} data-testid="input-species" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Textarea placeholder="Describe the foraging spot..." className="min-h-32" {...field} data-testid="input-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl><Input type="number" step="any" placeholder="18.0179" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} data-testid="input-latitude" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl><Input type="number" step="any" placeholder="-76.8099" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} data-testid="input-longitude" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="edibleParts" render={({ field }) => (
                <FormItem>
                  <FormLabel>Edible Parts (optional)</FormLabel>
                  <FormControl><Input placeholder="Fruit, leaves" {...field} value={field.value || ""} data-testid="input-edible-parts" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="seasonality" render={({ field }) => (
                <FormItem>
                  <FormLabel>Seasonality (optional)</FormLabel>
                  <FormControl><Input placeholder="Summer, Fall" {...field} value={field.value || ""} data-testid="input-seasonality" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="benefits" render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefits (optional)</FormLabel>
                  <FormControl><Textarea placeholder="Rich in vitamins, antioxidants..." {...field} value={field.value || ""} data-testid="input-benefits" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="accessNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Notes (optional)</FormLabel>
                  <FormControl><Textarea placeholder="Public park, accessible by walking trail..." {...field} value={field.value || ""} data-testid="input-access-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-4">
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit">
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation("/foraging-map")} data-testid="button-cancel">
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
