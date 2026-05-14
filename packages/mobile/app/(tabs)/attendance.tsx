import { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";

const BASE = ((Constants.expoConfig?.extra?.apiUrl as string) ?? "").replace(/\/$/, "");
const today = new Date().toISOString().split("T")[0];

type Status = "present" | "absent" | "late" | "excused";
const STATUS_COLORS: Record<Status, string> = {
  present: "#4ADE80",
  absent: "#F87171",
  late: "#FBBF24",
  excused: "#60A5FA",
};

export default function AttendanceScreen() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [date] = useState(today);

  const { data: classesData } = useQuery({
    queryKey: ["m-classes"],
    queryFn: async () => { const r = await fetch(`${BASE}/api/classes`); return r.json(); },
  });
  const classes = classesData?.classes ?? [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["m-attendance", classId, date],
    queryFn: async () => {
      const q = new URLSearchParams({ date, limit: "100" });
      if (classId) q.set("classId", classId);
      const r = await fetch(`${BASE}/api/attendance?${q}`);
      return r.json();
    },
    enabled: !!classId,
  });

  const { data: studentsData } = useQuery({
    queryKey: ["m-students-class", classId],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/students?classId=${classId}&limit=100`);
      return r.json();
    },
    enabled: !!classId,
  });

  const recordMut = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch(`${BASE}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => refetch(),
    onError: () => Alert.alert("Error", "Could not save attendance"),
  });

  const attendance: any[] = data?.attendance ?? [];
  const students: any[] = studentsData?.students ?? [];

  const getStatus = (studentId: string): Status | null => {
    const rec = attendance.find((a) => a.studentId === studentId && a.date === date);
    return rec?.status ?? null;
  };

  const mark = (studentId: string, status: Status) => {
    recordMut.mutate({ studentId, classId, date, status });
  };

  const presentCount = students.filter((s) => getStatus(s.id) === "present").length;
  const markedCount = students.filter((s) => getStatus(s.id) !== null).length;

  return (
    <View style={styles.container}>
      {/* Class Selector */}
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>Select Class</Text>
        <FlatList
          horizontal
          data={classes}
          keyExtractor={(c: any) => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.classChip, classId === item.id && styles.classChipActive]}
              onPress={() => setClassId(item.id)}
            >
              <Text style={[styles.classChipText, classId === item.id && styles.classChipTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {classId && (
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>Today: {new Date(date).toDateString()}</Text>
          <Text style={styles.statsText}>{presentCount}/{students.length} present</Text>
        </View>
      )}

      {!classId ? (
        <View style={styles.center}><Text style={styles.empty}>Select a class to mark attendance</Text></View>
      ) : isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#4ADE80" /></View>
      ) : students.length === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>No students in this class</Text></View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s: any) => s.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const status = getStatus(item.id);
            return (
              <View style={styles.card}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
                  <Text style={styles.studentAdm}>{item.admissionNumber}</Text>
                </View>
                <View style={styles.btnRow}>
                  {(["present", "absent", "late"] as Status[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusBtn, status === s && { backgroundColor: STATUS_COLORS[s] + "30", borderColor: STATUS_COLORS[s] }]}
                      onPress={() => mark(item.id, s)}
                    >
                      <Text style={[styles.statusBtnText, status === s && { color: STATUS_COLORS[s] }]}>
                        {s === "present" ? "P" : s === "absent" ? "A" : "L"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  topBar: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#30363D" },
  topLabel: { fontSize: 13, color: "#8b949e", marginBottom: 10 },
  classChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: "#30363D",
    backgroundColor: "#161B22",
  },
  classChipActive: { borderColor: "#4ADE80", backgroundColor: "#4ADE8015" },
  classChipText: { color: "#8b949e", fontSize: 13 },
  classChipTextActive: { color: "#4ADE80", fontWeight: "600" },
  statsRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#30363D",
  },
  statsText: { fontSize: 13, color: "#8b949e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#8b949e", fontSize: 14, textAlign: "center" },
  card: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#161B22", borderRadius: 10, borderWidth: 1,
    borderColor: "#30363D", padding: 12,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  studentAdm: { fontSize: 12, color: "#8b949e", marginTop: 2 },
  btnRow: { flexDirection: "row", gap: 6 },
  statusBtn: {
    width: 34, height: 34, borderRadius: 8,
    borderWidth: 1, borderColor: "#30363D",
    justifyContent: "center", alignItems: "center",
  },
  statusBtnText: { color: "#8b949e", fontWeight: "700", fontSize: 13 },
});
