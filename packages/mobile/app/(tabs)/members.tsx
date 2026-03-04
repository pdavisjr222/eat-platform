import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useMembers } from "../../src/lib/hooks";

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
}

export default function MembersScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useMembers();
  const members = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.heroBar}>
        <Text style={styles.heroTitle}>👥 Members</Text>
        <Text style={styles.heroSub}>Your sustainable community</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load members.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor="#22c55e" />}
        >
          {members.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No members yet</Text>
            </View>
          ) : (
            members.map((m) => (
              <TouchableOpacity key={m.id} style={styles.card} activeOpacity={0.8}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(m.name)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{m.name}</Text>
                  {(m.city || m.country) && (
                    <Text style={styles.location}>📍 {[m.city, m.country].filter(Boolean).join(", ")}</Text>
                  )}
                  {m.bio ? <Text style={styles.bio} numberOfLines={1}>{m.bio}</Text> : null}
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  heroBar: { backgroundColor: "#6d28d9", padding: 16 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  heroSub: { fontSize: 13, color: "#ddd6fe", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 15, color: "#dc2626", marginBottom: 12 },
  retryBtn: { backgroundColor: "#22c55e", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "600" },
  list: { flex: 1, padding: 16 },
  empty: { alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 2 },
  location: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  bio: { fontSize: 13, color: "#6b7280" },
});
