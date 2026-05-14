import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getSession, signOut } from "../../lib/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["m-session"],
    queryFn: getSession,
  });

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#4ADE80" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0] || user?.email?.[0] || "U"}</Text>
        </View>
        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || "admin"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        {[
          { label: "App Name", value: "Vineyard School" },
          { label: "Version", value: "1.0.0" },
          { label: "Platform", value: "Mobile" },
        ].map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
          {signingOut ? (
            <ActivityIndicator color="#F87171" size="small" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Vineyard School Management System © {new Date().getFullYear()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  avatarSection: { alignItems: "center", paddingVertical: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#4ADE8020", borderWidth: 2, borderColor: "#4ADE80",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#4ADE80" },
  name: { fontSize: 20, fontWeight: "700", color: "#fff" },
  email: { fontSize: 14, color: "#8b949e", marginTop: 4 },
  roleBadge: {
    marginTop: 10, backgroundColor: "#4ADE8020", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: "#4ADE80",
  },
  roleText: { color: "#4ADE80", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, color: "#8b949e", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#161B22", borderRadius: 10, borderWidth: 1,
    borderColor: "#30363D", padding: 14, marginBottom: 6,
  },
  rowLabel: { fontSize: 14, color: "#8b949e" },
  rowValue: { fontSize: 14, color: "#fff", fontWeight: "500" },
  signOutBtn: {
    backgroundColor: "#F8717120", borderWidth: 1, borderColor: "#F87171",
    borderRadius: 10, padding: 14, alignItems: "center",
  },
  signOutText: { color: "#F87171", fontWeight: "700", fontSize: 15 },
  footer: { textAlign: "center", color: "#484f58", fontSize: 11, marginTop: "auto", paddingTop: 24 },
});
