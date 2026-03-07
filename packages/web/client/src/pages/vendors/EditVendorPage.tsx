import { useForm } from "react-hook-form";
import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getToken } from "@/lib/auth";
import { Store, ArrowLeft, Upload, Trash2, Music, ImageIcon } from "lucide-react";

const vendorSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  type: z.enum(["ecoFriendly", "indigenous", "serviceProvider", "accommodation"], {
    required_error: "Please select a vendor type",
  }),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  logoUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type VendorFormData = z.infer<typeof vendorSchema>;

const vendorTypeLabels: Record<string, string> = {
  ecoFriendly: "Eco-Friendly Business",
  indigenous: "Indigenous Vendor",
  serviceProvider: "Service Provider",
  accommodation: "Accommodation",
};

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: vendor, isLoading } = useQuery<any>({
    queryKey: ["/api/vendors", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/vendors/${id}`);
      return res.json();
    },
    enabled: !!id,
  });

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    values: vendor
      ? {
          name: vendor.name ?? "",
          description: vendor.description ?? "",
          type: vendor.type,
          website: vendor.website ?? "",
          email: vendor.email ?? "",
          phone: vendor.phone ?? "",
          address: vendor.address ?? "",
          city: vendor.city ?? "",
          country: vendor.country ?? "",
          logoUrl: vendor.logoUrl ?? "",
        }
      : undefined,
  });

  const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("media", file);
      if (caption.trim()) form.append("caption", caption.trim());
      const res = await fetch(`${apiBase}/api/vendors/${id}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Media uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const deleteMediaMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await apiRequest("DELETE", `/api/vendors/${id}/media`, { filename });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      toast({ title: "Media removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove media", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      const payload = {
        ...data,
        website: data.website || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        country: data.country || undefined,
        logoUrl: data.logoUrl || undefined,
      };
      const res = await apiRequest("PUT", `/api/vendors/${id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      toast({ title: "Vendor updated!", description: "Your changes have been saved." });
      setLocation(`/vendors/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update vendor",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/vendors")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Vendors
        </Button>
        <Card className="p-12 text-center text-muted-foreground">Vendor not found.</Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/vendors/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold">Edit Vendor Profile</h1>
          <p className="text-muted-foreground">Update your vendor information</p>
        </div>
      </div>

      {/* Media manager */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <CardTitle>Media</CardTitle>
          </div>
          <CardDescription>
            Upload photos, videos, and audio to showcase your business. Images up to 10MB, audio up to 20MB, video up to 100MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing media */}
          {vendor.mediaItems && vendor.mediaItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vendor.mediaItems.map((item: any, i: number) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border bg-muted/20">
                  {item.type === "image" && (
                    <img
                      src={item.url}
                      alt={item.caption || `Media ${i + 1}`}
                      className="w-full aspect-video object-cover"
                    />
                  )}
                  {item.type === "video" && (
                    <video src={item.url} className="w-full aspect-video bg-black" preload="metadata" />
                  )}
                  {item.type === "audio" && (
                    <div className="w-full aspect-video flex flex-col items-center justify-center gap-2 p-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center truncate w-full">
                        {item.caption || item.filename}
                      </p>
                    </div>
                  )}
                  {item.caption && item.type !== "audio" && (
                    <p className="text-xs text-muted-foreground px-2 py-1 truncate">{item.caption}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteMediaMutation.mutate(item.filename)}
                    disabled={deleteMediaMutation.isPending}
                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No media uploaded yet.</p>
          )}

          {/* Upload new */}
          <div className="space-y-2 pt-2 border-t">
            <Input
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac"
                className="hidden"
                onChange={handleMediaUpload}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Media"}
              </Button>
              <p className="text-xs text-muted-foreground">Image, video, or audio file</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>Vendor Details</CardTitle>
          </div>
          <CardDescription>
            Changes will be visible to the community immediately after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Green Valley Farm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(vendorTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        placeholder="Tell the community about your business, what you offer, and your values..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="hello@yourbusiness.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourbusiness.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Miami" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourbusiness.com/logo.png" {...field} />
                    </FormControl>
                    <FormDescription>
                      Direct link to your logo image. Leave blank to use your initials as avatar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/vendors/${id}`)}
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
