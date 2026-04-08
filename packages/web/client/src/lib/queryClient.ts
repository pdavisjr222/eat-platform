import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { useAuth } from "./auth";

// API base URL - defaults to localhost:5000 in development
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").trim().replace(/\/+$/, "");

// Pre-flight guard: reject payloads above 10MB before sending (proxy/server limit is 15MB,
// but base64 encoding inflates size ~33% so 10MB gives comfortable headroom)
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Convert a relative upload path (e.g. /uploads/vendors/img.jpg) to a full URL
 * pointing at the API server, so images served from Railway load on the Vercel frontend.
 */
export function getMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function getAuthHeaders(): HeadersInit {
  const token = useAuth.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired or invalid — clear auth and send to login
      useAuth.getState().clearAuth();
      window.location.replace("/auth/login");
      throw new Error("Session expired. Please log in again.");
    }
    if (res.status === 413) {
      throw new Error("Images too large. Try fewer or smaller photos.");
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  const body = data ? JSON.stringify(data) : undefined;

  if (body && body.length > MAX_PAYLOAD_BYTES) {
    throw new Error("Images too large. Try fewer or smaller photos.");
  }

  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Check your connection and try again.");
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

    const res = await fetch(fullUrl, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
