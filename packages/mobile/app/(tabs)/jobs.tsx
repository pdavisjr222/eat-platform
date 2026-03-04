import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useJobs } from "../../src/lib/hooks";

const typeColor: Record<string, string> = {
  fullTime: "#16a34a",
  partTime: "#0891b2",
  contract: "#d97706",
  volunteer: "#7c3aed",
  internship: "#0f766e",
};

function formatSalary(min?: number, max?: number, currency?: string) {
  if (!min && !max) return null;
  const sym = currency ?? "USD";
  if (min && max) return `${sym} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  if (min) return `From ${sym} ${min.toLocaleString()}`;
  return `Up to ${sym} ${max!.toLocaleString()}`;
}

export default function JobsScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useJobs();
  const jobs = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.heroBar}>
        <Text style={styles.heroTitle}>💼 Job Board</Text>
        <Text style={styles.heroSub}>Find sustainable, meaningful work</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load jobs.</Text>
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
          {jobs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💼</Text>
              <Text style={styles.emptyTitle}>No jobs posted yet</Text>
              <Text style={styles.emptyText}>Sustainable job opportunities will appear here.</Text>
            </View>
          ) : (
            jobs.map((j) => {
              const color = typeColor[j.jobType] ?? "#6b7280";
              const salary = formatSalary(j.salaryMin, j.salaryMax, j.salaryCurrency);
              return (
                <TouchableOpacity key={j.id} style={styles.card} activeOpacity={0.8}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
                      <Text style={[styles.badgeText, { color }]}>
                        {j.jobType.replace(/([A-Z])/g, " $1").trim()}
                      </Text>
                    </View>
                    {j.isRemote && (
                      <View style={styles.remoteBadge}>
                        <Text style={styles.remoteBadgeText}>🌍 Remote</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.title}>{j.title}</Text>
                  {j.locationText && <Text style={styles.loc}>📍 {j.locationText}</Text>}
                  {salary && <Text style={styles.salary}>{salary}</Text>}
                  <Text style={styles.desc} numberOfLines={2}>{j.description}</Text>
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
  heroBar: { backgroundColor: "#0f766e", padding: 16 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  heroSub: { fontSize: 13, color: "#99f6e4", marginTop: 2 },
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
  cardHeader: { flexDirection: "row", gap: 6, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  remoteBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#eff6ff" },
  remoteBadgeText: { fontSize: 11, fontWeight: "600", color: "#3b82f6" },
  title: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  loc: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  salary: { fontSize: 13, fontWeight: "600", color: "#22c55e", marginBottom: 4 },
  desc: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
});
