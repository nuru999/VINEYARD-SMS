import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";

const PINK = "#E91E8C";

const fmtKES = (n: number) => `KES ${(n || 0).toLocaleString("en-KE")}`;
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

const METHOD_COLOR: Record<string, string> = {
  cash: "#60A5FA",
  mpesa: PINK,
  bank: "#FBBF24",
};

type Tab = "payments" | "defaulters";

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

function initials(name: string | undefined) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

export default function FeesScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("defaulters");

  const { data: defData, isLoading: defLoading, isError: defError } = useQuery({
    queryKey: ["m-defaulters"],
    queryFn: async () => parseResponse(await apiFetch("/api/fee-payments/defaulters")),
    enabled: activeTab === "defaulters",
  });

  const { data: payData, isLoading: payLoading, isError: payError } = useQuery({
    queryKey: ["m-fee-payments"],
    queryFn: async () => parseResponse(await apiFetch("/api/fee-payments")),
    enabled: activeTab === "payments",
  });

  const defaulters: any[] = (defData as any)?.defaulters ?? [];
  const payments: any[] = (payData as any)?.payments ?? [];

  const totalOwed = Number(
    (defData as any)?.totalOutstanding ??
    defaulters.reduce((sum, item) => sum + Number(item.totalOwed || 0), 0)
  );
  const totalPayments = Number(
    (payData as any)?.summary?.totalCollected ??
    payments.reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0)
  );

  const isLoading = activeTab === "defaulters" ? defLoading : payLoading;
  const isError = activeTab === "defaulters" ? defError : payError;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(["defaulters", "payments"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "defaulters" ? "Defaulters" : "Payments"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summaryStrip}>
        {activeTab === "defaulters" ? (
          <>
            <View style={styles.stripItem}>
              <Text style={[styles.stripValue, { color: "#F87171" }]}>
                {(defData as any)?.count ?? 0}
              </Text>
              <Text style={styles.stripLabel}>Defaulters</Text>
            </View>
            <View style={styles.stripItem}>
              <Text style={[styles.stripValue, { color: "#F87171" }]}>
                {fmtKES(totalOwed)}
              </Text>
              <Text style={styles.stripLabel}>Total Owed</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.stripItem}>
              <Text style={[styles.stripValue, { color: PINK }]}>
                {payments.length}
              </Text>
              <Text style={styles.stripLabel}>Transactions</Text>
            </View>
            <View style={styles.stripItem}>
              <Text style={[styles.stripValue, { color: PINK }]}>
                {fmtKES(totalPayments)}
              </Text>
              <Text style={styles.stripLabel}>Total Collected</Text>
            </View>
          </>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PINK} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load fee data.</Text>
          <Text style={styles.empty}>Check your connection and try again.</Text>
        </View>
      ) : activeTab === "defaulters" ? (
        defaulters.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.empty}>No defaulters — all recorded fee obligations are cleared.</Text>
          </View>
        ) : (
          <FlatList
            data={defaulters}
            keyExtractor={(item: any, index) => String(item.student?.id ?? index)}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            renderItem={({ item }) => {
              const student = item.student;
              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(student?.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{student?.name || "Unknown student"}</Text>
                      <Text style={styles.classMeta}>
                        {item.class?.name || "No class"} · ADM: {student?.admissionNo || "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.amtRow}>
                    <View>
                      <Text style={styles.amtLabel}>Paid</Text>
                      <Text style={[styles.amt, { color: PINK }]}>
                        {fmtKES(Number(item.totalPaid || 0))}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.amtLabel}>Outstanding</Text>
                      <Text style={[styles.amt, { color: "#F87171" }]}>
                        {fmtKES(Number(item.totalOwed || 0))}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : payments.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No payment records</Text>
        </View>
      ) : (
        <FlatList
          data={[...payments].reverse()}
          keyExtractor={(payment: any) => String(payment.id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptNo}>
                    {item.receiptNo || `#${item.id}`}
                  </Text>
                  <Text style={styles.classMeta}>
                    {fmtDate(item.paymentDate)}
                  </Text>
                </View>
                <Text style={[styles.payAmt, { color: PINK }]}>
                  {fmtKES(Number(item.paidAmount || 0))}
                </Text>
              </View>
              <View style={styles.payMeta}>
                <View
                  style={[
                    styles.methodBadge,
                    { borderColor: METHOD_COLOR[item.paymentMethod] || "#8b949e" },
                  ]}
                >
                  <Text
                    style={[
                      styles.methodText,
                      { color: METHOD_COLOR[item.paymentMethod] || "#8b949e" },
                    ]}
                  >
                    {item.paymentMethod?.toUpperCase() || "CASH"}
                  </Text>
                </View>
                {Number(item.balance || 0) > 0 && (
                  <Text style={styles.balText}>
                    Balance after receipt: {fmtKES(Number(item.balance || 0))}
                  </Text>
                )}
              </View>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#161B22",
    borderBottomWidth: 1,
    borderBottomColor: "#30363D",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PINK },
  tabText: { color: "#8b949e", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: PINK },
  summaryStrip: {
    flexDirection: "row",
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#30363D",
  },
  stripItem: { flex: 1 },
  stripValue: { fontSize: 20, fontWeight: "700" },
  stripLabel: { fontSize: 12, color: "#8b949e", marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, padding: 24 },
  emptyIcon: { fontSize: 36, color: PINK },
  empty: { color: "#8b949e", fontSize: 14, textAlign: "center" },
  errorText: { color: "#F87171", fontSize: 15, fontWeight: "600", textAlign: "center" },
  card: {
    backgroundColor: "#161B22",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363D",
    padding: 14,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${PINK}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: PINK, fontWeight: "700", fontSize: 14 },
  studentName: { fontSize: 15, fontWeight: "600", color: "#fff" },
  classMeta: { fontSize: 12, color: "#8b949e", marginTop: 2 },
  amtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#30363D",
    paddingTop: 10,
  },
  amtLabel: { fontSize: 11, color: "#8b949e", marginBottom: 4 },
  amt: { fontSize: 16, fontWeight: "700" },
  receiptNo: { fontSize: 14, fontWeight: "600", color: "#fff" },
  payAmt: { fontSize: 18, fontWeight: "700" },
  payMeta: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  methodBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  methodText: { fontSize: 11, fontWeight: "700" },
  balText: { fontSize: 12, color: "#F87171" },
  notes: { fontSize: 12, color: "#8b949e", marginTop: 8 },
});
