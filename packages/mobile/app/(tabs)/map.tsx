import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { useRef, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useRecentForagingSpots } from "../../src/lib/hooks";

const DEFAULT_REGION: Region = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 60,
  longitudeDelta: 60,
};

const SEASON_COLORS: Record<string, { bg: string; text: string }> = {
  Spring: { bg: "#f0fdf4", text: "#16a34a" },
  Summer: { bg: "#fefce8", text: "#ca8a04" },
  Autumn: { bg: "#fff7ed", text: "#ea580c" },
  Winter: { bg: "#eff6ff", text: "#2563eb" },
};

function normalizeSeason(raw?: string): string {
  if (!raw) return "";
  const first = raw.split(",")[0].trim();
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { data, isLoading, isError, refetch } = useRecentForagingSpots();
  const spots = data?.spots ?? [];

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "denied">("idle");

  const selectedSpot = spots.find((s) => s.id === selectedSpotId) ?? null;

  // Request location permission and fly to user position
  const goToMyLocation = useCallback(async () => {
    setLocationStatus("loading");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        },
        800
      );
      setLocationStatus("idle");
    } catch {
      setLocationStatus("idle");
    }
  }, []);

  // Select and fly to a spot from the chip list
  const focusSpot = useCallback(
    (spotId: string) => {
      const spot = spots.find((s) => s.id === spotId);
      if (!spot) return;
      setSelectedSpotId(spotId);
      mapRef.current?.animateToRegion(
        {
          latitude: spot.latitude,
          longitude: spot.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        600
      );
    },
    [spots]
  );

  return (
    <View style={styles.container}>
      {/* ── Map ── */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            initialRegion={DEFAULT_REGION}
            showsUserLocation
            showsMyLocationButton={false}
            onPress={() => setSelectedSpotId(null)}
          >
            {spots.map((spot) => (
              <Marker
                key={spot.id}
                coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                title={spot.title}
                description={spot.species ?? spot.plantType}
                pinColor={spot.isVerified ? "#22c55e" : "#f59e0b"}
                onPress={() => setSelectedSpotId(spot.id)}
              />
            ))}
          </MapView>
        )}

        {/* Locate-me FAB */}
        <TouchableOpacity
          style={styles.locateBtn}
          onPress={goToMyLocation}
          activeOpacity={0.8}
        >
          {locationStatus === "loading" ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <Text style={styles.locateBtnText}>📍</Text>
          )}
        </TouchableOpacity>

        {locationStatus === "denied" && (
          <View style={styles.permissionBanner}>
            <Text style={styles.permissionText}>
              Location permission denied — enable it in Settings.
            </Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>Failed to load spots.</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.errorBannerRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Selected spot callout ── */}
      {selectedSpot && (
        <View style={styles.callout}>
          <View style={styles.calloutContent}>
            <View style={{ flex: 1 }}>
              <View style={styles.calloutHeader}>
                <Text style={styles.calloutTitle} numberOfLines={1}>
                  {selectedSpot.title}
                </Text>
                {selectedSpot.isVerified && (
                  <Text style={styles.verifiedBadge}>✓ Verified</Text>
                )}
              </View>
              <Text style={styles.calloutSpecies}>
                {selectedSpot.species ?? selectedSpot.plantType}
              </Text>
              {(selectedSpot.region || selectedSpot.country) && (
                <Text style={styles.calloutLocation}>
                  📍 {[selectedSpot.region, selectedSpot.country].filter(Boolean).join(", ")}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.calloutClose}
              onPress={() => setSelectedSpotId(null)}
            >
              <Text style={styles.calloutCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Horizontal chip list ── */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            Nearby Spots{spots.length > 0 ? ` (${spots.length})` : ""}
          </Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/foraging/create" as any)}
          >
            <Text style={styles.addBtnText}>+ Log Spot</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
        >
          {spots.length === 0 && !isLoading ? (
            <View style={styles.emptyChip}>
              <Text style={styles.emptyChipText}>No spots yet — be the first!</Text>
            </View>
          ) : (
            spots.map((spot) => {
              const seasonKey = normalizeSeason(spot.season);
              const season = SEASON_COLORS[seasonKey] ?? { bg: "#f3f4f6", text: "#6b7280" };
              const isSelected = spot.id === selectedSpotId;
              return (
                <Pressable
                  key={spot.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => focusSpot(spot.id)}
                >
                  <Text style={styles.chipIcon}>🌿</Text>
                  <View>
                    <Text
                      style={[styles.chipTitle, isSelected && styles.chipTitleSelected]}
                      numberOfLines={1}
                    >
                      {spot.title}
                    </Text>
                    {seasonKey ? (
                      <View style={[styles.seasonTag, { backgroundColor: season.bg }]}>
                        <Text style={[styles.seasonText, { color: season.text }]}>
                          {seasonKey}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },

  // Map
  mapContainer: { flex: 1, position: "relative" },
  map: { ...StyleSheet.absoluteFillObject },
  mapLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
  },

  // Locate FAB
  locateBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  locateBtnText: { fontSize: 20 },

  // Banners
  permissionBanner: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionText: { fontSize: 13, color: "#92400e", textAlign: "center" },
  errorBanner: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  errorBannerText: { fontSize: 13, color: "#991b1b" },
  errorBannerRetry: { fontSize: 13, color: "#dc2626", fontWeight: "600" },

  // Callout
  callout: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  calloutContent: { flexDirection: "row", alignItems: "flex-start" },
  calloutHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  calloutTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  verifiedBadge: { fontSize: 11, color: "#22c55e", fontWeight: "600" },
  calloutSpecies: { fontSize: 13, color: "#6b7280", fontStyle: "italic", marginBottom: 2 },
  calloutLocation: { fontSize: 12, color: "#9ca3af" },
  calloutClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  calloutCloseText: { fontSize: 13, color: "#6b7280" },

  // Bottom strip
  listContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingBottom: 8,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  addBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  chipList: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,
  },
  chipSelected: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  chipIcon: { fontSize: 18 },
  chipTitle: { fontSize: 13, fontWeight: "600", color: "#374151", maxWidth: 120 },
  chipTitleSelected: { color: "#15803d" },
  seasonTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 3 },
  seasonText: { fontSize: 11, fontWeight: "500" },
  emptyChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  emptyChipText: { fontSize: 13, color: "#9ca3af" },
});
