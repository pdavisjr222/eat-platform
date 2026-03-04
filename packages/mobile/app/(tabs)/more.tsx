import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface NavItem {
  icon: IoniconName;
  label: string;
  description: string;
  route: string;
  color: string;
  bg: string;
}

const navItems: NavItem[] = [
  {
    icon: "leaf",
    label: "Foraging Map",
    description: "Find wild food near you",
    route: "/(tabs)/map",
    color: "#16a34a",
    bg: "#dcfce7",
  },
  {
    icon: "storefront",
    label: "Vendors",
    description: "Browse eco-friendly vendors",
    route: "/(tabs)/vendors",
    color: "#0891b2",
    bg: "#cffafe",
  },
  {
    icon: "people",
    label: "Members",
    description: "Connect with the community",
    route: "/(tabs)/members",
    color: "#7c3aed",
    bg: "#ede9fe",
  },
  {
    icon: "calendar",
    label: "Events",
    description: "Workshops, markets & meetups",
    route: "/(tabs)/events",
    color: "#dc2626",
    bg: "#fee2e2",
  },
  {
    icon: "book",
    label: "Learning Hub",
    description: "Grow your knowledge",
    route: "/(tabs)/learning",
    color: "#d97706",
    bg: "#fef3c7",
  },
  {
    icon: "briefcase",
    label: "Job Board",
    description: "Find sustainable work",
    route: "/(tabs)/jobs",
    color: "#0f766e",
    bg: "#ccfbf1",
  },
  {
    icon: "flower",
    label: "Garden Club",
    description: "Neighbors growing & sharing",
    route: "/(tabs)/garden-clubs",
    color: "#15803d",
    bg: "#bbf7d0",
  },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>All E.A.T. features</Text>
      </View>

      <View style={styles.grid}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={26} color={item.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  headerSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  grid: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 2 },
  cardDesc: { fontSize: 13, color: "#6b7280" },
});
