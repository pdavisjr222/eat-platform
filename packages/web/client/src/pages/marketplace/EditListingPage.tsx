import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { getToken } from "@/lib/auth";
import { type Listing } from "@shared/schema";
import { z } from "zod";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const editListingFormSchema = z.object({
  type: z.string().min(1),
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  images: z.array(z.string()).optional().nullable(),
  price: z.coerce.number().min(0).optional().or(z.literal("")),
  currency: z.string().optional().nullable(),
  locationText: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  availabilityStatus: z.string().optional(),
});

type EditListingFormData = z.infer<typeof editListingFormSchema>;

export default function EditListingPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const { toast } = useToast();

  // Image management state
  const [isUploading, setIsUploading] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: [`/api/listings/${listingId}`],
    enabled: !!listingId,
  });

  const form = useForm<EditListingFormData>({
    resolver: zodResolver(editListingFormSchema),
    values: listing ? {
      type: listing.type,
      category: listing.category,
      title: listing.title,
      description: listing.description,
      price: listing.price || undefined,
      currency: listing.currency || "USD",
      locationText: listing.locationText || "",
      latitude: listing.latitude || undefined,
      longitude: listing.longitude || undefined,
      availabilityStatus: listing.availabilityStatus,
      images: listing.images || [],
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditListingFormData) => {
      const res = await apiRequest("PUT", `/api/listings/${listingId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({
        title: "Success!",
        description: "Your listing has been updated.",
      });
      setLocation("/marketplace");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update listing",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/listings/${listingId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({
        title: "Success!",
        description: "Your listing has been deleted.",
      });
      setLocation("/marketplace");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete listing",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setNewFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
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
    const updated = (listing?.images ?? []).filter((u) => u !== url);
    await apiRequest("PUT", `/api/listings/${listingId}`, { images: updated });
    queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
  };

  const uploadNewImages = async () => {
    if (!newFiles.length) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      newFiles.forEach((f) => formData.append("images", f));
      const res = await fetch(`${BASE_URL}/api/listings/${listingId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      setNewFiles([]);
      setNewPreviews([]);
      toast({ title: "Images uploaded!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: EditListingFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container max-w-3xl py-8">
        <p>Listing not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/marketplace")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" data-testid="button-delete">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your listing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Image management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
          <CardDescription>Manage your listing images</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing images */}
          {(listing?.images ?? []).length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(listing?.images ?? []).map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New file previews */}
          {newPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {newPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-dashed border-primary bg-muted">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload controls */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" /> Select Images
            </Button>
            {newFiles.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={uploadNewImages}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : `Upload ${newFiles.length} Image${newFiles.length !== 1 ? "s" : ""}`}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Listing</CardTitle>
          <CardDescription>
            Update your listing details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listing Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sell">Sell</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="trade">Trade</SelectItem>
                        <SelectItem value="barter">Barter</SelectItem>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="lease">Lease</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="seeds">Seeds</SelectItem>
                        <SelectItem value="plants">Plants</SelectItem>
                        <SelectItem value="spices">Spices</SelectItem>
                        <SelectItem value="handmade">Handmade</SelectItem>
                        <SelectItem value="realEstate">Real Estate</SelectItem>
                        <SelectItem value="ecoTravel">Eco Travel</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-title" />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px]"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        data-testid="input-price"
                      />
                    </FormControl>
                    <FormDescription>Leave blank for trade/barter items</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/marketplace")}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Listing"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
