import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";

const PINK = "#E91E8C";
const TEAL = "#1B4D4D";

const fmtKES = (n: number) =>
  n >= 1_000_000
    ? `KES ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `KES ${(n / 1_000).toFixed(0)}K`
    : `KES ${n}`;

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, accent && { borderColor: PINK }]}>
      <Text style={[styles.statValue, accent && { color: PINK }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["m-dashboard-stats"],
    queryFn: async () => {
      const r = await apiFetch("/api/dashboard/stats");
      if (!r.ok) return null;
      return r.json();
    },
  });

  const stats = data?.stats ?? {};

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const attendanceRate =
    stats.totalStudents > 0
      ? Math.round((stats.presentToday / stats.totalStudents) * 100)
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} />
      }
    >
      {/* School Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerLogo}>
          <Text style={styles.bannerLogoText}>V</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Vineyard School</Text>
          <Text style={styles.bannerSub}>Management System</Text>
        </View>
      </View>

      {/* Date */}
      <Text style={styles.date}>{today}</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PINK} size="large" />
        </View>
      ) : (
        <>
          {/* Stats Grid */}
          <View style={styles.grid}>
            <StatCard
              label="Students"
              value={String(stats.totalStudents ?? 0)}
              sub={`${stats.defaulterCount ?? 0} defaulters`}
              accent
            />
            <StatCard label="Staff" value={String(stats.totalStaff ?? 0)} />
            <StatCard label="Classes" value={String(stats.totalClasses ?? 0)} />
            <StatCard
              label="Attendance"
              value={attendanceRate !== null ? `${attendanceRate}%` : "—"}
              sub={stats.attendanceMarked ? "marked today" : "not marked"}
            />
          </View>

          {/* Finance Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finance</Text>
            <View style={styles.financeRow}>
              <View style={[styles.financeCard, { borderColor: PINK }]}>
                <Text style={[styles.financeAmount, { color: PINK }]}>
                  {fmtKES(stats.totalRevenue ?? 0)}
                </Text>
                <Text style={styles.financeLabel}>Total Collected</Text>
              </View>
              <View style={[styles.financeCard, { borderColor: "#F87171" }]}>
                <Text style={[styles.financeAmount, { color: "#F87171" }]}>
                  {fmtKES(stats.totalOutstanding ?? 0)}
                </Text>
                <Text style={styles.financeLabel}>Outstanding</Text>
              </View>
            </View>
            {stats.totalIncome !== undefined && (
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>
                  {stats.currentTerm} · {stats.currentYear}
                </Text>
                <Text
                  style={[
                    styles.netValue,
                    { color: (stats.netBalance ?? 0) >= 0 ? PINK : "#F87171" },
                  ]}
                >
                  Net: {fmtKES(stats.netBalance ?? 0)}
                </Text>
              </View>
            )}
          </View>

          {/* Attendance Strip */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Attendance</Text>
            <View style={styles.attRow}>
              {[
                { label: "Present", val: stats.presentToday ?? 0, color: PINK },
                { label: "Absent", val: stats.absentToday ?? 0, color: "#F87171" },
                { label: "Late", val: stats.lateToday ?? 0, color: "#FBBF24" },
              ].map((a) => (
                <View key={a.label} style={styles.attCard}>
                  <Text style={[styles.attVal, { color: a.color }]}>{a.val}</Text>
                  <Text style={styles.attLabel}>{a.label}</Text>
                </View>
              ))}
            </View>
            {!stats.attendanceMarked && (
              <Text style={styles.attWarning}>Attendance not yet marked today</Text>
            )}
          </View>

          {/* Defaulters */}
          {(stats.defaulterCount ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Fee Defaulters ({stats.defaulterCount})
              </Text>
              <Text style={styles.defaulterHint}>
                Go to Fees tab to view details
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  content: { padding: 16, paddingBottom: 32 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: TEAL,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  bannerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PINK,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerLogoText: { color: "#fff", fontWeight: "900", fontSize: 22 },
  bannerTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },
  bannerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  date: { fontSize: 13, color: "#8b949e", marginBottom: 18 },
  center: { paddingVertical: 60, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#161B22",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363D",
    padding: 16,
    alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 12, color: "#8b949e", marginTop: 4 },
  statSub: { fontSize: 11, color: "#484f58", marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  financeRow: { flexDirection: "row", gap: 12 },
  financeCard: {
    flex: 1,
    backgroundColor: "#161B22",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  financeAmount: { fontSize: 20, fontWeight: "700" },
  financeLabel: { fontSize: 12, color: "#8b949e", marginTop: 4 },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 4,
  },
  netLabel: { fontSize: 12, color: "#8b949e" },
  netValue: { fontSize: 13, fontWeight: "700" },
  attRow: { flexDirection: "row", gap: 10 },
  attCard: {
    flex: 1,
    backgroundColor: "#161B22",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363D",
    padding: 14,
    alignItems: "center",
  },
  attVal: { fontSize: 24, fontWeight: "700" },
  attLabel: { fontSize: 12, color: "#8b949e", marginTop: 4 },
  attWarning: {
    fontSize: 12,
    color: "#FBBF24",
    textAlign: "center",
    marginTop: 10,
  },
  defaulterHint: { fontSize: 13, color: "#8b949e" },
});
