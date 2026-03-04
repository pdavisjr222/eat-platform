import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../src/lib/auth";
import { apiRequest } from "../src/lib/api";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, setAuth } = useAuthStore();

  const [name, setName] = useState((user as any)?.name ?? "");
  const [bio, setBio] = useState((user as any)?.bio ?? "");
  const [city, setCity] = useState((user as any)?.city ?? "");
  const [region, setRegion] = useState((user as any)?.region ?? "");
  const [country, setCountry] = useState((user as any)?.country ?? "");
  const [interests, setInterests] = useState<string>((user as any)?.interests?.join(", ") ?? "");
  const [skills, setSkills] = useState<string>((user as any)?.skills?.join(", ") ?? "");
  const [offerings, setOfferings] = useState<string>((user as any)?.offerings?.join(", ") ?? "");
  const [avatarUri, setAvatarUri] = useState<string | undefined>(
    resolveImageUrl((user as any)?.profileImageUrl)
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const splitTags = (s: string) =>
    s.split(",").map((t) => t.trim()).filter(Boolean);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Allow access to your photo library to upload a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: "profile.jpg",
      } as any);

      const res = await fetch(`${API_BASE}/api/profile/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAvatarUri(resolveImageUrl(data.imageUrl));
    } catch (err: any) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/profile", {
        name: name.trim(),
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        region: region.trim() || undefined,
        country: country.trim() || undefined,
        interests: splitTags(interests),
        skills: splitTags(skills),
        offerings: splitTags(offerings),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (token && data.user) setAuth(token, data.user);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Save failed", err.message || "Please try again.");
    },
  });

  const initials = name
    .split(" ").map((n: string) => n[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
          style={[styles.saveBtn, (!name.trim() || saveMutation.isPending) && styles.saveBtnDisabled]}
        >
          {saveMutation.isPending
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* Photo */}
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={pickPhoto} disabled={uploadingPhoto} style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            {uploadingPhoto
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Text style={styles.cameraIcon}>📷</Text>}
          </View>
        </TouchableOpacity>
        <Text style={styles.photoHint}>Tap to change photo</Text>
      </View>

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Field label="Name *" value={name} onChangeText={setName} placeholder="Your full name" />
        <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell the community about yourself..." multiline />
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Field label="City" value={city} onChangeText={setCity} placeholder="Kingston" />
        <Field label="Region / State" value={region} onChangeText={setRegion} placeholder="Surrey" />
        <Field label="Country" value={country} onChangeText={setCountry} placeholder="Jamaica" />
      </View>

      {/* Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests, Skills & Offerings</Text>
        <Text style={styles.tagHint}>Separate each item with a comma</Text>
        <Field label="Interests" value={interests} onChangeText={setInterests} placeholder="permaculture, foraging, beekeeping" />
        <Field label="Skills" value={skills} onChangeText={setSkills} placeholder="seed saving, woodworking" />
        <Field label="Offerings" value={offerings} onChangeText={setOfferings} placeholder="fresh produce, herbal teas" />
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function Field({
  label, value, onChangeText, placeholder, multiline,
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fafafa",
  },
  multiline: { minHeight: 90, paddingTop: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: { padding: 4, minWidth: 40 },
  backArrow: { fontSize: 32, color: "#22c55e", lineHeight: 36 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  saveBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnDisabled: { backgroundColor: "#d1d5db" },
  saveBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  photoSection: { alignItems: "center", paddingVertical: 24, backgroundColor: "#ffffff", marginBottom: 12 },
  avatarWrap: { position: "relative", width: 90, height: 90 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#22c55e",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitials: { fontSize: 32, fontWeight: "700", color: "#ffffff" },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#ffffff",
  },
  cameraIcon: { fontSize: 14 },
  photoHint: { fontSize: 12, color: "#9ca3af", marginTop: 8 },
  section: {
    backgroundColor: "#ffffff",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 14 },
  tagHint: { fontSize: 12, color: "#9ca3af", marginBottom: 10, marginTop: -8 },
});
