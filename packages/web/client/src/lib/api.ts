import { getToken, removeToken } from "./auth";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    removeToken();
    window.location.href = "/auth/login";
    throw new ApiError(401, "Session expired");
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data as { error?: string }).error ?? "Request failed",
      (data as { details?: unknown }).details
    );
  }

  return data as T;
}
