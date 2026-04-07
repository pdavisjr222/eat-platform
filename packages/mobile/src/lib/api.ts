// Base URL: set EXPO_PUBLIC_API_URL in .env
// iOS Simulator: http://localhost:5000
// Android Emulator: http://10.0.2.2:5000
// Physical device: http://<your-local-ip>:5000
// Production: https://server-production-5d63.up.railway.app

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

interface ApiOptions extends RequestInit {
  token?: string;
}

interface ApiError {
  error: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, headers: extraHeaders, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string>),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  let data: T | ApiError;
  try {
    data = await response.json();
  } catch {
    throw new ApiRequestError("Invalid server response", response.status);
  }

  if (!response.ok) {
    const err = data as ApiError;
    throw new ApiRequestError(
      err.error ?? "Request failed",
      response.status,
      err.details
    );
  }

  return data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AuthUser = import("./auth").AuthUser;

interface Listing {
  id: string;
  title: string;
  type: string;
  category: string;
  price?: number;
  currency?: string;
  location?: string;
  description?: string;
  images?: string[];
  availabilityStatus: string;
  ownerUserId: string;
  createdAt: string;
}

interface EatEvent {
  id: string;
  title: string;
  type: string;
  description?: string;
  startDateTime: string;
  endDateTime?: string;
  locationAddress?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  organizerUserId: string;
}

interface JobPost {
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
  postedByUserId: string;
  createdAt: string;
}

interface Vendor {
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

interface GardenClub {
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

interface Message {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface EatNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface Review {
  id: string;
  subjectType: string;
  subjectId: string;
  rating: number;
  comment?: string;
  reviewerUserId: string;
  createdAt: string;
}

interface TrainingModule {
  id: string;
  title: string;
  category: string;
  difficultyLevel: string;
  estimatedDuration?: number;
  isPremium: boolean;
  imageUrl?: string;
  description?: string;
}

interface Member {
  id: string;
  name: string;
  bio?: string;
  city?: string;
  country?: string;
  profileImageUrl?: string;
  emailVerified: boolean;
}

interface ForagingSpot {
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

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: AuthUser }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  signup: (name: string, email: string, password: string, referralCode?: string) =>
    apiRequest<{ message: string; userId?: string }>(
      "/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({ name, email, password, referralCode }),
      }
    ),

