import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../src/lib/auth";
import { useProfile } from "../src/lib/hooks";
import { authApi, ApiRequestError } from "../src/lib/api";

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, setAuth } = useAuthStore();
  const { data } = useProfile();
  const profile = data?.user;

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");
  const [skills, setSkills] = useState("");
  const [offerings, setOfferings] = useState("");
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with current profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setBio(profile.bio ?? "");
      setCountry(profile.country ?? "");
      setRegion(profile.region ?? "");
      setCity(profile.city ?? "");
      setInterests((profile.interests ?? []).join(", "));
      setSkills((profile.skills ?? []).join(", "));
      setOfferings((profile.offerings ?? []).join(", "));
    }
  }, [profile]);

  function parseCSV(val: string): string[] {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await authApi.updateProfile(token!, {
        name: name.trim(),
        bio: bio.trim() || undefined,
        country: country.trim() || undefined,
        region: region.trim() || undefined,
        city: city.trim() || undefined,
        interests: interests.trim() ? parseCSV(interests) : [],
        skills: skills.trim() ? parseCSV(skills) : [],
        offerings: offerings.trim() ? parseCSV(offerings) : [],
      });
      // Update auth store with fresh user data
      setAuth(token!, result.user);
      // Invalidate profile query so profile screen refreshes
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    Alert.alert("Discard Changes?", "Your unsaved changes will be lost.", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleCancel} disabled={loading}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Section title="Basic Info">
          <Field label="Full Name *">
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              editable={!loading}
            />
          </Field>
          <Field label="Bio">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell the community about yourself..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </Field>
        </Section>

        <Section title="Location">
          <Field label="Country">
            <TextInput
              style={styles.input}
              value={country}
              onChangeText={setCountry}
              placeholder="e.g. United States"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              editable={!loading}
            />
          </Field>
          <Field label="Region / State">
            <TextInput
              style={styles.input}
              value={region}
              onChangeText={setRegion}
              placeholder="e.g. California"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              editable={!loading}
            />
          </Field>
          <Field label="City">
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Los Angeles"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              editable={!loading}
            />
          </Field>
        </Section>

        <Section title="Community Info">
          <Text style={styles.hint}>Separate multiple items with commas</Text>
          <Field label="Interests">
            <TextInput
              style={styles.input}
              value={interests}
              onChangeText={setInterests}
              placeholder="e.g. Foraging, Organic Farming, Bees"
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
          </Field>
          <Field label="Skills">
            <TextInput
              style={styles.input}
              value={skills}
              onChangeText={setSkills}
              placeholder="e.g. Permaculture, Seed Saving, Cooking"
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
          </Field>
          <Field label="What I Offer">
            <TextInput
              style={styles.input}
              value={offerings}
              onChangeText={setOfferings}
              placeholder="e.g. Fresh Eggs, Herb Cuttings, Workshops"
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
          </Field>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f9fafb" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  cancelText: { fontSize: 16, color: "#6b7280" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111827" },
  saveText: { fontSize: 16, fontWeight: "600", color: "#22c55e" },
  scroll: { flex: 1 },
  container: { padding: 16 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 14 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 4,
    marginLeft: 4,
  },
  field: { marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});
