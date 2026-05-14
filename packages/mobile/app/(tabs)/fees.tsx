import { useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const BASE = ((Constants.expoConfig?.extra?.apiUrl as string) ?? "").replace(/\/$/, "");

const STATUS_COLOR: Record<string, string> = {
  paid: "#4ADE80",
  pending: "#F87171",
  partial: "#FBBF24",
  waived: "#60A5FA",
};

const fmtKES = (n: number) => `KES ${(n || 0).toLocaleString("en-KE")}`;

export default function FeesScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["m-fees-list", search, statusFilter],
    queryFn: async () => {
      const q = new URLSearchParams({ limit: "50" });
      if (search) q.set("search", search);
      if (statusFilter) q.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/fees?${q}`);
      return r.json();
    },
  });

  const fees = data?.fees ?? [];
  const summary = data?.summary ?? { totalAmount: 0, totalPaid: 0, totalBalance: 0 };

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        {[
          { label: "Total Billed", value: fmtKES(summary.totalAmount), color: "#fff" },
          { label: "Collected", value: fmtKES(summary.totalPaid), color: "#4ADE80" },
          { label: "Outstanding", value: fmtKES(summary.totalBalance), color: "#F87171" },
        ].map((s) => (
          <View key={s.label} style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search student..."
          placeholderTextColor="#484f58"
        />
        <View style={styles.statusRow}>
          {["", "pending", "partial", "paid"].map((s) => (
            <TouchableOpacity
              key={s || "all"}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {s || "All"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#4ADE80" /></View>
      ) : fees.length === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>No fees found</Text></View>
      ) : (
        <FlatList
          data={fees}
          keyExtractor={(f: any) => f.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.studentName}>{item.studentName || "Student"}</Text>
                <View style={[styles.badge, { borderColor: STATUS_COLOR[item.status] || "#8b949e" }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] || "#8b949e" }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.term}>{item.feeTypeName} · {item.term} {item.academicYear}</Text>
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.amtLabel}>Billed</Text>
                  <Text style={styles.amt}>{fmtKES(item.amount)}</Text>
                </View>
                <View>
                  <Text style={styles.amtLabel}>Paid</Text>
                  <Text style={[styles.amt, { color: "#4ADE80" }]}>{fmtKES(item.paidAmount)}</Text>
                </View>
                <View>
                  <Text style={styles.amtLabel}>Balance</Text>
                  <Text style={[styles.amt, { color: item.balance > 0 ? "#F87171" : "#4ADE80" }]}>{fmtKES(item.balance)}</Text>
                </View>
              </View>
              {item.dueDate && (
                <Text style={styles.due}>Due: {new Date(item.dueDate).toLocaleDateString("en-KE")}</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  summary: {
    flexDirection: "row", gap: 8, padding: 16,
    borderBottomWidth: 1, borderBottomColor: "#30363D",
  },
  summaryCard: {
    flex: 1, backgroundColor: "#161B22", borderRadius: 10,
    borderWidth: 1, borderColor: "#30363D", padding: 12, alignItems: "center",
  },
  summaryValue: { fontSize: 14, fontWeight: "700" },
  summaryLabel: { fontSize: 11, color: "#8b949e", marginTop: 4 },
  filters: { padding: 16, paddingBottom: 8, gap: 10 },
  search: {
    backgroundColor: "#161B22", borderWidth: 1, borderColor: "#30363D",
    borderRadius: 8, padding: 10, color: "#fff", fontSize: 14,
  },
  statusRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: "#30363D",
    backgroundColor: "#161B22",
  },
  chipActive: { borderColor: "#4ADE80", backgroundColor: "#4ADE8015" },
  chipText: { color: "#8b949e", fontSize: 12 },
  chipTextActive: { color: "#4ADE80", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#8b949e", fontSize: 14 },
  card: {
    backgroundColor: "#161B22", borderRadius: 12,
    borderWidth: 1, borderColor: "#30363D", padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  studentName: { fontSize: 15, fontWeight: "600", color: "#fff" },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  term: { fontSize: 12, color: "#8b949e", marginBottom: 12 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  amtLabel: { fontSize: 11, color: "#8b949e", marginBottom: 4 },
  amt: { fontSize: 14, fontWeight: "600", color: "#fff" },
  due: { fontSize: 11, color: "#FBBF24", marginTop: 10 },
});
