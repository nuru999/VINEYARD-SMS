import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, FileText, ChevronLeft, Award } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/input";
import { api } from "../lib/api";

const GRADE_COLOR: Record<string, string> = {
  A: "#3FB950", B: "#58A6FF", C: "#E3B341", D: "#F0883E", E: "#F85149",
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function PrintableCard({ card }: { card: any }) {
  return (
    <div className="report-card-print" style={{
      background: "#fff", color: "#111", width: "100%", maxWidth: 740, margin: "0 auto",
      fontFamily: "Georgia, serif", padding: "32px 40px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "3px solid #1B4D4D", paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#1B4D4D", letterSpacing: 1 }}>VINEYARD PRIMARY SCHOOL</div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>Fruitful Development • Nairobi, Kenya</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#E91E8C", marginTop: 10, textTransform: "uppercase", letterSpacing: 2 }}>
          Academic Report Card
        </div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{card.exam?.name} — {card.exam?.term} {card.exam?.year}</div>
      </div>

      {/* Student info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20, fontSize: 13 }}>
        <div><strong>Student Name:</strong> {card.student?.name}</div>
        <div><strong>Admission No:</strong> {card.student?.admissionNo}</div>
        <div><strong>Class:</strong> {card.class?.name}</div>
        <div><strong>Gender:</strong> {card.student?.gender || "—"}</div>
        <div><strong>Position in Class:</strong> <span style={{ color: "#E91E8C", fontWeight: 700 }}>{ordinal(card.position)} out of {card.classSize}</span></div>
        <div><strong>Overall Grade:</strong> <span style={{ color: GRADE_COLOR[card.overallGrade] || "#111", fontWeight: 700 }}>{card.overallGrade}</span></div>
      </div>

      {/* Subjects table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
        <thead>
          <tr style={{ background: "#1B4D4D", color: "#fff" }}>
            {["Subject", "Marks", "Out Of", "Percentage", "Grade", "Remarks"].map(h => (
              <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {card.subjects?.map((s: any, i: number) => (
            <tr key={s.subjectId} style={{ background: i % 2 === 0 ? "#f9f9f9" : "#fff", borderBottom: "1px solid #e0e0e0" }}>
              <td style={{ padding: "8px 12px", fontWeight: 500 }}>{s.subjectName}</td>
              <td style={{ padding: "8px 12px" }}>{s.marks ?? "—"}</td>
              <td style={{ padding: "8px 12px" }}>{s.maxMarks}</td>
              <td style={{ padding: "8px 12px" }}>{s.percentage !== null ? `${s.percentage}%` : "—"}</td>
              <td style={{ padding: "8px 12px", fontWeight: 700, color: GRADE_COLOR[s.grade] || "#111" }}>{s.grade}</td>
              <td style={{ padding: "8px 12px", color: "#555" }}>{s.remarks}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#1B4D4D", color: "#fff", fontWeight: 700 }}>
            <td style={{ padding: "9px 12px" }}>TOTAL</td>
            <td style={{ padding: "9px 12px" }}>{card.totalMarks}</td>
            <td style={{ padding: "9px 12px" }}>{card.totalMax}</td>
            <td style={{ padding: "9px 12px" }}>{card.overallPercentage}%</td>
            <td style={{ padding: "9px 12px" }}>{card.overallGrade}</td>
            <td style={{ padding: "9px 12px" }}>{card.overallRemarks}</td>
          </tr>
        </tfoot>
      </table>

      {/* Grade key */}
      <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#555", marginBottom: 20 }}>
        <strong>Grade Key:</strong>
        {[["A", "80–100% Excellent"], ["B", "70–79% Very Good"], ["C", "60–69% Good"], ["D", "50–59% Average"], ["E", "0–49% Needs Improvement"]].map(([g, desc]) => (
          <span key={g}><strong style={{ color: GRADE_COLOR[g] }}>{g}</strong> {desc}</span>
        ))}
      </div>

      {/* Signatures */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginTop: 32, fontSize: 12 }}>
        {["Class Teacher", "Head Teacher", "Parent/Guardian"].map(role => (
          <div key={role} style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #999", paddingTop: 6, color: "#555" }}>{role} Signature</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#999", borderTop: "1px solid #eee", paddingTop: 12 }}>
        Vineyard Primary School • "Fruitful Development" • Generated {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

export default function ReportCardsPage() {
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [viewCard, setViewCard] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: examsData } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => (await api.exams.$get()).json(),
  });

  const { data: cardsData, isLoading: cardsLoading } = useQuery({
    queryKey: ["report-cards", selectedExam],
    queryFn: async () => {
      if (!selectedExam) return null;
      const r = await fetch(`/api/report-cards?examId=${selectedExam}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!selectedExam,
  });

  const { data: singleCard, isLoading: singleLoading } = useQuery({
    queryKey: ["report-card-single", selectedExam, selectedStudent],
    queryFn: async () => {
      if (!selectedExam || !selectedStudent) return null;
      const r = await fetch(`/api/report-cards/${selectedStudent}?examId=${selectedExam}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!selectedExam && !!selectedStudent,
  });

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Report Card - Vineyard Primary School</title>
      <style>
        body { margin: 0; padding: 20px; font-family: Georgia, serif; }
        @media print { body { padding: 0; } }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; }
      </style>
      </head><body>${printContent}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handlePrintAll = () => {
    if (!cardsData?.reportCards?.length) return;
    const allCards = cardsData.reportCards.map((card: any) => {
      const el = document.createElement("div");
      el.style.pageBreakAfter = "always";
      // We'll just render them as text summary for bulk print
      return `<div style="page-break-after:always; padding:20px;">${document.getElementById(`card-${card.student?.id}`)?.innerHTML || ""}</div>`;
    }).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>All Report Cards</title>
      <style>body{margin:0;padding:0;font-family:Georgia,serif;}@media print{body{padding:0;}}</style>
      </head><body>${allCards}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 800);
  };

  const activeCard = selectedStudent ? singleCard?.reportCard : null;

  return (
    <Layout title="Report Cards" action={
      activeCard ? (
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => { setViewCard(null); setSelectedStudent(""); }}>
            <ChevronLeft size={14} /> Back to List
          </Button>
          <Button onClick={handlePrint}><Printer size={14} /> Print Card</Button>
        </div>
      ) : selectedExam && cardsData?.reportCards?.length > 0 ? (
        <Button onClick={handlePrintAll}><Printer size={14} /> Print All</Button>
      ) : undefined
    }>

      {/* Selectors */}
      {!activeCard && (
        <div style={{ display: "flex", gap: 14, marginBottom: 24, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Select
              label="Select Exam"
              value={selectedExam}
              onChange={e => { setSelectedExam(e.target.value); setSelectedStudent(""); }}
              options={(examsData?.exams || []).map((ex: any) => ({ value: String(ex.id), label: `${ex.name} — ${ex.term} ${ex.year}` }))}
            />
          </div>
          {cardsData?.reportCards && (
            <div style={{ flex: 1 }}>
              <Select
                label="View Student Card"
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                options={[
                  { value: "", label: "— All students —" },
                  ...(cardsData.reportCards.map((c: any) => ({
                    value: String(c.student?.id),
                    label: `${c.student?.name} (${c.student?.admissionNo})`,
                  }))),
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* Single card view */}
      {selectedStudent && (
        singleLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading...</div>
        ) : activeCard ? (
          <div>
            <div ref={printRef}>
              <PrintableCard card={activeCard} />
            </div>
          </div>
        ) : null
      )}

      {/* All cards list */}
      {!selectedStudent && selectedExam && (
        cardsLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading report cards...</div>
        ) : !cardsData?.reportCards?.length ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
            <FileText size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>No results yet</div>
            <div style={{ fontSize: 13 }}>Enter exam results first from the Exams page.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {cardsData.reportCards
              .sort((a: any, b: any) => a.position - b.position)
              .map((card: any) => (
                <div key={card.student?.id} id={`card-${card.student?.id}`}
                  style={{
                    background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)",
                    padding: 18, cursor: "pointer", transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  onClick={() => setSelectedStudent(String(card.student?.id))}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{card.student?.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{card.student?.admissionNo} · {card.class?.name}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: `${GRADE_COLOR[card.overallGrade] || "#555"}22`,
                        border: `2px solid ${GRADE_COLOR[card.overallGrade] || "#555"}`,
                        fontSize: 16, fontWeight: 800, color: GRADE_COLOR[card.overallGrade] || "#555",
                      }}>{card.overallGrade}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{card.overallPercentage}%</div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Score</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#E91E8C" }}>{ordinal(card.position)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Position</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#58A6FF" }}>{card.subjects?.filter((s: any) => s.marks !== null).length}</div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Subjects</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{card.overallRemarks}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Award size={12} color="#E3B341" />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {card.totalMarks}/{card.totalMax}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )
      )}

      {/* Empty state */}
      {!selectedExam && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
          <FileText size={56} style={{ marginBottom: 16, opacity: 0.2 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Select an exam to generate report cards</div>
          <div style={{ fontSize: 13 }}>Report cards are auto-generated from exam results.</div>
        </div>
      )}
    </Layout>
  );
}
