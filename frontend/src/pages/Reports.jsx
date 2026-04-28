import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { getStudents, getReportTerms, generateReportCard, getClassReport } from '../services/api';

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [classStream, setClassStream] = useState('');
  const [studentReport, setStudentReport] = useState(null);
  const [classReport, setClassReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const gradeOptions = useMemo(() => {
    const seen = new Set();
    const grades = [];
    students.forEach((student) => {
      if (!seen.has(student.current_grade)) {
        seen.add(student.current_grade);
        grades.push(student.current_grade);
      }
    });
    return grades;
  }, [students]);

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsRes, termsRes] = await Promise.all([getStudents(), getReportTerms()]);
      const allStudents = studentsRes.data || [];
      const allTerms = termsRes.data || [];
      setStudents(allStudents);
      setTerms(allTerms);

      if (allStudents.length > 0) {
        setSelectedStudentId(allStudents[0].id);
        setSelectedGrade(allStudents[0].current_grade);
      }
      if (allTerms.length > 0) {
        setSelectedTermId(allTerms[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report inputs');
    } finally {
      setLoading(false);
    }
  };

  const runStudentReport = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    setError('');
    try {
      const selectedTerm = terms.find((term) => term.id === selectedTermId);
      const response = await generateReportCard(selectedStudentId, {
        termId: selectedTermId || undefined,
        academicYearId: selectedTerm?.academic_year_id
      });
      setStudentReport(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate student report');
      setStudentReport(null);
    } finally {
      setLoading(false);
    }
  };

  const runClassReport = async () => {
    if (!selectedGrade) return;
    setLoading(true);
    setError('');
    try {
      const response = await getClassReport(selectedGrade, classStream || undefined, selectedTermId || undefined);
      setClassReport(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate class report');
      setClassReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Reports</h3>
            <p className="text-sm text-slate-500">Generate student report cards and class performance reports.</p>
          </div>
        </div>

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft space-y-4">
            <h4 className="text-lg font-semibold text-slate-900">Student report card</h4>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Student</label>
              <select className="w-full" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} ({student.admission_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Term</label>
              <select className="w-full" value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
                <option value="">All terms</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.academic_year_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={runStudentReport}
              disabled={loading || !selectedStudentId}
            >
              Generate student report
            </button>

            {studentReport && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">{studentReport.student?.name}</p>
                <p className="text-slate-600">Curriculum: {studentReport.curriculum}</p>
                <p className="text-slate-600">Subjects with records: {studentReport.subjects?.length || 0}</p>
                {studentReport.summary?.overallGrade && (
                  <p className="text-slate-600">
                    Overall: {studentReport.summary.overallGrade} ({studentReport.summary.overallPercentage}%)
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft space-y-4">
            <h4 className="text-lg font-semibold text-slate-900">Class report</h4>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Grade</label>
              <select className="w-full" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                <option value="">Select grade</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Stream (optional)</label>
              <input
                className="w-full"
                value={classStream}
                onChange={(e) => setClassStream(e.target.value)}
                placeholder="e.g. East"
              />
            </div>
            <button
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={runClassReport}
              disabled={loading || !selectedGrade}
            >
              Generate class report
            </button>

            {classReport && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">
                  {classReport.grade} {classReport.stream ? `(${classReport.stream})` : ''}
                </p>
                <p className="text-slate-600">Students: {classReport.studentCount || 0}</p>
              </div>
            )}
          </div>
        </div>

        {classReport?.students?.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Admission No.</th>
                  <th className="px-6 py-4">Subjects Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {classReport.students.map((student) => (
                  <tr key={student.studentId}>
                    <td className="px-6 py-4">{student.name}</td>
                    <td className="px-6 py-4">{student.admissionNumber}</td>
                    <td className="px-6 py-4">{Object.keys(student.grades || {}).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
