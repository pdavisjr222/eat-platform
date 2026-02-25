import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../src/lib/auth";
import { SQLiteStorage } from "../src/lib/storage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

export const storage = new SQLiteStorage();

function RootNavigator() {
  const { isAuthenticated, isLoading, loadStoredToken } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Check for persisted token once on mount
  useEffect(() => {
    loadStoredToken();
  }, []);

  // Redirect based on auth state — only after loading is done
  useEffect(() => {
    if (isLoading) return;

    const inTabs = (segments[0] as string) === "(tabs)";
    const inAuth = segments[0] === "(auth)";

    if (isAuthenticated && (inAuth || segments[0] === undefined)) {
      router.replace("/(tabs)" as never);
    } else if (!isAuthenticated && inTabs) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    storage
      .init()
      .then(() => setStorageReady(true))
      .catch((err) => {
        console.error("Storage init failed:", err);
        setStorageReady(true);
      });
  }, []);

  if (!storageReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#22c55e",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 48 }}>🌱</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}
