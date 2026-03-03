import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { type Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { eventDateTimeToUTC, utcToEventDateTime } from "@/lib/datetime";
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

const editEventFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.string().min(1),
  startDateTime: z.string(),
  endDateTime: z.string(),
  timeZone: z.string().min(1),
  locationOnline: z.boolean().default(false),
  locationAddress: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  capacity: z.number().int().optional().nullable(),
});

type EditEventFormData = z.infer<typeof editEventFormSchema>;

const eventTypes = ["workshop", "farmersMarket", "ecoTour", "onlineWebinar"];

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  const form = useForm<EditEventFormData>({
    resolver: zodResolver(editEventFormSchema),
    values: event ? {
      title: event.title,
      description: event.description,
      type: event.type,
      startDateTime: utcToEventDateTime(event.startDateTime, event.timeZone),
      endDateTime: utcToEventDateTime(event.endDateTime, event.timeZone),
      timeZone: event.timeZone,
      locationOnline: event.locationOnline,
      locationAddress: event.locationAddress,
      latitude: event.latitude,
      longitude: event.longitude,
      capacity: event.capacity,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditEventFormData) => {
      try {
        const startDate = eventDateTimeToUTC(data.startDateTime, data.timeZone);
        const endDate = eventDateTimeToUTC(data.endDateTime, data.timeZone);
        const payload = { ...data, startDateTime: new Date(startDate), endDateTime: new Date(endDate) };
        const res = await apiRequest("PUT", `/api/events/${eventId}`, payload);
        return await res.json();
      } catch (error) {
        throw new Error("Invalid date/time or timezone values");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Success!", description: "Your event has been updated." });
      setLocation("/events");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update event", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted", description: "Your event has been deleted successfully." });
      setLocation("/events");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete event", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Max 2MB per image", variant: "destructive" });
      return;
    }
    setNewFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setNewPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async () => {
    if (!newFile) return;
    setIsUploading(true);
    try {
      const imageUrl = await compressImage(newFile);
      await apiRequest("PUT", `/api/events/${eventId}`, { imageUrl });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setNewFile(null);
      setNewPreview(null);
      toast({ title: "Cover photo updated!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async () => {
    await apiRequest("PUT", `/api/events/${eventId}`, { imageUrl: null });
    queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/events"] });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-32 mb-4" />
        <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">Event not found</p>
            <Button onClick={() => setLocation("/events")} className="mt-4">Back to Events</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation("/events")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm" data-testid="button-delete">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete your event.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} data-testid="button-confirm-delete">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Cover photo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cover Photo</CardTitle>
          <CardDescription>Manage your event cover image</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.imageUrl && !newPreview && (
            <div className="relative w-48 aspect-video rounded-lg overflow-hidden border bg-muted">
              <img src={resolveImageUrl(event.imageUrl)} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={removeImage} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80">
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          )}
          {newPreview && (
            <div className="relative w-48 aspect-video rounded-lg overflow-hidden border border-dashed border-primary bg-muted">
              <img src={newPreview} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => { setNewFile(null); setNewPreview(null); }} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80">
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> {event.imageUrl ? "Replace Photo" : "Select Photo"}
            </Button>
            {newFile && (
              <Button type="button" size="sm" onClick={uploadImage} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload Photo"}
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Edit Event</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title *</FormLabel>
                  <FormControl><Input placeholder="Sustainable Gardening Workshop" {...field} data-testid="input-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-type"><SelectValue placeholder="Select event type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Textarea placeholder="Describe your event..." className="min-h-32" {...field} data-testid="input-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="startDateTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date & Time *</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} data-testid="input-start-datetime" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDateTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date & Time *</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} data-testid="input-end-datetime" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="timeZone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Zone *</FormLabel>
                  <FormControl><Input placeholder="America/Jamaica" {...field} data-testid="input-timezone" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="locationOnline" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-online" />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>This is an online event</FormLabel>
                  </div>
                </FormItem>
              )} />

              {!form.watch("locationOnline") && (
                <>
                  <FormField control={form.control} name="locationAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Address</FormLabel>
                      <FormControl><Input placeholder="123 Garden Street, Kingston" {...field} value={field.value || ""} data-testid="input-location" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="latitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude (optional)</FormLabel>
                        <FormControl><Input type="number" step="any" placeholder="18.0179" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} data-testid="input-latitude" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="longitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude (optional)</FormLabel>
                        <FormControl><Input type="number" step="any" placeholder="-76.8099" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} data-testid="input-longitude" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </>
              )}

              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (optional)</FormLabel>
                  <FormControl><Input type="number" placeholder="50" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} data-testid="input-capacity" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-4">
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit">
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Event
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation("/events")} data-testid="button-cancel">
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
