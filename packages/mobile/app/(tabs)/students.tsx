import { useMemo, useState } from "react";
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

const statusColor = (status: string) => {
  const normalized = String(status || "active").toLowerCase();
  return normalized === "active" ? PINK : normalized === "inactive" ? "#F87171" : "#FBBF24";
};

function initials(name: string | undefined) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

function displayGender(value: unknown) {
  const gender = String(value || "").trim().toLowerCase();
  return gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : "—";
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function StudentsScreen() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["m-students-list"],
    queryFn: async () => parseResponse(await apiFetch("/api/students")),
  });

  const students: any[] = Array.isArray((data as any)?.students) ? (data as any).students : [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      String(student.name || "").toLowerCase().includes(query) ||
      String(student.admissionNo || "").toLowerCase().includes(query) ||
      String(student.className || "").toLowerCase().includes(query) ||
      String(student.parentName || "").toLowerCase().includes(query)
    );
  }, [students, search]);

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
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load students.</Text>
          <Text style={styles.empty}>Check your connection and try again.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{search ? "No students match your search" : "No students found"}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(item.name)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name || "Unnamed student"}</Text>
                <Text style={styles.meta}>
                  ADM: {item.admissionNo || "—"} · {item.className || "No class"}
                </Text>
                <Text style={styles.meta}>
                  {displayGender(item.gender)} · {item.dob ? new Date(item.dob).getFullYear() : "—"}
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
                  {String(item.status || "active").toLowerCase()}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 6, padding: 20 },
  empty: { color: "#8b949e", fontSize: 14, textAlign: "center" },
  errorText: { color: "#F87171", fontSize: 15, fontWeight: "600", textAlign: "center" },
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
