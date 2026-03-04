import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./api";
import { useAuthStore } from "./auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  title: string;
  type: string;
  category: string;
  price?: number;
  currency?: string;
  location?: string;
  images?: string[];
  availabilityStatus: string;
  ownerUserId: string;
  createdAt: string;
}

export interface ForagingSpot {
  id: string;
  title: string;
  plantType: string;
  species?: string;
  latitude: number;
  longitude: number;
  season?: string;
  isVerified: boolean;
  country?: string;
  region?: string;
  images?: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface EatEvent {
  id: string;
  title: string;
  type: string;
  description?: string;
  startDateTime: string;
  locationAddress?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
}

export interface EatNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Listings ────────────────────────────────────────────────────────────────

export function useListings(params?: {
  type?: string;
  category?: string;
  page?: number;
}) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["listings", params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.type) sp.set("type", params.type);
      if (params?.category) sp.set("category", params.category);
      sp.set("limit", "20");
      sp.set("page", String(params?.page ?? 1));
      return apiRequest<{ data: Listing[]; pagination: any }>(
        `/api/listings?${sp}`,
        { token: token! }
      );
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

export function useMyListings() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["listings", "my-listings"],
    queryFn: () =>
      apiRequest<{ data: Listing[]; pagination: any }>("/api/listings/my-listings", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Foraging Spots ──────────────────────────────────────────────────────────

export function useForagingSpots(params?: { country?: string; page?: number }) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["foraging-spots", params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.country) sp.set("country", params.country);
      sp.set("limit", "20");
      sp.set("page", String(params?.page ?? 1));
      return apiRequest<{ spots: ForagingSpot[]; total: number }>(
        `/api/foraging-spots?${sp}`,
        { token: token! }
      );
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentForagingSpots() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["foraging-spots", "recent"],
    queryFn: () =>
      apiRequest<{ spots: ForagingSpot[] }>("/api/foraging-spots/recent", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Conversations & Messages ─────────────────────────────────────────────────

export function useConversations() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      apiRequest<Conversation[]>("/api/conversations", { token: token! }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

export function useMessages(userId: string) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["messages", userId],
    queryFn: () =>
      apiRequest<{ messages: Message[] }>(`/api/messages/${userId}`, {
        token: token!,
      }),
    enabled: !!token && !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUnreadCount() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["messages", "unread-count"],
    queryFn: () =>
      apiRequest<{ count: number }>("/api/messages/unread/count", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export function useProfile() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["profile"],
    queryFn: () =>
      apiRequest<{ user: import("./auth").AuthUser }>("/api/auth/me", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export function useUpcomingEvents() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: () =>
      apiRequest<{ events: EatEvent[] }>("/api/events/upcoming", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  description: string;
  type: string;
  city?: string;
  country?: string;
  verified: boolean;
  rating?: number;
  logoUrl?: string;
}

export function useVendors() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["vendors"],
    queryFn: () =>
      apiRequest<{ data: Vendor[] }>("/api/vendors", { token: token! }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Members ─────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  name: string;
  bio?: string;
  city?: string;
  country?: string;
  profileImageUrl?: string;
  emailVerified: boolean;
}

export function useMembers() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["members"],
    queryFn: () =>
      apiRequest<{ data: Member[] }>("/api/members", { token: token! }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Events (full list) ───────────────────────────────────────────────────────

export function useEvents() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["events", "all"],
    queryFn: () =>
      apiRequest<{ data: EatEvent[] }>("/api/events", { token: token! }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Training Modules ─────────────────────────────────────────────────────────

export interface TrainingModule {
  id: string;
  title: string;
  category: string;
  difficultyLevel: string;
  estimatedDuration?: number;
  isPremium: boolean;
  imageUrl?: string;
  description?: string;
}

export function useTrainingModules() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["training-modules"],
    queryFn: () =>
      apiRequest<{ data: TrainingModule[] }>("/api/training-modules", { token: token! }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface JobPost {
  id: string;
  title: string;
  description: string;
  jobType: string;
  locationText?: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  status: string;
  createdAt: string;
}

export function useJobs() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["jobs"],
    queryFn: () =>
      apiRequest<{ data: JobPost[] }>("/api/jobs", { token: token! }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Garden Clubs ─────────────────────────────────────────────────────────────

export interface GardenClub {
  id: string;
  name: string;
  description: string;
  city?: string;
  country?: string;
  region?: string;
  email?: string;
  website?: string;
  meetingSchedule?: string;
  memberCount?: number;
}

export function useGardenClubs() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["garden-clubs"],
    queryFn: () =>
      apiRequest<{ data: GardenClub[] }>("/api/garden-clubs", { token: token! }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiRequest<{ notifications: EatNotification[] }>("/api/notifications", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUnreadNotificationCount() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () =>
      apiRequest<{ count: number }>("/api/notifications/unread/count", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}
