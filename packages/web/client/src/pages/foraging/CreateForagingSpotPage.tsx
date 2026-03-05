import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ArrowLeft, Upload, X, LocateFixed } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons in Vite builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function FlyToMarker({ lat, lng }: { lat: number | null | undefined; lng: number | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 12), { duration: 0.8 });
    }
  }, [lat, lng]);
  return null;
}

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

const foragingSpotFormSchema = z.object({
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

type ForagingSpotFormData = z.infer<typeof foragingSpotFormSchema>;

const plantTypes = ["fruit", "vegetable", "herb", "nut", "berry", "mushroom", "edible-green"];

export default function CreateForagingSpotPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      images: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ data, files }: { data: ForagingSpotFormData; files: File[] }) => {
      // Step 1: create spot without images
      const { images: _omit, ...spotData } = data;
      const res = await apiRequest("POST", "/api/foraging-spots", spotData);
      const spot = await res.json();

      // Step 2: upload images separately
      if (files.length > 0) {
        const images = await Promise.all(files.map(compressImage));
        await apiRequest("PUT", `/api/foraging-spots/${spot.id}`, { images });
      }

      return spot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foraging-spots"] });
      toast({ title: "Success!", description: "Your foraging spot has been added." });
      setLocation("/foraging-map");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create foraging spot", variant: "destructive" });
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
    setSelectedFiles((prev) => [...prev, ...valid]);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (i: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = (data: ForagingSpotFormData) => {
    createMutation.mutate({ data, files: selectedFiles });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => setLocation("/foraging-map")} className="mb-4" data-testid="button-back">
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
                      <Input placeholder="Mango Tree Grove" {...field} data-testid="input-title" />
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
                      <Input placeholder="Mangifera indica" {...field} value={field.value || ""} data-testid="input-species" />
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
                      <Textarea placeholder="Describe the foraging spot..." className="min-h-32" {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Map location picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Location — click map to place marker *</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.geolocation?.getCurrentPosition((pos) => {
                        form.setValue("latitude", parseFloat(pos.coords.latitude.toFixed(6)));
                        form.setValue("longitude", parseFloat(pos.coords.longitude.toFixed(6)));
                      });
                    }}
                  >
                    <LocateFixed className="h-3.5 w-3.5 mr-1.5" />
                    Use my location
                  </Button>
                </div>
                <div className="h-64 rounded-lg overflow-hidden border">
                  <MapContainer
                    center={[20, 0]}
                    zoom={2}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickToPlace
                      onPick={(lat, lng) => {
                        form.setValue("latitude", lat);
                        form.setValue("longitude", lng);
                      }}
                    />
                    <FlyToMarker lat={form.watch("latitude")} lng={form.watch("longitude")} />
                    {form.watch("latitude") != null && form.watch("longitude") != null && (
                      <Marker position={[form.watch("latitude")!, form.watch("longitude")!]} />
                    )}
                  </MapContainer>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Latitude</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" placeholder="18.0179" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} data-testid="input-latitude" />
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
                        <FormLabel className="text-xs text-muted-foreground">Longitude</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" placeholder="-76.8099" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} data-testid="input-longitude" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="edibleParts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edible Parts (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Fruit, leaves" {...field} value={field.value || ""} data-testid="input-edible-parts" />
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
                      <Input placeholder="Summer, Fall" {...field} value={field.value || ""} data-testid="input-seasonality" />
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
                      <Textarea placeholder="Rich in vitamins, antioxidants..." {...field} value={field.value || ""} data-testid="input-benefits" />
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
                      <Textarea placeholder="Public park, accessible by walking trail..." {...field} value={field.value || ""} data-testid="input-access-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photo upload */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Photos (optional)</p>
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80">
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Select Photos
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Foraging Spot
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
