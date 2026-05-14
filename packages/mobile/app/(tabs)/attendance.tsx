import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";

const PINK = "#E91E8C";
const today = new Date().toISOString().split("T")[0];

type Status = "present" | "absent" | "late" | "excused";
const STATUS_COLORS: Record<Status, string> = {
  present: PINK,
  absent: "#F87171",
  late: "#FBBF24",
  excused: "#60A5FA",
};

export default function AttendanceScreen() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");

  const { data: classesData } = useQuery({
    queryKey: ["m-classes"],
    queryFn: async () => {
      const r = await apiFetch("/api/classes");
      if (!r.ok) return null;
      return r.json();
    },
  });
  const classes: any[] = classesData?.classes ?? [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["m-attendance", classId, today],
    queryFn: async () => {
      if (!classId) return null;
      const q = new URLSearchParams({ date: today, limit: "100" });
      q.set("classId", classId);
      const r = await apiFetch(`/api/attendance?${q}`);
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!classId,
  });

  const { data: studentsData } = useQuery({
    queryKey: ["m-students-class", classId],
    queryFn: async () => {
      if (!classId) return null;
      const r = await apiFetch(`/api/students?classId=${classId}&limit=100`);
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!classId,
  });

  const recordMut = useMutation({
    mutationFn: async (body: any) => {
      const r = await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["m-attendance", classId, today] });
    },
    onError: () => Alert.alert("Error", "Could not save attendance"),
  });

  const attendance: any[] = data?.attendance ?? [];
  const students: any[] = studentsData?.students ?? [];

  const getStatus = (studentId: string): Status | null => {
    const rec = attendance.find(
      (a) => a.studentId === studentId && a.date === today
    );
    return rec?.status ?? null;
  };

  const mark = (studentId: string, status: Status) => {
    recordMut.mutate({ studentId, classId, date: today, status });
  };

  const presentCount = students.filter(
    (s) => getStatus(s.id) === "present"
  ).length;

  return (
    <View style={styles.container}>
      {/* Class Selector */}
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>Select Class</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {classes.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.classChip,
                  classId === c.id && styles.classChipActive,
                ]}
                onPress={() => setClassId(c.id)}
              >
                <Text
                  style={[
                    styles.classChipText,
                    classId === c.id && styles.classChipTextActive,
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {classId && (
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {new Date(today).toDateString()}
          </Text>
          <Text style={[styles.statsText, { color: PINK, fontWeight: "600" }]}>
            {presentCount}/{students.length} present
          </Text>
        </View>
      )}

      {!classId ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Select a class to mark attendance</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PINK} />
        </View>
      ) : students.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No students in this class</Text>
        </View>
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
                  <Text style={styles.studentName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text style={styles.studentAdm}>{item.admissionNumber}</Text>
                </View>
                <View style={styles.btnRow}>
                  {(["present", "absent", "late"] as Status[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusBtn,
                        status === s && {
                          backgroundColor: STATUS_COLORS[s] + "30",
                          borderColor: STATUS_COLORS[s],
                        },
                      ]}
                      onPress={() => mark(item.id, s)}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          status === s && { color: STATUS_COLORS[s] },
                        ]}
                      >
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
  topBar: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#30363D",
  },
  topLabel: { fontSize: 12, color: "#8b949e", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", gap: 8 },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#30363D",
    backgroundColor: "#161B22",
  },
  classChipActive: { borderColor: PINK, backgroundColor: `${PINK}15` },
  classChipText: { color: "#8b949e", fontSize: 13 },
  classChipTextActive: { color: PINK, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#30363D",
  },
  statsText: { fontSize: 13, color: "#8b949e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#8b949e", fontSize: 14, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161B22",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363D",
    padding: 12,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  studentAdm: { fontSize: 12, color: "#8b949e", marginTop: 2 },
  btnRow: { flexDirection: "row", gap: 6 },
  statusBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363D",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBtnText: { color: "#8b949e", fontWeight: "700", fontSize: 13 },
});
