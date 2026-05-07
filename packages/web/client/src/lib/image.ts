// Client-side image helpers. Resize a picked file to keep server uploads small
// (phone photos are routinely 5MB+) and to produce predictable storage shapes
// for fields that accept data URLs (profile pictures, vendor logos, etc.).

export async function resizeImage(
  file: File,
  maxSize = 512,
  quality = 0.85
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Resize failed"))),
      "image/jpeg",
      quality
    );
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

// Convenience: pick file -> resize -> data URL in one call.
export async function fileToResizedDataUrl(
  file: File,
  maxSize = 512,
  quality = 0.85
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Pick an image file (JPEG, PNG, GIF, or WebP).");
  }
  const blob = await resizeImage(file, maxSize, quality);
  return blobToDataUrl(blob);
}
