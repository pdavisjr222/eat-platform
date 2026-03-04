import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useEvents } from "../../src/lib/hooks";

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const typeColor: Record<string, string> = {
  workshop: "#d97706",
  meetup: "#7c3aed",
  market: "#16a34a",
  tour: "#0891b2",
  webinar: "#0f766e",
};

export default function EventsScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useEvents();
  const events = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.heroBar}>
        <Text style={styles.heroTitle}>📅 Events</Text>
        <Text style={styles.heroSub}>Workshops, markets & meetups</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load events.</Text>
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
          {events.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No upcoming events</Text>
              <Text style={styles.emptyText}>Check back soon for workshops and community events.</Text>
            </View>
          ) : (
            events.map((e) => {
              const color = typeColor[e.type] ?? "#6b7280";
              return (
                <TouchableOpacity key={e.id} style={styles.card} activeOpacity={0.8}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateText}>
                      {new Date(e.startDateTime).toLocaleDateString("en-US", { month: "short" })}
                    </Text>
                    <Text style={styles.dateDay}>
                      {new Date(e.startDateTime).getDate()}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
                      <Text style={[styles.typeBadgeText, { color }]}>
                        {e.type.charAt(0).toUpperCase() + e.type.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.title}>{e.title}</Text>
                    {e.locationAddress && <Text style={styles.loc}>📍 {e.locationAddress}</Text>}
                    {e.price ? (
                      <Text style={styles.price}>{e.currency ?? "USD"} {Number(e.price).toFixed(2)}</Text>
                    ) : (
                      <Text style={styles.free}>Free</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  heroBar: { backgroundColor: "#b91c1c", padding: 16 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  heroSub: { fontSize: 13, color: "#fecaca", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 15, color: "#dc2626", marginBottom: 12 },
  retryBtn: { backgroundColor: "#22c55e", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "600" },
  list: { flex: 1, padding: 16 },
  empty: { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 4 },
  emptyText: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  card: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6", gap: 12 },
  dateBox: { width: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6", borderRadius: 10, paddingVertical: 6 },
  dateText: { fontSize: 11, color: "#6b7280", fontWeight: "600", textTransform: "uppercase" },
  dateDay: { fontSize: 20, fontWeight: "700", color: "#111827" },
  info: { flex: 1 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: "600" },
  title: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  loc: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  price: { fontSize: 13, fontWeight: "600", color: "#22c55e" },
  free: { fontSize: 13, fontWeight: "600", color: "#16a34a" },
});
