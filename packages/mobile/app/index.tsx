import { Redirect } from "expo-router";

// Root redirects to tabs; auth guard in _layout.tsx handles unauthenticated users
export default function RootIndex() {
  return <Redirect href="/(tabs)" />;
}
