/**
 * uploadImage — multipart/form-data upload utility
 *
 * Sends a local file URI to the server and returns the hosted URL.
 * Used by ImagePickerField and any screen that needs image upload.
 */

import * as ImagePicker from "expo-image-picker";
import { getToken } from "./auth";
import { ApiRequestError } from "./api";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

export interface UploadResult {
  url: string;
}

/**
 * Pick one image from the library or camera.
 * Returns null if the user cancels or permission is denied.
 */
export async function pickImage(
  source: "library" | "camera" = "library"
): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === "camera") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return null;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    return result.canceled ? null : result.assets[0];
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  return result.canceled ? null : result.assets[0];
}

/**
 * Upload a local asset URI to the given server endpoint.
 * Endpoint must accept multipart/form-data with field name "image".
 *
 * @param endpoint  e.g. "/api/profile/image" or "/api/listings/:id/images"
 * @param asset     ImagePickerAsset returned by pickImage()
 * @returns         UploadResult with the hosted URL
 */
export async function uploadImage(
  endpoint: string,
  asset: ImagePicker.ImagePickerAsset
): Promise<UploadResult> {
  const token = await getToken();
  if (!token) throw new ApiRequestError("Authentication required", 401);

  const filename = asset.uri.split("/").pop() ?? "upload.jpg";
  const mimeType = asset.mimeType ?? "image/jpeg";

  const body = new FormData();
  body.append("image", {
    uri: asset.uri,
    name: filename,
    type: mimeType,
  } as any); // FormData on RN accepts this shape

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — let fetch set the boundary automatically
    },
    body,
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new ApiRequestError("Invalid server response", response.status);
  }

  if (!response.ok) {
    throw new ApiRequestError(
      data?.error ?? "Upload failed",
      response.status,
      data?.details
    );
  }

  if (!data.url) {
    throw new ApiRequestError("Server returned no URL", 500);
  }

  return { url: data.url };
}
