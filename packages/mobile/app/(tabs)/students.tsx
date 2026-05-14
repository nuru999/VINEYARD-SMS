import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";

const PINK = "#E91E8C";

const statusColor = (s: string) =>
  s === "active" ? PINK : s === "inactive" ? "#F87171" : "#FBBF24";

export default function StudentsScreen() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["m-students-list", search],
    queryFn: async () => {
      const q = search
        ? `?search=${encodeURIComponent(search)}&limit=50`
        : "?limit=50";
      const r = await apiFetch(`/api/students${q}`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  const students: any[] = data?.students ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or admission no..."
          placeholderTextColor="#484f58"
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PINK} />
        </View>
      ) : students.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No students found</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.firstName?.[0]}
                  {item.lastName?.[0]}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.meta}>
                  ADM: {item.admissionNumber} · {item.className || "No class"}
                </Text>
                <Text style={styles.meta}>
                  {item.gender} ·{" "}
                  {item.dateOfBirth
                    ? new Date(item.dateOfBirth).getFullYear()
                    : "—"}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { borderColor: statusColor(item.status) },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: statusColor(item.status) },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  searchRow: { padding: 16, paddingBottom: 8 },
  search: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#30363D",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 14,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#8b949e", fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161B22",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363D",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${PINK}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: PINK, fontWeight: "700", fontSize: 15 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: "#fff" },
  meta: { fontSize: 12, color: "#8b949e", marginTop: 2 },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