  me: (token: string) =>
    apiRequest<{ user: AuthUser }>("/api/auth/me", { token }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyEmail: (token: string) =>
    apiRequest<{ message: string }>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    apiRequest<{ message: string }>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiRequest<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
};

// ─── Profile API ─────────────────────────────────────────────────────────────

export const profileApi = {
  get: (token: string) =>
    apiRequest<{ user: AuthUser }>("/api/auth/me", { token }),

  update: (
    token: string,
    data: {
      name?: string;
      bio?: string;
      country?: string;
      region?: string;
      city?: string;
      interests?: string[];
      skills?: string[];
      offerings?: string[];
    }
  ) =>
    apiRequest<{ user: AuthUser }>("/api/profile", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  uploadImage: (token: string, formData: FormData) =>
    apiRequest<{ imageUrl: string }>("/api/profile/image", {
      method: "POST",
      token,
      body: formData as any,
      headers: { /* let fetch set multipart boundary */ } as any,
    }),
};

// ─── Listings API ────────────────────────────────────────────────────────────

export const listingsApi = {
  list: (token: string, params?: { type?: string; category?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.set("type", params.type);
    if (params?.category) sp.set("category", params.category);
    sp.set("limit", String(params?.limit ?? 20));
    sp.set("page", String(params?.page ?? 1));
    return apiRequest<{ data: Listing[]; pagination: any }>(`/api/listings?${sp}`, { token });
  },

  myListings: (token: string) =>
    apiRequest<{ data: Listing[]; pagination: any }>("/api/listings/my-listings", { token }),

  get: (token: string, id: string) =>
    apiRequest<Listing>(`/api/listings/${id}`, { token }),

  create: (token: string, data: {
    title: string;
    type: string;
    category: string;
    description?: string;
    price?: number;
    currency?: string;
    location?: string;
  }) =>
    apiRequest<Listing>("/api/listings", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<{
    title: string;
    type: string;
    category: string;
    description: string;
    price: number;
    currency: string;
    location: string;
    availabilityStatus: string;
  }>) =>
    apiRequest<Listing>(`/api/listings/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    apiRequest<{ message: string }>(`/api/listings/${id}`, {
      method: "DELETE",
      token,
    }),

  uploadImages: (token: string, id: string, formData: FormData) =>
    apiRequest<{ images: string[] }>(`/api/listings/${id}/images`, {
      method: "POST",
      token,
      body: formData as any,
      headers: {} as any,
    }),
};

// ─── Events API ──────────────────────────────────────────────────────────────

export const eventsApi = {
  list: (token: string) =>
    apiRequest<{ data: EatEvent[] }>("/api/events", { token }),

  upcoming: (token: string) =>
    apiRequest<{ events: EatEvent[] }>("/api/events/upcoming", { token }),

  get: (token: string, id: string) =>
    apiRequest<EatEvent>(`/api/events/${id}`, { token }),

  create: (token: string, data: {
    title: string;
    type: string;
    description?: string;
    startDateTime: string;
    endDateTime?: string;
    locationAddress?: string;
    price?: number;
    currency?: string;
  }) =>
    apiRequest<EatEvent>("/api/events", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<{
    title: string;
    type: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    locationAddress: string;
    price: number;
    currency: string;
  }>) =>
    apiRequest<EatEvent>(`/api/events/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    apiRequest<{ message: string }>(`/api/events/${id}`, {
      method: "DELETE",
      token,
    }),

  register: (token: string, id: string) =>
    apiRequest<{ message: string }>(`/api/events/${id}/register`, {
      method: "POST",
      token,
    }),
};

// ─── Jobs API ────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (token: string) =>
    apiRequest<{ data: JobPost[] }>("/api/jobs", { token }),

  get: (token: string, id: string) =>
    apiRequest<JobPost>(`/api/jobs/${id}`, { token }),

  create: (token: string, data: {
    title: string;
    description: string;
    jobType: string;
    locationText?: string;
    isRemote?: boolean;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
  }) =>
    apiRequest<JobPost>("/api/jobs", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<{
    title: string;
    description: string;
    jobType: string;
    locationText: string;
    isRemote: boolean;
    salaryMin: number;
    salaryMax: number;
    salaryCurrency: string;
    status: string;
  }>) =>
    apiRequest<JobPost>(`/api/jobs/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    apiRequest<{ message: string }>(`/api/jobs/${id}`, {
      method: "DELETE",
      token,
    }),
};

// ─── Messages API ────────────────────────────────────────────────────────────

export const messagesApi = {
  conversations: (token: string) =>
    apiRequest<Conversation[]>("/api/conversations", { token }),

  list: (token: string, userId: string, since?: string) => {
    const sp = since ? `?since=${encodeURIComponent(since)}` : "";
    return apiRequest<{ messages: Message[] }>(`/api/messages/${userId}${sp}`, { token });
  },

  send: (token: string, data: {
    recipientUserId: string;
    content: string;
    messageType?: string;
    attachmentUrl?: string;
  }) =>
    apiRequest<Message>("/api/messages", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  unreadCount: (token: string) =>
    apiRequest<{ count: number }>("/api/messages/unread/count", { token }),
};

// ─── Vendors API ─────────────────────────────────────────────────────────────

export const vendorsApi = {
  list: (token: string) =>
    apiRequest<{ data: Vendor[] }>("/api/vendors", { token }),

  get: (token: string, id: string) =>
    apiRequest<Vendor>(`/api/vendors/${id}`, { token }),

  create: (token: string, data: {
    name: string;
    description: string;
    type: string;
    city?: string;
    country?: string;
  }) =>
    apiRequest<Vendor>("/api/vendors", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
};

// ─── Garden Clubs API ────────────────────────────────────────────────────────

export const gardenClubsApi = {
  list: (token: string) =>
    apiRequest<{ data: GardenClub[] }>("/api/garden-clubs", { token }),

  get: (token: string, id: string) =>
    apiRequest<GardenClub>(`/api/garden-clubs/${id}`, { token }),

  create: (token: string, data: {
    name: string;
    description: string;
    city?: string;
    country?: string;
    region?: string;
    email?: string;
    website?: string;
    meetingSchedule?: string;
  }) =>
    apiRequest<GardenClub>("/api/garden-clubs", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<{
    name: string;
    description: string;
    city: string;
    country: string;
    region: string;
    email: string;
    website: string;
    meetingSchedule: string;
  }>) =>
    apiRequest<GardenClub>(`/api/garden-clubs/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
};

// ─── Members API ─────────────────────────────────────────────────────────────

export const membersApi = {
  list: (token: string) =>
    apiRequest<{ data: Member[] }>("/api/members", { token }),

  get: (token: string, id: string) =>
    apiRequest<Member>(`/api/members/${id}`, { token }),
};

// ─── Foraging Spots API ──────────────────────────────────────────────────────

export const foragingSpotsApi = {
  list: (token: string, params?: { country?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.country) sp.set("country", params.country);
    sp.set("limit", String(params?.limit ?? 20));
    sp.set("page", String(params?.page ?? 1));
    return apiRequest<{ spots: ForagingSpot[]; total: number }>(`/api/foraging-spots?${sp}`, { token });
  },

  recent: (token: string) =>
    apiRequest<{ spots: ForagingSpot[] }>("/api/foraging-spots/recent", { token }),

  get: (token: string, id: string) =>
    apiRequest<ForagingSpot>(`/api/foraging-spots/${id}`, { token }),

  create: (token: string, data: {
    title: string;
    plantType: string;
    species?: string;
    latitude: number;
    longitude: number;
    season?: string;
    country?: string;
    region?: string;
  }) =>
    apiRequest<ForagingSpot>("/api/foraging-spots", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<{
    title: string;
    plantType: string;
    species: string;
    latitude: number;
    longitude: number;
    season: string;
    country: string;
    region: string;
  }>) =>
    apiRequest<ForagingSpot>(`/api/foraging-spots/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    apiRequest<{ message: string }>(`/api/foraging-spots/${id}`, {
      method: "DELETE",
      token,
    }),
};

// ─── Notifications API ───────────────────────────────────────────────────────

export const notificationsApi = {
  list: (token: string) =>
    apiRequest<{ notifications: EatNotification[] }>("/api/notifications", { token }),

  unreadCount: (token: string) =>
    apiRequest<{ count: number }>("/api/notifications/unread/count", { token }),

  markRead: (token: string, notificationIds: string[]) =>
    apiRequest<{ message: string }>("/api/notifications/mark-read", {
      method: "POST",
      token,
      body: JSON.stringify({ notificationIds }),
    }),
};

// ─── Reviews API ─────────────────────────────────────────────────────────────

export const reviewsApi = {
  list: (token: string, subjectType: string, subjectId: string) =>
    apiRequest<{ data: Review[] }>(`/api/reviews/${subjectType}/${subjectId}`, { token }),

  create: (token: string, data: {
    subjectType: string;
    subjectId: string;
    rating: number;
    comment?: string;
  }) =>
    apiRequest<Review>("/api/reviews", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
};

// ─── Training API ────────────────────────────────────────────────────────────

export const trainingApi = {
  list: (token: string) =>
    apiRequest<{ data: TrainingModule[] }>("/api/training-modules", { token }),

  get: (token: string, id: string) =>
    apiRequest<TrainingModule>(`/api/training-modules/${id}`, { token }),

  complete: (token: string, id: string) =>
    apiRequest<{ message: string }>(`/api/training-modules/${id}/complete`, {
      method: "POST",
      token,
    }),
};

// ─── Subscriptions API ───────────────────────────────────────────────────────

export const subscriptionsApi = {
  plans: (token: string) =>
    apiRequest<{ plans: any[] }>("/api/subscription/plans", { token }),

  status: (token: string) =>
    apiRequest<{ subscription: any }>("/api/subscription/status", { token }),

  checkout: (token: string, planId: string) =>
    apiRequest<{ url: string }>("/api/subscription/checkout", {
      method: "POST",
      token,
      body: JSON.stringify({ planId }),
    }),

  cancel: (token: string) =>
    apiRequest<{ message: string }>("/api/subscription/cancel", {
      method: "POST",
      token,
    }),
};
