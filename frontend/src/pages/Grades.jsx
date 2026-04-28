import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getAssessments, getAssessmentGrades } from '../services/api';

export default function Grades() {
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAssessments();
      const rows = response.data || [];
      setAssessments(rows);
      if (rows.length > 0) {
        const firstAssessmentId = rows[0].id;
        setSelectedAssessmentId(firstAssessmentId);
        await fetchGrades(firstAssessmentId, rows[0].curriculum);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch assessments');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async (assessmentId, curriculum) => {
    setLoading(true);
    setError('');
    try {
      const response = await getAssessmentGrades(assessmentId, curriculum);
      setGrades(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch grades');
      setGrades([]);
    } finally {
      setLoading(false);
    }
  };

  const onAssessmentChange = async (event) => {
    const assessmentId = event.target.value;
    setSelectedAssessmentId(assessmentId);
    const selected = assessments.find((item) => item.id === assessmentId);
    if (selected) {
      await fetchGrades(assessmentId, selected.curriculum);
    }
  };

  const selectedAssessment = assessments.find((item) => item.id === selectedAssessmentId);
  const isCBC = selectedAssessment?.curriculum === 'cbc';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Grades</h3>
            <p className="text-sm text-slate-500">View submitted 8-4-4 scores and CBC competency records.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-soft">
            <p className="text-sm text-slate-500">Assessments</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{assessments.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-soft">
            <p className="text-sm text-slate-500">Curriculum</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">
              {selectedAssessment?.curriculum?.toUpperCase() || '-'}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-soft">
            <p className="text-sm text-slate-500">Grade entries</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{grades.length}</p>
          </div>
        </div>

        <div className="max-w-xl">
          <label className="mb-2 block text-sm font-medium text-slate-700">Select assessment</label>
          <select
            className="w-full"
            value={selectedAssessmentId}
            onChange={onAssessmentChange}
            disabled={loading || assessments.length === 0}
          >
            {assessments.length === 0 ? (
              <option value="">No assessments found</option>
            ) : (
              assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.name} - {assessment.subject_name} ({assessment.curriculum})
                </option>
              ))
            )}
          </select>
        </div>

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading grades...</div>
        ) : grades.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No grades found for this assessment</div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Admission No.</th>
                  {isCBC ? (
                    <>
                      <th className="px-6 py-4">Sub-strand</th>
                      <th className="px-6 py-4">Competency</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4">Score</th>
                      <th className="px-6 py-4">Grade</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {grades.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4">{entry.first_name} {entry.last_name}</td>
                    <td className="px-6 py-4">{entry.admission_number}</td>
                    {isCBC ? (
                      <>
                        <td className="px-6 py-4">{entry.sub_strand_name || '-'}</td>
                        <td className="px-6 py-4">{entry.competency_level}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">{entry.score}</td>
                        <td className="px-6 py-4">{entry.grade}</td>
                      </>
                    )}
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
