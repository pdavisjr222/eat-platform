import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../../src/lib/auth";
import { useProfile } from "../../src/lib/hooks";

const MENU_ITEMS = [
  { icon: "🛒", label: "My Listings", section: "marketplace" },
  { icon: "⭐", label: "Reviews Received", section: "reviews" },
  { icon: "💳", label: "Credit Balance", section: "credits" },
  { icon: "🔔", label: "Notifications", section: "notifications" },
  { icon: "🎓", label: "Learning Progress", section: "learning" },
  { icon: "🤝", label: "Referral Program", section: "referrals" },
  { icon: "⚙️", label: "Settings", section: "settings" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, clearAuth, setAuth } = useAuthStore();

  const { data, isLoading } = useProfile();

  // Hydrate store if user is null but we got fresh data from API
  useEffect(() => {
    if (data?.user && token && !user) {
      setAuth(token, data.user);
    }
  }, [data, token, user, setAuth]);

  // Prefer freshly fetched profile, fall back to store
  const profile = data?.user ?? user;

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n) => n[0] ?? "")
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          clearAuth();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (isLoading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.name ?? "Unknown"}</Text>
        <Text style={styles.email}>{profile?.email ?? ""}</Text>
        {profile?.isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>⭐ Premium Member</Text>
          </View>
        )}
        <View style={styles.roleRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{profile?.role ?? "user"}</Text>
          </View>
          {profile?.emailVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {profile?.creditBalance != null
              ? profile.creditBalance.toFixed(0)
              : "0"}
          </Text>
          <Text style={styles.statLabel}>Credits</Text>
        </View>
        <View style={styles.statDivider} />
        {/* TODO: fetch listings count via useMyListings() */}
        <View style={styles.stat}>
          <Text style={styles.statValue}>—</Text>
          <Text style={styles.statLabel}>Listings</Text>
        </View>
        <View style={styles.statDivider} />
        {/* TODO: fetch reviews count via useReviews() */}
        <View style={styles.stat}>
          <Text style={styles.statValue}>—</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.section}
            style={[
              styles.menuItem,
              i === MENU_ITEMS.length - 1 && styles.menuItemLast,
            ]}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Edit profile */}
      <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/edit-profile" as never)}>
        <Text style={styles.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>E.A.T. Platform v1.0.0</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    backgroundColor: "#ffffff",
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#ffffff" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 2 },
  email: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  premiumBadge: {
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde047",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  premiumBadgeText: { fontSize: 12, color: "#92400e", fontWeight: "600" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBadge: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleText: { fontSize: 12, color: "#166534", fontWeight: "500" },
  verifiedBadge: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  verifiedText: { fontSize: 12, color: "#1d4ed8", fontWeight: "500" },
  stats: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    marginTop: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: "#111827" },
  statLabel: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#f3f4f6" },
  menu: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { fontSize: 18, marginRight: 12, width: 28 },
  menuLabel: { flex: 1, fontSize: 15, color: "#374151" },
  menuChevron: { fontSize: 20, color: "#d1d5db" },
  editBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  editBtnText: { fontSize: 15, fontWeight: "600", color: "#22c55e" },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fef2f2",
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#dc2626" },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#d1d5db",
    marginTop: 20,
  },
});
