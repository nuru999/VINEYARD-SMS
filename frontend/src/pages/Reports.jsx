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
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports 📈</h2>
          <p className="mt-1 text-slate-600">Generate student report cards and class performance reports.</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Student Report Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft space-y-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">👤</span>
              <h3 className="text-lg font-bold text-slate-900">Student Report Card</h3>
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 font-semibold">Student</label>
              <select 
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                value={selectedStudentId} 
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} ({student.admission_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 font-semibold">Term</label>
              <select 
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                value={selectedTermId} 
                onChange={(e) => setSelectedTermId(e.target.value)}
              >
                <option value="">All terms</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.academic_year_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="w-full rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-60 transition-all"
              onClick={runStudentReport}
              disabled={loading || !selectedStudentId}
            >
              {loading ? 'Generating...' : 'Generate report'}
            </button>

            {studentReport && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm">
                <p className="font-semibold text-primary-900">{studentReport.student?.name}</p>
                <div className="mt-3 space-y-1 text-primary-700">
                  <p>Curriculum: {studentReport.curriculum}</p>
                  <p>Subjects: {studentReport.subjects?.length || 0}</p>
                  {studentReport.summary?.overallGrade && (
                    <p className="font-semibold">Overall: {studentReport.summary.overallGrade} ({studentReport.summary.overallPercentage}%)</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Class Report */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft space-y-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">👥</span>
              <h3 className="text-lg font-bold text-slate-900">Class Report</h3>
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 font-semibold">Grade</label>
              <select 
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                value={selectedGrade} 
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="">Select grade</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 font-semibold">Stream (optional)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                value={classStream}
                onChange={(e) => setClassStream(e.target.value)}
                placeholder="e.g. East"
              />
            </div>
            <button
              className="w-full rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-60 transition-all"
              onClick={runClassReport}
              disabled={loading || !selectedGrade}
            >
              {loading ? 'Generating...' : 'Generate report'}
            </button>

            {classReport && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm">
                <p className="font-semibold text-primary-900">
                  {classReport.grade} {classReport.stream ? `(${classReport.stream})` : ''}
                </p>
                <div className="mt-3 space-y-1 text-primary-700">
                  <p>Students: {classReport.studentCount || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {classReport?.students?.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft hover:shadow-lg transition-shadow">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-gradient-soft border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-900">Student</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Admission No.</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Subjects Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {classReport.students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600">{student.admissionNumber}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block rounded-full bg-primary-100 text-primary-700 px-3 py-1 text-xs font-semibold">
                        {Object.keys(student.grades || {}).length} subjects
                      </span>
                    </td>
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
