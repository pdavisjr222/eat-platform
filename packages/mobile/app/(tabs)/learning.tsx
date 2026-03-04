import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useTrainingModules } from "../../src/lib/hooks";

const diffColor: Record<string, string> = {
  beginner: "#16a34a",
  intermediate: "#d97706",
  advanced: "#dc2626",
};

export default function LearningScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useTrainingModules();
  const modules = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.heroBar}>
        <Text style={styles.heroTitle}>📚 Learning Hub</Text>
        <Text style={styles.heroSub}>Grow your sustainable knowledge</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load courses.</Text>
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
          {modules.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>No courses yet</Text>
              <Text style={styles.emptyText}>Courses and workshops are coming soon.</Text>
            </View>
          ) : (
            modules.map((m) => {
              const dc = diffColor[m.difficultyLevel] ?? "#6b7280";
              return (
                <TouchableOpacity key={m.id} style={styles.card} activeOpacity={0.8}>
                  <View style={styles.thumbnail}>
                    <Text style={styles.thumbnailEmoji}>📖</Text>
                  </View>
                  <View style={styles.info}>
                    <View style={styles.badges}>
                      <View style={[styles.badge, { backgroundColor: `${dc}20` }]}>
                        <Text style={[styles.badgeText, { color: dc }]}>
                          {m.difficultyLevel.charAt(0).toUpperCase() + m.difficultyLevel.slice(1)}
                        </Text>
                      </View>
                      {m.isPremium && (
                        <View style={styles.premiumBadge}>
                          <Text style={styles.premiumText}>⭐ Premium</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.title}>{m.title}</Text>
                    <Text style={styles.category}>{m.category}</Text>
                    {m.estimatedDuration ? (
                      <Text style={styles.duration}>⏱ {m.estimatedDuration} min</Text>
                    ) : null}
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
  heroBar: { backgroundColor: "#b45309", padding: 16 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  heroSub: { fontSize: 13, color: "#fde68a", marginTop: 2 },
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
  thumbnail: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  thumbnailEmoji: { fontSize: 28 },
  info: { flex: 1 },
  badges: { flexDirection: "row", gap: 6, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  premiumBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#fefce8" },
  premiumText: { fontSize: 11, fontWeight: "600", color: "#ca8a04" },
  title: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 2 },
  category: { fontSize: 12, color: "#9ca3af", marginBottom: 2, textTransform: "capitalize" },
  duration: { fontSize: 12, color: "#6b7280" },
});
