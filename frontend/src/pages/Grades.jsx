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
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Student Grades 📝</h2>
          <p className="mt-1 text-slate-600">View submitted 8-4-4 scores and CBC competency records.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 hover:shadow-lg transition-shadow">
            <p className="text-sm text-slate-600 font-medium">Assessments</p>
            <p className="mt-3 text-3xl font-bold text-blue-700">{assessments.length}</p>
            <p className="mt-2 text-xs text-slate-500">Total assessments</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 hover:shadow-lg transition-shadow">
            <p className="text-sm text-slate-600 font-medium">Curriculum</p>
            <p className="mt-3 text-3xl font-bold text-purple-700">
              {selectedAssessment?.curriculum?.toUpperCase() || '-'}
            </p>
            <p className="mt-2 text-xs text-slate-500">Current curriculum</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-green-50 to-green-100/50 p-6 hover:shadow-lg transition-shadow">
            <p className="text-sm text-slate-600 font-medium">Grade Entries</p>
            <p className="mt-3 text-3xl font-bold text-green-700">{grades.length}</p>
            <p className="mt-2 text-xs text-slate-500">Submitted grades</p>
          </div>
        </div>

        <div className="max-w-xl">
          <label className="mb-2 block text-sm font-medium text-slate-700 font-semibold">Select assessment</label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
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

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-3">Loading grades...</p>
          </div>
        ) : grades.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No grades found for this assessment</p>
            <p className="text-sm text-slate-400 mt-1">Create grades in another assessment to display them here</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft hover:shadow-lg transition-shadow">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-gradient-soft border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-900">Student</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Admission No.</th>
                  {isCBC ? (
                    <>
                      <th className="px-6 py-4 font-semibold text-slate-900">Sub-strand</th>
                      <th className="px-6 py-4 font-semibold text-slate-900">Competency</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 font-semibold text-slate-900">Score</th>
                      <th className="px-6 py-4 font-semibold text-slate-900">Grade</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {grades.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{entry.first_name} {entry.last_name}</td>
                    <td className="px-6 py-4 text-slate-600">{entry.admission_number}</td>
                    {isCBC ? (
                      <>
                        <td className="px-6 py-4 text-slate-600">{entry.sub_strand_name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-full bg-primary-100 text-primary-700 px-3 py-1 text-xs font-semibold">
                            {entry.competency_level}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-medium text-slate-900">{entry.score}</td>
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-full bg-primary-100 text-primary-700 px-3 py-1 text-xs font-semibold">
                            {entry.grade}
                          </span>
                        </td>
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
