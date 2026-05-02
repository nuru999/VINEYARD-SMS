import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getAssessments, getAssessmentGrades, createAssessment, getStudents, submitGrades844, submitGradesCBC } from '../services/api';

export default function Grades() {
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [entryRows, setEntryRows] = useState([]);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entrySuccess, setEntrySuccess] = useState('');
  const [entryError, setEntryError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    assessmentType: 'test',
    curriculum: '8-4-4',
    maxScore: 100,
    weightPercentage: 100,
    assessmentDate: '',
    subjectId: '',
    termId: ''
  });
  const [submitting, setSubmitting] = useState(false);

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

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getStudents({ status: 'active' });
      setStudents(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssessmentId) {
      fetchStudents();
    }
  }, [selectedAssessmentId]);

  useEffect(() => {
    if (!selectedAssessmentId || students.length === 0) {
      setEntryRows([]);
      return;
    }

    const existingByStudent = Object.fromEntries(
      grades.map((entry) => [entry.student_id || entry.studentId, entry])
    );

    setEntryRows(
      students.map((student) => {
        const existing = existingByStudent[student.id];
        return {
          studentId: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          admissionNumber: student.admission_number,
          score: existing?.score ?? '',
          grade: existing?.grade ?? '',
          competencyLevel: existing?.competency_level ?? '',
          observations: existing?.teacher_observations ?? ''
        };
      })
    );
  }, [students, grades, selectedAssessmentId]);

  const onEntryChange = (studentId, field, value) => {
    setEntryRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId
          ? {
              ...row,
              [field]: field === 'score' ? String(value) : value
            }
          : row
      )
    );
  };

  const handleSaveGrades = async (event) => {
    event.preventDefault();
    if (!selectedAssessmentId) return;

    setEntryLoading(true);
    setEntryError('');
    setEntrySuccess('');

    try {
      const payload = entryRows.map((row) =>
        isCBC
          ? {
              studentId: row.studentId,
              subStrandId: row.subStrandId || null,
              competencyLevel: row.competencyLevel,
              observations: row.observations
            }
          : {
              studentId: row.studentId,
              score: Number(row.score) || 0,
              remarks: row.observations
            }
      );

      if (isCBC) {
        await submitGradesCBC(selectedAssessmentId, payload);
      } else {
        await submitGrades844(selectedAssessmentId, payload);
      }

      setEntrySuccess('Grades saved successfully.');
      await fetchGrades(selectedAssessmentId, selectedAssessment?.curriculum);
    } catch (err) {
      setEntryError(err.response?.data?.message || 'Failed to save grades');
    } finally {
      setEntryLoading(false);
    }
  };

  const handleCreateAssessment = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...createForm,
        maxScore: Number(createForm.maxScore),
        weightPercentage: Number(createForm.weightPercentage),
        subjectId: createForm.subjectId || null,
        termId: createForm.termId || null
      };
      await createAssessment(payload);
      setShowCreateForm(false);
      setCreateForm({
        name: '',
        assessmentType: 'test',
        curriculum: '8-4-4',
        maxScore: 100,
        weightPercentage: 100,
        assessmentDate: '',
        subjectId: '',
        termId: ''
      });
      await fetchAssessments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
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

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-semibold">How this page is used</p>
          <p className="mt-1">
            1) Create an assessment (Test/Exam/Assignment), 2) choose it from the list, 3) enter each student's score or competency and save.
            For 8-4-4, <span className="font-semibold">Contribution to term (%)</span> is how much this assessment contributes to final term averages.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 transition-all"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create Assessment'}
          </button>
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

        {showCreateForm && (
          <form
            onSubmit={handleCreateAssessment}
            className="grid gap-4 rounded-xl border border-slate-200 bg-gradient-soft p-6 md:grid-cols-2"
          >
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              name="name"
              placeholder="Assessment name"
              value={createForm.name}
              onChange={onCreateChange}
              required
            />
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              name="assessmentType"
              value={createForm.assessmentType}
              onChange={onCreateChange}
            >
              <option value="test">Test</option>
              <option value="exam">Exam</option>
              <option value="assignment">Assignment</option>
            </select>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              name="curriculum"
              value={createForm.curriculum}
              onChange={onCreateChange}
            >
              <option value="8-4-4">8-4-4</option>
              <option value="cbc">CBC</option>
            </select>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              name="maxScore"
              type="number"
              placeholder="Max score"
              value={createForm.maxScore}
              onChange={onCreateChange}
              required
            />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              name="weightPercentage"
              type="number"
              placeholder="Contribution to term (%)"
              value={createForm.weightPercentage}
              onChange={onCreateChange}
              min="0"
              max="100"
              required
            />
            <p className="-mt-2 text-xs text-slate-500 md:col-span-2">
              Example: CAT can be 30%, End-term exam 70%. If you only use one assessment, keep it at 100%.
            </p>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              name="assessmentDate"
              type="date"
              value={createForm.assessmentDate}
              onChange={onCreateChange}
              required
            />
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-60 transition-all"
              >
                {submitting ? 'Creating...' : 'Create Assessment'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

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
                  {assessment.name} - {assessment.subject_name || 'General'} ({assessment.curriculum})
                </option>
              ))
            )}
          </select>
        </div>

        {selectedAssessment && entryRows.length > 0 && (
          <form onSubmit={handleSaveGrades} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Enter grades for {selectedAssessment.name}</h3>
                <p className="text-sm text-slate-500">Fill scores below and save to record grades.</p>
              </div>
              <button
                type="submit"
                disabled={entryLoading}
                className="rounded-lg bg-gradient-primary px-5 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-60 transition-all"
              >
                {entryLoading ? 'Saving...' : 'Save grades'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">Student</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Admission No.</th>
                    {isCBC ? (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-900">Competency</th>
                        <th className="px-4 py-3 font-semibold text-slate-900">Observations</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-900">Score</th>
                        <th className="px-4 py-3 font-semibold text-slate-900">Remarks</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {entryRows.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.firstName} {row.lastName}</td>
                      <td className="px-4 py-3 text-slate-600">{row.admissionNumber || '-'}</td>
                      {isCBC ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.competencyLevel}
                              onChange={(e) => onEntryChange(row.studentId, 'competencyLevel', e.target.value)}
                              placeholder="e.g. ME"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.observations}
                              onChange={(e) => onEntryChange(row.studentId, 'observations', e.target.value)}
                              placeholder="Teacher notes"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={row.score}
                              onChange={(e) => onEntryChange(row.studentId, 'score', e.target.value)}
                              min="0"
                              max={selectedAssessment.max_score || 100}
                              placeholder="Score"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.observations}
                              onChange={(e) => onEntryChange(row.studentId, 'observations', e.target.value)}
                              placeholder="Remarks"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {entrySuccess && (
              <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {entrySuccess}
              </div>
            )}
            {entryError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {entryError}
              </div>
            )}
          </form>
        )}

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
