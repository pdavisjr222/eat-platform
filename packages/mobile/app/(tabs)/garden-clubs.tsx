import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Linking } from "react-native";
import { useGardenClubs } from "../../src/lib/hooks";

export default function GardenClubsScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useGardenClubs();
  const clubs = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.heroBar}>
        <Text style={styles.heroTitle}>🌱 Garden Club</Text>
        <Text style={styles.heroSub}>Neighbors growing &amp; sharing food &amp; seed</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load clubs.</Text>
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
          {/* How it works */}
          <View style={styles.howItWorks}>
            {[
              { icon: "🌱", label: "Grow Together" },
              { icon: "🌾", label: "Share Harvest" },
              { icon: "🫘", label: "Seed Library" },
            ].map((item) => (
              <View key={item.label} style={styles.howItem}>
                <Text style={styles.howIcon}>{item.icon}</Text>
                <Text style={styles.howLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {clubs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={styles.emptyTitle}>No clubs near you yet</Text>
              <Text style={styles.emptyText}>Be the first to start a Garden Club in your community!</Text>
            </View>
          ) : (
            clubs.map((c) => (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.leafIcon}>
                    <Text style={{ fontSize: 22 }}>🌿</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.clubName}>{c.name}</Text>
                    {(c.city || c.country) && (
                      <Text style={styles.location}>📍 {[c.city, c.country].filter(Boolean).join(", ")}</Text>
                    )}
                  </View>
                  {c.memberCount ? (
                    <View style={styles.memberCount}>
                      <Text style={styles.memberCountNum}>{c.memberCount}</Text>
                      <Text style={styles.memberCountLabel}>members</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.desc} numberOfLines={2}>{c.description}</Text>
                {c.meetingSchedule ? (
                  <View style={styles.scheduleBadge}>
                    <Text style={styles.scheduleText}>📆 {c.meetingSchedule}</Text>
                  </View>
                ) : null}
                {c.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${c.email}`)}>
                    <Text style={styles.contactLink}>✉️ {c.email}</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  heroBar: { backgroundColor: "#15803d", padding: 16 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  heroSub: { fontSize: 13, color: "#bbf7d0", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 15, color: "#dc2626", marginBottom: 12 },
  retryBtn: { backgroundColor: "#22c55e", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "600" },
  list: { flex: 1, padding: 16 },
  howItWorks: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#f3f4f6", justifyContent: "space-around" },
  howItem: { alignItems: "center", gap: 4 },
  howIcon: { fontSize: 26 },
  howLabel: { fontSize: 11, fontWeight: "600", color: "#374151", textAlign: "center" },
  empty: { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 4 },
  emptyText: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  leafIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  clubName: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 2 },
  location: { fontSize: 12, color: "#9ca3af" },
  memberCount: { alignItems: "center" },
  memberCountNum: { fontSize: 16, fontWeight: "700", color: "#15803d" },
  memberCountLabel: { fontSize: 10, color: "#9ca3af" },
  desc: { fontSize: 13, color: "#6b7280", lineHeight: 18, marginBottom: 8 },
  scheduleBadge: { alignSelf: "flex-start", backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  scheduleText: { fontSize: 12, color: "#15803d", fontWeight: "500" },
  contactLink: { fontSize: 13, color: "#0891b2", marginTop: 2 },
});
