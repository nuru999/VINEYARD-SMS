import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getSession, signOut } from "../../lib/auth";

const PINK = "#E91E8C";
const TEAL = "#1B4D4D";

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["m-session"],
    queryFn: getSession,
  });

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          qc.clear();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PINK} size="large" />
      </View>
    );
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("") ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || "admin"}</Text>
        </View>
      </View>

      {/* School Info */}
      <View style={styles.schoolCard}>
        <View style={styles.schoolLogo}>
          <Text style={styles.schoolLogoText}>V</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.schoolName}>Vineyard School</Text>
          <Text style={styles.schoolSub}>Nairobi, Kenya</Text>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        {[
          { label: "Version", value: "1.0.0" },
          { label: "Platform", value: "Mobile (Expo)" },
          { label: "Academic Year", value: "2026" },
        ].map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#F87171" size="small" />
        ) : (
          <Text style={styles.signOutText}>Sign Out</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>
        Vineyard School Management System © {new Date().getFullYear()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D1117",
  },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${PINK}20`,
    borderWidth: 2,
    borderColor: PINK,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: "700", color: PINK },
  name: { fontSize: 20, fontWeight: "700", color: "#fff" },
  email: { fontSize: 14, color: "#8b949e", marginTop: 4 },
  roleBadge: {
    marginTop: 10,
    backgroundColor: `${PINK}20`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: PINK,
  },
  roleText: {
    color: PINK,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  schoolCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  schoolLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PINK,
    justifyContent: "center",
    alignItems: "center",
  },
  schoolLogoText: { color: "#fff", fontWeight: "900", fontSize: 20 },
  schoolName: { color: "#fff", fontWeight: "700", fontSize: 16 },
  schoolSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    color: "#8b949e",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#161B22",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363D",
    padding: 14,
    marginBottom: 6,
  },
  rowLabel: { fontSize: 14, color: "#8b949e" },
  rowValue: { fontSize: 14, color: "#fff", fontWeight: "500" },
  signOutBtn: {
    backgroundColor: "#F8717120",
    borderWidth: 1,
    borderColor: "#F87171",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  signOutText: { color: "#F87171", fontWeight: "700", fontSize: 15 },
  footer: {
    textAlign: "center",
    color: "#484f58",
    fontSize: 11,
  },
});
