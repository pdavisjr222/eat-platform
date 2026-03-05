/**
 * ImagePickerField — reusable image pick + upload UI component
 *
 * Usage:
 *   <ImagePickerField
 *     uploadEndpoint="/api/listings/abc123/images"
 *     onUploadComplete={(url) => setImageUrl(url)}
 *   />
 *
 * Shows the selected image preview, an upload progress indicator,
 * and error state. Supports both library and camera sources.
 */

import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useState } from "react";
import { pickImage, uploadImage } from "../lib/uploadImage";

interface ImagePickerFieldProps {
  /** Server endpoint that accepts multipart/form-data POST with "image" field */
  uploadEndpoint: string;
  /** Called with the hosted URL once upload succeeds */
  onUploadComplete: (url: string) => void;
  /** Optional initial image URL to display */
  initialUrl?: string;
  /** Label shown above the picker (default: "Photo") */
  label?: string;
}

export function ImagePickerField({
  uploadEndpoint,
  onUploadComplete,
  initialUrl,
  label = "Photo",
}: ImagePickerFieldProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(source: "library" | "camera") {
    setError(null);
    try {
      const asset = await pickImage(source);
      if (!asset) return; // user cancelled or permission denied

      setPreviewUri(asset.uri);
      setUploading(true);

      const result = await uploadImage(uploadEndpoint, asset);
      onUploadComplete(result.url);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
      setPreviewUri(initialUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  function promptSource() {
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Camera", onPress: () => handlePick("camera") },
      { text: "Photo Library", onPress: () => handlePick("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.picker}
        onPress={promptSource}
        activeOpacity={0.75}
        disabled={uploading}
      >
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>Tap to add photo</Text>
          </View>
        )}

        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.uploadingText}>Uploading…</Text>
          </View>
        )}
      </TouchableOpacity>

      {previewUri && !uploading && (
        <TouchableOpacity style={styles.changeBtn} onPress={promptSource}>
          <Text style={styles.changeBtnText}>Change photo</Text>
        </TouchableOpacity>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  picker: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  preview: { width: "100%", height: "100%" },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderIcon: { fontSize: 32 },
  placeholderText: { fontSize: 14, color: "#9ca3af" },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadingText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  changeBtn: { alignSelf: "flex-start", marginTop: 6 },
  changeBtnText: { fontSize: 13, color: "#22c55e", fontWeight: "600" },
  errorText: { fontSize: 13, color: "#dc2626", marginTop: 4 },
});
