import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { z } from "zod";

const MAX_FILE_SIZE = 2 * 1024 * 1024;


const createListingFormSchema = z.object({
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

type CreateListingFormData = z.infer<typeof createListingFormSchema>;

export default function CreateListingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateListingFormData>({
    resolver: zodResolver(createListingFormSchema),
    defaultValues: {
      type: "",
      category: "",
      title: "",
      description: "",
      price: undefined,
      currency: "USD",
      locationText: "",
      latitude: undefined,
      longitude: undefined,
      availabilityStatus: "active",
      images: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ data, files }: { data: CreateListingFormData; files: File[] }) => {
      // Step 1: create listing without images
      const res = await apiRequest("POST", "/api/listings", data);
      const listing = await res.json();

      // Step 2: upload images via multipart FormData
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));

        const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").trim().replace(/\/+$/, "");
        const token = useAuth.getState().token;
        const uploadRes = await fetch(`${API_BASE_URL}/api/listings/${listing.id}/images`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const text = await uploadRes.text();
          throw new Error(text || uploadRes.statusText);
        }
      }

      return listing;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: "Listing created!", description: "Your listing has been published." });
      setLocation(`/marketplace/${data.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create listing", variant: "destructive" });
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

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: CreateListingFormData) => {
    createMutation.mutate({ data, files: selectedFiles });
  };

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/marketplace")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Listing</CardTitle>
          <CardDescription>
            Share your sustainable goods, services, or resources with the E.A.T. community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-type"><SelectValue placeholder="Select type" /></SelectTrigger>
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
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select category" /></SelectTrigger>
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
              )} />

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Organic Tomato Seeds" {...field} data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your listing in detail..." className="min-h-[120px]" {...field} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-price" />
                  </FormControl>
                  <FormDescription>Leave blank for trade/barter items</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="locationText" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kingston, Jamaica" {...field} value={field.value || ""} data-testid="input-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Photos */}
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

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setLocation("/marketplace")} className="flex-1" data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {createMutation.isPending ? "Creating..." : "Create Listing"}
                </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
