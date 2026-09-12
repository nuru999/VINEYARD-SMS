type ExamSummary = {
  name?: unknown;
  classId?: unknown;
  term?: unknown;
  year?: unknown;
};

type ClassSummary = {
  id?: unknown;
  name?: unknown;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function examLabel(exam: ExamSummary, classes: ClassSummary[]) {
  const className = clean(classes.find((item) => String(item.id) === String(exam.classId))?.name) || "Unknown class";
  const period = [clean(exam.term), clean(exam.year)].filter(Boolean).join(" ");
  return [clean(exam.name) || "Unnamed exam", className, period].filter(Boolean).join(" — ");
}
