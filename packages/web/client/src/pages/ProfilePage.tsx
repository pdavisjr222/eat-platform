import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Mail, Calendar, Award, Users, ShoppingBag, MessageSquare, LogOut, Camera, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Listing, Review } from "@shared/schema";
import { resolveImageUrl } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function ProfilePage() {
  const { user, clearAuth, setAuth, token } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: userListings } = useQuery<Listing[]>({
    queryKey: ["/api/listings/my-listings"],
  });

  const { data: userReviews } = useQuery<Review[]>({
    queryKey: ["/api/reviews/received"],
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (base64: string) => {
      const res = await apiRequest("PUT", "/api/profile", {
        name: user?.name,
        profileImageUrl: base64,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (token) setAuth(data.user ?? data, token);
      toast({ title: "Profile photo updated!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update photo",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await compressImage(file);
      uploadImageMutation.mutate(base64);
    } catch (err: any) {
      toast({ title: "Failed to process image", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    clearAuth();
    setLocation("/auth/login");
  };

  if (!user) return null;

  const averageRating = userReviews && userReviews.length > 0
    ? (userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1)
    : "N/A";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-foreground">
          My Profile
        </h1>
        <Button
          variant="outline"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to change photo"
                >
                  <Avatar className="h-32 w-32 mb-4">
                    <AvatarImage src={resolveImageUrl(user.profileImageUrl) || undefined} alt={user.name} />
                    <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 mb-4 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/40 transition-colors">
                    {uploading || uploadImageMutation.isPending ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
                <h2 className="text-2xl font-serif font-bold mb-1">{user.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <Button
                  className="w-full mb-2"
                  onClick={() => setLocation("/profile/edit")}
                  data-testid="button-edit-profile"
                >
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation(`/members/${(user as any).id}`)}
                  data-testid="button-view-public-profile"
                >
                  View Public Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              {(user.city || user.country) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {[user.city, user.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Award className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">{averageRating}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{userReviews?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Reviews</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{userListings?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Listings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{user.creditBalance}</p>
                <p className="text-sm text-muted-foreground">Credits</p>
              </CardContent>
            </Card>
          </div>

          {user.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{user.bio}</p>
              </CardContent>
            </Card>
          )}

          {user.interests && user.interests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interests</CardTitle>
                <CardDescription>What I'm passionate about</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((interest, idx) => (
                    <Badge key={idx} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {user.skills && user.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills & Expertise</CardTitle>
                <CardDescription>What I can offer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {user.offerings && user.offerings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What I Offer</CardTitle>
                <CardDescription>Products & services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.offerings.map((offering, idx) => (
                    <Badge key={idx} className="bg-primary/10 text-primary hover:bg-primary/20">
                      {offering}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Listings</CardTitle>
              <CardDescription>Active marketplace items</CardDescription>
            </CardHeader>
            <CardContent>
              {userListings && userListings.length > 0 ? (
                <div className="space-y-3">
                  {userListings.slice(0, 3).map((listing) => (
                    <div
                      key={listing.id}
                      className="p-3 rounded-md border hover-elevate cursor-pointer"
                      onClick={() => setLocation(`/marketplace/${listing.id}`)}
                      data-testid={`card-listing-${listing.id}`}
                    >
                      <h4 className="font-semibold mb-1">{listing.title}</h4>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {listing.type}
                        </Badge>
                        {listing.price && (
                          <span className="text-sm font-semibold text-primary">
                            ${listing.price}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {userListings.length > 3 && (
                    <Button variant="outline" className="w-full" onClick={() => setLocation("/marketplace")}>
                      View All Listings
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No listings yet</p>
                  <Button onClick={() => setLocation("/marketplace/create")}>
                    Create Your First Listing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
