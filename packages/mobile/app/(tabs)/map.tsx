import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRecentForagingSpots } from "../../src/lib/hooks";

const SEASON_COLORS: Record<string, { bg: string; text: string }> = {
  Spring: { bg: "#f0fdf4", text: "#16a34a" },
  Summer: { bg: "#fefce8", text: "#ca8a04" },
  Autumn: { bg: "#fff7ed", text: "#ea580c" },
  Winter: { bg: "#eff6ff", text: "#2563eb" },
};

function normalizeSeason(raw?: string): string {
  if (!raw) return "";
  // The API may return comma-separated seasons or a single season
  const first = raw.split(",")[0].trim();
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export default function MapScreen() {
  const { data, isLoading, isError, refetch } = useRecentForagingSpots();

  const spots = data?.spots ?? [];

  return (
    <View style={styles.container}>
      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
        <Text style={styles.mapPlaceholderText}>Interactive Map</Text>
        <Text style={styles.mapPlaceholderSub}>
          Full map view with react-native-maps coming soon
        </Text>
        <TouchableOpacity style={styles.locateBtn}>
          <Text style={styles.locateBtnText}>📍 Use My Location</Text>
        </TouchableOpacity>
      </View>

      {/* Nearby spots header */}
      <View style={styles.spotsHeader}>
        <Text style={styles.spotsTitle}>Nearby Spots</Text>
        <TouchableOpacity style={styles.addSpotBtn}>
          <Text style={styles.addSpotBtnText}>+ Log Spot</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load foraging spots.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.spotsList}
          showsVerticalScrollIndicator={false}
        >
          {spots.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌿</Text>
              <Text style={styles.emptyTitle}>No spots logged yet</Text>
              <Text style={styles.emptyText}>
                Be the first to log a foraging spot in your area.
              </Text>
            </View>
          ) : (
            spots.map((spot) => {
              const seasonKey = normalizeSeason(spot.season);
              const season = SEASON_COLORS[seasonKey] ?? {
                bg: "#f9fafb",
                text: "#6b7280",
              };
              return (
                <TouchableOpacity key={spot.id} style={styles.spotCard}>
                  <View style={styles.spotCardLeft}>
                    <Text style={styles.spotIcon}>🌿</Text>
                  </View>
                  <View style={styles.spotCardContent}>
                    <View style={styles.spotCardHeader}>
                      <Text style={styles.spotTitle}>{spot.title}</Text>
                      {spot.isVerified && (
                        <Text style={styles.verifiedBadge}>✓ Verified</Text>
                      )}
                    </View>
                    {spot.species ? (
                      <Text style={styles.spotSpecies}>{spot.species}</Text>
                    ) : (
                      <Text style={styles.spotSpecies}>{spot.plantType}</Text>
                    )}
                    <View style={styles.spotMeta}>
                      {seasonKey ? (
                        <View
                          style={[styles.seasonTag, { backgroundColor: season.bg }]}
                        >
                          <Text style={[styles.seasonText, { color: season.text }]}>
                            {seasonKey}
                          </Text>
                        </View>
                      ) : null}
                      {spot.region || spot.country ? (
                        <Text style={styles.distance}>
                          📍 {[spot.region, spot.country].filter(Boolean).join(", ")}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.spacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  mapPlaceholder: {
    height: 220,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#bbf7d0",
  },
  mapPlaceholderIcon: { fontSize: 36, marginBottom: 6 },
  mapPlaceholderText: { fontSize: 16, fontWeight: "600", color: "#166534" },
  mapPlaceholderSub: {
    fontSize: 12,
    color: "#4ade80",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 12,
    paddingHorizontal: 32,
  },
  locateBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locateBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  spotsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  spotsTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  addSpotBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSpotBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  spotsList: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 15, color: "#dc2626", marginBottom: 12 },
  retryBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: { color: "#ffffff", fontWeight: "600" },
  empty: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 4 },
  emptyText: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  spotCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  spotCardLeft: {
    width: 44,
    height: 44,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  spotIcon: { fontSize: 22 },
  spotCardContent: { flex: 1 },
  spotCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spotTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  verifiedBadge: { fontSize: 11, color: "#22c55e", fontWeight: "600" },
  spotSpecies: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 6,
  },
  spotMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  seasonTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  seasonText: { fontSize: 12, fontWeight: "500" },
  distance: { fontSize: 12, color: "#6b7280" },
  spacer: { height: 24 },
});
