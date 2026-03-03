import { useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { eventDateTimeToUTC } from "@/lib/datetime";
import { Loader2, ArrowLeft, Upload, X } from "lucide-react";

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

const eventFormSchema = z.object({
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

type EventFormData = z.infer<typeof eventFormSchema>;

const eventTypes = ["workshop", "farmersMarket", "ecoTour", "onlineWebinar"];

export default function CreateEventPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatLocalDatetime = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(12, 0, 0, 0);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "workshop",
      startDateTime: formatLocalDatetime(tomorrow),
      endDateTime: formatLocalDatetime(tomorrowEnd),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locationOnline: false,
      locationAddress: "",
      latitude: undefined,
      longitude: undefined,
      capacity: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData & { imageUrl?: string }) => {
      try {
        const startDate = eventDateTimeToUTC(data.startDateTime, data.timeZone);
        const endDate = eventDateTimeToUTC(data.endDateTime, data.timeZone);
        const payload = { ...data, startDateTime: new Date(startDate), endDateTime: new Date(endDate) };
        const res = await apiRequest("POST", "/api/events", payload);
        return await res.json();
      } catch (error) {
        throw new Error("Invalid date/time or timezone values");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Success!", description: "Your event has been created." });
      setLocation("/events");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create event", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Max 2MB per image", variant: "destructive" });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: EventFormData) => {
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await compressImage(imageFile);
    }
    createMutation.mutate({ ...data, imageUrl });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => setLocation("/events")} className="mb-4" data-testid="button-back">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Create Event</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

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

              {/* Cover image */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Cover Photo (optional)</p>
                {imagePreview ? (
                  <div className="relative w-40 aspect-video rounded-lg overflow-hidden border bg-muted">
                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> Select Photo
                  </Button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Event
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
