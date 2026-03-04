import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useVendors } from "../../src/lib/hooks";

export default function VendorsScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useVendors();
  const vendors = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.heroBar}>
        <Text style={styles.heroTitle}>🌿 Vendors</Text>
        <Text style={styles.heroSub}>Eco-friendly businesses & services</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load vendors.</Text>
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
          {vendors.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌿</Text>
              <Text style={styles.emptyTitle}>No vendors yet</Text>
              <Text style={styles.emptyText}>Check back soon for eco-friendly vendors near you.</Text>
            </View>
          ) : (
            vendors.map((v) => (
              <TouchableOpacity key={v.id} style={styles.card} activeOpacity={0.8}>
                <View style={styles.cardTop}>
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoEmoji}>🌿</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{v.name}</Text>
                    <View style={styles.row}>
                      <View style={[styles.typeBadge, v.verified && styles.verifiedBadge]}>
                        <Text style={[styles.typeBadgeText, v.verified && styles.verifiedBadgeText]}>
                          {v.verified ? "✓ Verified" : v.type}
                        </Text>
                      </View>
                    </View>
                    {(v.city || v.country) && (
                      <Text style={styles.location}>📍 {[v.city, v.country].filter(Boolean).join(", ")}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.desc} numberOfLines={2}>{v.description}</Text>
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
  heroBar: { backgroundColor: "#0e7490", padding: 16 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  heroSub: { fontSize: 13, color: "#a5f3fc", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 15, color: "#dc2626", marginBottom: 12 },
  retryBtn: { backgroundColor: "#22c55e", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "600" },
  list: { flex: 1, padding: 16 },
  empty: { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 4 },
  emptyText: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6" },
  cardTop: { flexDirection: "row", gap: 12, marginBottom: 8 },
  logoPlaceholder: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" },
  logoEmoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  row: { flexDirection: "row", gap: 6, marginBottom: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#f3f4f6" },
  typeBadgeText: { fontSize: 12, color: "#6b7280" },
  verifiedBadge: { backgroundColor: "#dcfce7" },
  verifiedBadgeText: { color: "#16a34a" },
  location: { fontSize: 12, color: "#9ca3af" },
  desc: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
});
