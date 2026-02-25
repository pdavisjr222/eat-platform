import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/lib/auth";
import { useUpcomingEvents, useUnreadNotificationCount } from "../../src/lib/hooks";

const QUICK_ACTIONS = [
  { label: "List Item", icon: "🛒", route: "/(tabs)/marketplace" },
  { label: "Log Spot", icon: "🗺️", route: "/(tabs)/map" },
  { label: "Message", icon: "💬", route: "/(tabs)/messages" },
  { label: "Profile", icon: "👤", route: "/(tabs)/profile" },
] as const;

const FEATURE_CARDS = [
  {
    icon: "🛒",
    title: "Marketplace",
    desc: "Buy, sell, trade & barter organic goods",
    color: "#f0fdf4",
    border: "#86efac",
  },
  {
    icon: "🍄",
    title: "Foraging Map",
    desc: "Discover & share wild food spots near you",
    color: "#fefce8",
    border: "#fde047",
  },
  {
    icon: "📅",
    title: "Events",
    desc: "Workshops, markets, and community meetups",
    color: "#eff6ff",
    border: "#93c5fd",
  },
  {
    icon: "📚",
    title: "Learning Hub",
    desc: "Courses on ecology, foraging & farming",
    color: "#fdf4ff",
    border: "#d8b4fe",
  },
];

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { data: notifData } = useUnreadNotificationCount();
  const { data: eventsData } = useUpcomingEvents();

  const unreadNotifCount = notifData?.count ?? 0;
  const upcomingEvents = (eventsData?.events ?? []).slice(0, 3);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>Hello, {firstName} 👋</Text>
          {unreadNotifCount > 0 && (
            <View style={styles.notifDot}>
              <Text style={styles.notifDotText}>
                {unreadNotifCount > 99 ? "99+" : String(unreadNotifCount)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.greetingSubtitle}>
          What are you exploring today?
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickAction}
              onPress={() => router.push(action.route as never)}
            >
              <Text style={styles.quickActionIcon}>{action.icon}</Text>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explore</Text>
        {FEATURE_CARDS.map((card) => (
          <View
            key={card.title}
            style={[
              styles.featureCard,
              { backgroundColor: card.color, borderColor: card.border },
            ]}
          >
            <Text style={styles.featureIcon}>{card.icon}</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{card.title}</Text>
              <Text style={styles.featureDesc}>{card.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {upcomingEvents.map((event) => (
            <TouchableOpacity key={event.id} style={styles.eventCard}>
              <View style={styles.eventIconWrap}>
                <Text style={styles.eventIcon}>📅</Text>
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={styles.eventDate}>
                  {formatEventDate(event.startDateTime)}
                </Text>
                {event.locationAddress ? (
                  <Text style={styles.eventLocation} numberOfLines={1}>
                    📍 {event.locationAddress}
                  </Text>
                ) : null}
              </View>
              {event.price != null && event.price > 0 ? (
                <Text style={styles.eventPrice}>
                  {event.currency ?? "USD"} {event.price}
                </Text>
              ) : (
                <Text style={styles.eventFree}>Free</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  greeting: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  greetingText: { fontSize: 26, fontWeight: "700", color: "#ffffff" },
  notifDot: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  notifDotText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  greetingSubtitle: { fontSize: 15, color: "#dcfce7", marginTop: 4 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  quickActions: { flexDirection: "row", gap: 12 },
  quickAction: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  quickActionIcon: { fontSize: 22, marginBottom: 4 },
  quickActionLabel: { fontSize: 12, fontWeight: "500", color: "#374151" },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  featureIcon: { fontSize: 28, marginRight: 14 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  featureDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  eventIconWrap: {
    width: 40,
    height: 40,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eventIcon: { fontSize: 20 },
  eventContent: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  eventDate: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  eventLocation: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  eventPrice: { fontSize: 13, fontWeight: "600", color: "#22c55e" },
  eventFree: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  spacer: { height: 24 },
});
