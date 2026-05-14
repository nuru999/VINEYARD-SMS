import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const BASE = ((Constants.expoConfig?.extra?.apiUrl as string) ?? "").replace(/\/$/, "");

async function apiFetch(path: string) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) return null;
  return r.json();
}

function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: students, refetch: refetchStudents } = useQuery({
    queryKey: ["m-students"],
    queryFn: () => apiFetch("/api/students?limit=1000"),
  });
  const { data: fees, refetch: refetchFees } = useQuery({
    queryKey: ["m-fees"],
    queryFn: () => apiFetch("/api/fees?limit=1000"),
  });
  const { data: staff, refetch: refetchStaff } = useQuery({
    queryKey: ["m-staff"],
    queryFn: () => apiFetch("/api/staff?limit=1000"),
  });
  const { data: classes, refetch: refetchClasses } = useQuery({
    queryKey: ["m-classes"],
    queryFn: () => apiFetch("/api/classes"),
  });

  const totalStudents = students?.students?.length ?? 0;
  const activeStudents = students?.students?.filter((s: any) => s.status === "active").length ?? 0;
  const totalStaff = staff?.staff?.length ?? 0;
  const totalClasses = classes?.classes?.length ?? 0;
  const feesList = fees?.fees ?? [];
  const paidFees = feesList.filter((f: any) => f.status === "paid");
  const pendingFees = feesList.filter((f: any) => f.status === "pending" || f.status === "partial");
  const totalCollected = paidFees.reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const totalPending = pendingFees.reduce((s: number, f: any) => s + (f.balance || f.amount || 0), 0);

  const fmtKES = (n: number) =>
    n >= 1_000_000
      ? `KES ${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
      ? `KES ${(n / 1000).toFixed(0)}K`
      : `KES ${n}`;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStudents(), refetchFees(), refetchStaff(), refetchClasses()]);
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ADE80" />}
    >
      {/* Greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.grid}>
        <StatCard label="Students" value={String(activeStudents)} sub={`${totalStudents} total`} accent />
        <StatCard label="Staff" value={String(totalStaff)} />
        <StatCard label="Classes" value={String(totalClasses)} />
        <StatCard label="Fee Rate" value={feesList.length ? `${Math.round((paidFees.length / feesList.length) * 100)}%` : "—"} sub="paid" />
      </View>

      {/* Finance Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Finance Summary</Text>
        <View style={styles.financeRow}>
          <View style={[styles.financeCard, { borderColor: "#4ADE80" }]}>
            <Text style={[styles.financeAmount, { color: "#4ADE80" }]}>{fmtKES(totalCollected)}</Text>
            <Text style={styles.financeLabel}>Collected</Text>
          </View>
          <View style={[styles.financeCard, { borderColor: "#F87171" }]}>
            <Text style={[styles.financeAmount, { color: "#F87171" }]}>{fmtKES(totalPending)}</Text>
            <Text style={styles.financeLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Recent Pending Fees */}
      {pendingFees.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Fees ({pendingFees.length})</Text>
          {pendingFees.slice(0, 5).map((f: any) => (
            <View key={f.id} style={styles.feeRow}>
              <View>
                <Text style={styles.feeName}>{f.studentName || "Student"}</Text>
                <Text style={styles.feeTerm}>{f.term} · {f.academicYear}</Text>
              </View>
              <Text style={styles.feeAmount}>KES {(f.balance || f.amount || 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: "700", color: "#fff" },
  date: { fontSize: 13, color: "#8b949e", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: "45%",
    backgroundColor: "#161B22", borderRadius: 12,
    borderWidth: 1, borderColor: "#30363D",
    padding: 16, alignItems: "center",
  },
  statCardAccent: { borderColor: "#4ADE80" },
  statValue: { fontSize: 28, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 12, color: "#8b949e", marginTop: 4 },
  statSub: { fontSize: 11, color: "#484f58", marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#fff", marginBottom: 12 },
  financeRow: { flexDirection: "row", gap: 12 },
  financeCard: {
    flex: 1, backgroundColor: "#161B22", borderRadius: 12,
    borderWidth: 1, padding: 16, alignItems: "center",
  },
  financeAmount: { fontSize: 20, fontWeight: "700" },
  financeLabel: { fontSize: 12, color: "#8b949e", marginTop: 4 },
  feeRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#161B22", borderRadius: 10, borderWidth: 1,
    borderColor: "#30363D", padding: 12, marginBottom: 8,
  },
  feeName: { fontSize: 14, color: "#fff", fontWeight: "500" },
  feeTerm: { fontSize: 12, color: "#8b949e", marginTop: 2 },
  feeAmount: { fontSize: 14, color: "#F87171", fontWeight: "600" },
});
