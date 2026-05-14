import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator } from "react-native";
import { getSession } from "../lib/auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    getSession()
      .then((user) => setAuthed(!!user))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    const inTabsGroup = segments[0] === "(tabs)";
    const inSignIn = segments[0] === "sign-in";
    if (!authed && !inSignIn) {
      router.replace("/sign-in");
    } else if (authed && inSignIn) {
      router.replace("/(tabs)");
    }
  }, [authed, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" }}>
        <ActivityIndicator size="large" color="#E91E8C" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <Slot />
        </AuthGuard>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
