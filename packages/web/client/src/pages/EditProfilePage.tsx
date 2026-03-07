import { useState, useRef, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, X, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${API_BASE}${url}`;
}

async function compressImage(file: File, maxPx = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      let { width, height } = img;
      if (width > height) {
        if (width > maxPx) { height = Math.round((height * maxPx) / width); width = maxPx; }
      } else {
        if (height > maxPx) { width = Math.round((width * maxPx) / height); height = maxPx; }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = objUrl;
  });
}

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().max(500, "Bio must be under 500 characters").optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Inline tag input — press Enter or comma to add, click × to remove
function TagInput({
  label,
  description,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  description?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim().replace(/,$/, "");
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="min-h-[42px] flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button type="button" onClick={() => remove(tag)} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, setAuth, token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [interests, setInterests] = useState<string[]>((user as any)?.interests ?? []);
  const [skills, setSkills] = useState<string[]>((user as any)?.skills ?? []);
  const [offerings, setOfferings] = useState<string[]>((user as any)?.offerings ?? []);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    resolveImageUrl((user as any)?.profileImageUrl)
  );
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      bio: (user as any)?.bio ?? "",
      city: (user as any)?.city ?? "",
      region: (user as any)?.region ?? "",
      country: (user as any)?.country ?? "",
    },
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const base64 = await compressImage(file);
      setPendingImageBase64(base64);
      setAvatarUrl(base64);
    } catch (err: any) {
      toast({ title: "Failed to process image", description: err.message, variant: "destructive" });
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PUT", "/api/profile", {
        name: data.name,
        bio: data.bio || undefined,
        city: data.city || undefined,
        region: data.region || undefined,
        country: data.country || undefined,
        interests,
        skills,
        offerings,
        ...(pendingImageBase64 ? { profileImageUrl: pendingImageBase64 } : {}),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (token) setAuth(data.user ?? data, token);
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
      setLocation("/profile");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">Update your public profile information</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">

          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Photo upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  {compressing && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={compressing}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {compressing ? "Processing..." : "Change Photo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP — max 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell the community about yourself..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {(field.value ?? "").length}/500 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
              <CardDescription>Helps connect you with nearby community members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Kingston" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region / State</FormLabel>
                      <FormControl>
                        <Input placeholder="Surrey" {...field} />
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
                        <Input placeholder="Jamaica" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interests, Skills & Offerings</CardTitle>
              <CardDescription>
                Press Enter or comma after each item. Backspace removes the last tag.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <TagInput
                label="Interests"
                description="What you're passionate about"
                tags={interests}
                onChange={setInterests}
                placeholder="e.g. permaculture, foraging…"
              />
              <Separator />
              <TagInput
                label="Skills"
                description="What you can teach or help with"
                tags={skills}
                onChange={setSkills}
                placeholder="e.g. seed saving, woodworking…"
              />
              <Separator />
              <TagInput
                label="Offerings"
                description="Products or services you provide"
                tags={offerings}
                onChange={setOfferings}
                placeholder="e.g. fresh produce, herbal teas…"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/profile")}
            >
              Cancel
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
