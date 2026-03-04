import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { apiRequest } from "../../src/lib/api";
import { useAuthStore } from "../../src/lib/auth";

interface Message {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

function timeLabel(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["messages", userId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/messages/${userId}`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        recipientUserId: userId,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setText("");
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate(text.trim());
  };

  const currentUserId = (user as any)?.id;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#22c55e" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Say hello to {name}!</Text>
            </View>
          }
          renderItem={({ item: msg }) => {
            const isOwn = msg.senderUserId === currentUserId;
            return (
              <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
                <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
                    {msg.content}
                  </Text>
                </View>
                <Text style={styles.timestamp}>{timeLabel(msg.createdAt)}</Text>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={`Message ${name}...`}
          placeholderTextColor="#9ca3af"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  backBtn: { padding: 4, marginRight: 8 },
  backArrow: { fontSize: 32, color: "#22c55e", lineHeight: 36 },
  headerName: { fontSize: 17, fontWeight: "600", color: "#111827", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontSize: 14, color: "#9ca3af" },
  messageList: { padding: 12, paddingBottom: 8 },
  msgRow: { marginBottom: 6, maxWidth: "75%" },
  msgRowOwn: { alignSelf: "flex-end", alignItems: "flex-end" },
  msgRowOther: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleOwn: { backgroundColor: "#22c55e", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#f3f4f6", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: "#111827", lineHeight: 21 },
  bubbleTextOwn: { color: "#ffffff" },
  timestamp: { fontSize: 10, color: "#9ca3af", marginTop: 2, marginHorizontal: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: "#f9fafb",
    color: "#111827",
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#d1d5db" },
  sendIcon: { color: "#ffffff", fontSize: 16 },
});
