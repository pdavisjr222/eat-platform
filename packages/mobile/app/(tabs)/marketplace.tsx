import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState } from "react";
import { useListings } from "../../src/lib/hooks";

const CATEGORIES = [
  "All", "Produce", "Seeds", "Plants", "Tools", "Services", "Trade", "Barter",
];

const LISTING_TYPES = [
  { label: "Sell", color: "#22c55e", bg: "#f0fdf4" },
  { label: "Buy", color: "#3b82f6", bg: "#eff6ff" },
  { label: "Trade", color: "#f59e0b", bg: "#fefce8" },
  { label: "Barter", color: "#a855f7", bg: "#fdf4ff" },
];

const typeColor: Record<string, string> = {
  sell: "#22c55e",
  buy: "#3b82f6",
  trade: "#f59e0b",
  barter: "#a855f7",
};

function formatPrice(price?: number, currency?: string): string {
  if (price == null) return "—";
  const symbol = currency ?? "USD";
  return `${symbol} ${price.toFixed(2)}`;
}

export default function MarketplaceScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const { data, isLoading, isError, refetch, isFetching } = useListings();

  const listings = data?.data ?? [];

  const filtered = listings.filter((item) => {
    const matchSearch =
      search.trim() === "" ||
      item.title.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      activeCategory === "All" ||
      item.category.toLowerCase() === activeCategory.toLowerCase();
    return matchSearch && matchCategory;
  });

  const color = (type: string) => typeColor[type.toLowerCase()] ?? "#6b7280";

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search listings..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ List</Text>
        </TouchableOpacity>
      </View>

      {/* Type pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typePills}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {LISTING_TYPES.map((t) => (
          <View key={t.label} style={[styles.typePill, { backgroundColor: t.bg }]}>
            <Text style={[styles.typePillText, { color: t.color }]}>{t.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              activeCategory === cat && styles.categoryChipActive,
            ]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Listings */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load listings.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listings}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              tintColor="#22c55e"
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search or category filter.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: `${color(item.type)}20` },
                    ]}
                  >
                    <Text
                      style={[styles.typeBadgeText, { color: color(item.type) }]}
                    >
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.categoryTag}>{item.category}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.price}>
                    {formatPrice(item.price, item.currency)}
                  </Text>
                  {item.location ? (
                    <Text style={styles.location}>📍 {item.location}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonIcon}>🔨</Text>
            <Text style={styles.comingSoonTitle}>Full Marketplace Coming Soon</Text>
            <Text style={styles.comingSoonText}>
              Live listings, image uploads, filters, and real-time updates.
            </Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
  addBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  typePills: { maxHeight: 44, backgroundColor: "#ffffff" },
  categoryBar: { maxHeight: 44, paddingVertical: 6 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  categoryChipActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  categoryChipText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  categoryChipTextActive: { color: "#ffffff" },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typePillText: { fontSize: 13, fontWeight: "600" },
  listings: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 12, fontWeight: "600" },
  categoryTag: { fontSize: 12, color: "#9ca3af" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  price: { fontSize: 14, fontWeight: "600", color: "#22c55e" },
  location: { fontSize: 13, color: "#6b7280" },
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
    marginBottom: 10,
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 4 },
  emptyText: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  comingSoon: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderStyle: "dashed",
    marginTop: 8,
  },
  comingSoonIcon: { fontSize: 32, marginBottom: 8 },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  comingSoonText: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
});
