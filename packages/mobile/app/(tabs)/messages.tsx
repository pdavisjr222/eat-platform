import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConversations } from "../../src/lib/hooks";
import { useSocket } from "../../src/lib/useSocket";
import { apiRequest } from "../../src/lib/api";
import { useAuthStore } from "../../src/lib/auth";

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
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data, isLoading, isError, refetch } = useConversations();
  const { socket, connected } = useSocket();

  const { data: membersData } = useQuery<{ data: any[] }>({
    queryKey: ["members-picker"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/members");
      return res.json();
    },
    enabled: memberPickerOpen,
  });

  const members = (membersData?.data ?? []).filter(
    (m: any) => m.id !== (user as any)?.id &&
      m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // When a new message arrives via Socket.IO, invalidate the conversations
  // query so the list refreshes immediately without manual polling.
  useEffect(() => {
    if (!socket) return;

    function onNewMessage() {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    }

    socket.on("message:new", onNewMessage);
    socket.on("message:sent", onNewMessage); // sender confirmation

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:sent", onNewMessage);
    };
  }, [socket, queryClient]);

  const conversations = Array.isArray(data) ? data : [];

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header with live indicator */}
      <View style={styles.headerBar}>
        <View style={styles.liveIndicator}>
          <View style={[styles.liveDot, connected ? styles.liveDotOn : styles.liveDotOff]} />
          <Text style={styles.liveText}>{connected ? "Live" : "Connecting…"}</Text>
        </View>
      </View>

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
              <Text style={styles.emptySearchText}>
                No conversations yet. Start messaging someone!
              </Text>
            </View>
          ) : (
            filtered.map((conv, idx) => {
              const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <TouchableOpacity
                  key={conv.userId}
                  style={styles.row}
                  onPress={() => router.push({ pathname: "/chat/[userId]", params: { userId: conv.userId, name: conv.name } } as never)}
                >
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

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Compose FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setMemberPickerOpen(true)}>
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>

      {/* Member picker modal */}
      <Modal visible={memberPickerOpen} animationType="slide" onRequestClose={() => setMemberPickerOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Message</Text>
            <TouchableOpacity onPress={() => { setMemberPickerOpen(false); setMemberSearch(""); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <TextInput
              style={styles.search}
              placeholder="Search members..."
              placeholderTextColor="#9ca3af"
              value={memberSearch}
              onChangeText={setMemberSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={members}
            keyExtractor={(m: any) => m.id}
            renderItem={({ item: m }: { item: any }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  setMemberPickerOpen(false);
                  setMemberSearch("");
                  router.push({ pathname: "/chat/[userId]", params: { userId: m.id, name: m.name } } as never);
                }}
              >
                <View style={[styles.avatar, { backgroundColor: "#22c55e20" }]}>
                  <Text style={[styles.avatarText, { color: "#22c55e" }]}>
                    {m.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.name}>{m.name}</Text>
                  {(m.city || m.country) && (
                    <Text style={styles.lastMsg}>{[m.city, m.country].filter(Boolean).join(", ")}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>
                  {memberSearch ? "No members found" : "Loading members..."}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },

  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveDotOn: { backgroundColor: "#22c55e" },
  liveDotOff: { backgroundColor: "#d1d5db" },
  liveText: { fontSize: 12, color: "#6b7280" },

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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 60,
  },
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
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
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
  modalContainer: { flex: 1, backgroundColor: "#ffffff" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalClose: { fontSize: 20, color: "#6b7280", padding: 4 },
  modalSearch: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
});
