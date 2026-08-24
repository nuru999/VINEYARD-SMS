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

type Status = "present" | "absent" | "late";
const STATUS_COLORS: Record<Status, string> = {
  present: PINK,
  absent: "#F87171",
  late: "#FBBF24",
};

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function AttendanceScreen() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");

  const { data: classesData, isError: classesError } = useQuery({
    queryKey: ["m-classes"],
    queryFn: async () => parseResponse(await apiFetch("/api/classes")),
  });
  const classes: any[] = Array.isArray((classesData as any)?.classes) ? (classesData as any).classes : [];

  const { data, isLoading, isError: attendanceError } = useQuery({
    queryKey: ["m-attendance", classId, today],
    queryFn: async () => {
      if (!classId) return { attendance: [] };
      const q = new URLSearchParams({ date: today, classId });
      return parseResponse(await apiFetch(`/api/attendance?${q}`));
    },
    enabled: !!classId,
  });

  const { data: studentsData, isError: studentsError } = useQuery({
    queryKey: ["m-students-class", classId],
    queryFn: async () => {
      if (!classId) return { students: [] };
      const result = await parseResponse(await apiFetch("/api/students"));
      const allStudents: any[] = Array.isArray((result as any)?.students) ? (result as any).students : [];
      return { students: allStudents.filter((student) => String(student.classId) === classId) };
    },
    enabled: !!classId,
  });

  const recordMut = useMutation({
    mutationFn: async (body: { studentId: number; classId: number; date: string; status: Status }) =>
      parseResponse(await apiFetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["m-attendance", classId, today] });
    },
    onError: (error) => Alert.alert("Error", error instanceof Error ? error.message : "Could not save attendance"),
  });

  const attendance: any[] = Array.isArray((data as any)?.attendance) ? (data as any).attendance : [];
  const students: any[] = Array.isArray((studentsData as any)?.students) ? (studentsData as any).students : [];

  const getStatus = (studentId: number): Status | null => {
    const rec = attendance.find(
      (item) => Number(item.studentId) === studentId && item.date === today
    );
    return rec?.status ?? null;
  };

  const mark = (studentId: number, status: Status) => {
    const numericClassId = Number(classId);
    if (!Number.isInteger(numericClassId) || numericClassId <= 0) return;
    recordMut.mutate({ studentId, classId: numericClassId, date: today, status });
  };

  const presentCount = students.filter(
    (student) => getStatus(Number(student.id)) === "present"
  ).length;
  const hasLoadError = classesError || attendanceError || studentsError;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>Select Class</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {classes.map((cls: any) => (
              <TouchableOpacity
                key={cls.id}
                style={[
                  styles.classChip,
                  classId === String(cls.id) && styles.classChipActive,
                ]}
                onPress={() => setClassId(String(cls.id))}
              >
                <Text
                  style={[
                    styles.classChipText,
                    classId === String(cls.id) && styles.classChipTextActive,
                  ]}
                >
                  {cls.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {classId && (
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>{new Date(today).toDateString()}</Text>
          <Text style={[styles.statsText, { color: PINK, fontWeight: "600" }]}>
            {presentCount}/{students.length} present
          </Text>
        </View>
      )}

      {hasLoadError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load attendance data.</Text>
          <Text style={styles.empty}>Check your connection and try again.</Text>
        </View>
      ) : !classId ? (
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
          keyExtractor={(student: any) => String(student.id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const studentId = Number(item.id);
            const status = getStatus(studentId);
            return (
              <View style={styles.card}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name || "Unnamed student"}</Text>
                  <Text style={styles.studentAdm}>{item.admissionNo || "—"}</Text>
                </View>
                <View style={styles.btnRow}>
                  {(["present", "absent", "late"] as Status[]).map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.statusBtn,
                        status === value && {
                          backgroundColor: STATUS_COLORS[value] + "30",
                          borderColor: STATUS_COLORS[value],
                        },
                      ]}
                      disabled={recordMut.isPending}
                      onPress={() => mark(studentId, value)}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          status === value && { color: STATUS_COLORS[value] },
                        ]}
                      >
                        {value === "present" ? "P" : value === "absent" ? "A" : "L"}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 6, padding: 20 },
  empty: { color: "#8b949e", fontSize: 14, textAlign: "center" },
  errorText: { color: "#F87171", fontSize: 15, fontWeight: "600", textAlign: "center" },
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
