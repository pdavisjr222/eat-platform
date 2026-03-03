import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Resolves server-uploaded image paths (e.g. /uploads/listings/abc.jpg)
 * to a fully-qualified URL using the API base URL.
 * External URLs (https://...) are returned unchanged.
 */
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}
