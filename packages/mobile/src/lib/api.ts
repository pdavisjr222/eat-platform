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

// Typed auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: import("./auth").AuthUser }>(
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
    apiRequest<{ user: import("./auth").AuthUser }>("/api/auth/me", { token }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};
