import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useConversations } from "../../src/lib/hooks";

// Avatar color palette — assigned by index mod length
const AVATAR_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#a855f7",
  "#ef4444", "#06b6d4", "#f97316", "#14b8a6",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useConversations();

  const conversations = Array.isArray(data) ? data : [];

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.search}
          placeholder="Search conversations..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load conversations.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {filtered.length === 0 && search.trim() !== "" ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>No conversations match your search.</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>No conversations yet. Start messaging someone!</Text>
            </View>
          ) : (
            filtered.map((conv, idx) => {
              const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <TouchableOpacity key={conv.userId} style={styles.row}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: avatarColor + "20" }]}>
                    <Text style={[styles.avatarText, { color: avatarColor }]}>
                      {getInitials(conv.name)}
                    </Text>
                  </View>

                  {/* Content */}
                  <View style={styles.rowContent}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.name}>{conv.name}</Text>
                      <Text style={styles.time}>
                        {formatRelativeTime(conv.lastMessageAt)}
                      </Text>
                    </View>
                    <View style={styles.rowFooter}>
                      <Text
                        style={[
                          styles.lastMsg,
                          conv.unreadCount > 0 && styles.lastMsgBold,
                        ]}
                        numberOfLines={1}
                      >
                        {conv.lastMessage}
                      </Text>
                      {conv.unreadCount > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{conv.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* New message CTA */}
          <View style={styles.newMessageSection}>
            <TouchableOpacity style={styles.newMessageBtn}>
              <Text style={styles.newMessageBtnText}>✉️ New Message</Text>
            </TouchableOpacity>
            <Text style={styles.newMessageNote}>
              Real-time messaging via Socket.IO — coming in full build
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Compose FAB */}
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  searchBar: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  search: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, marginTop: 60 },
  errorText: { fontSize: 15, color: "#dc2626", marginBottom: 12 },
  retryBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: { color: "#ffffff", fontWeight: "600" },
  emptySearch: { padding: 24, alignItems: "center" },
  emptySearchText: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: "700" },
  rowContent: { flex: 1 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  name: { fontSize: 15, fontWeight: "600", color: "#111827" },
  time: { fontSize: 12, color: "#9ca3af" },
  rowFooter: { flexDirection: "row", alignItems: "center" },
  lastMsg: { flex: 1, fontSize: 13, color: "#6b7280" },
  lastMsgBold: { color: "#111827", fontWeight: "500" },
  badge: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  badgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  newMessageSection: {
    alignItems: "center",
    padding: 24,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  newMessageBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  newMessageBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  newMessageNote: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 52,
    height: 52,
    backgroundColor: "#22c55e",
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabIcon: { fontSize: 20 },
});
