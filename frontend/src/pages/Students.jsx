import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { createStudent, getStudents } from '../services/api';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'male',
    dateOfBirth: '',
    curriculum: '8-4-4',
    currentGrade: '',
    stream: '',
    boardingStatus: 'day'
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getStudents();
      setStudents(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const normalizeCurriculum = (value) => {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/_/g, '-');

    if (normalized === '844' || normalized === '8-4-4') return '8-4-4';
    if (normalized === 'cbc') return 'cbc';
    return value;
  };

  const handleCreateStudent = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        currentGrade: form.currentGrade.trim(),
        stream: form.stream.trim(),
        curriculum: normalizeCurriculum(form.curriculum),
        gender: String(form.gender || '').trim().toLowerCase(),
        boardingStatus: String(form.boardingStatus || 'day').trim().toLowerCase()
      };

      await createStudent(payload);
      setShowForm(false);
      setForm({
        firstName: '',
        lastName: '',
        gender: 'male',
        dateOfBirth: '',
        curriculum: '8-4-4',
        currentGrade: '',
        stream: '',
        boardingStatus: 'day'
      });
      await fetchStudents();
    } catch (err) {
      const validationErrors = err.response?.data?.errors;
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        setError(validationErrors.map((item) => item.message).join(', '));
      } else {
        setError(err.response?.data?.message || 'Failed to create student');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Students 👥</h3>
            <p className="mt-1 text-slate-600">Manage student profiles. Total: <span className="font-semibold text-primary-600">{students.length}</span></p>
          </div>
          <button
            className="rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 transition-all"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? '✕ Cancel' : '+ Add new student'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateStudent}
            className="grid gap-4 rounded-xl border border-slate-200 bg-gradient-soft p-6 md:grid-cols-2"
          >
            <input className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100" name="firstName" placeholder="First name" value={form.firstName} onChange={onChange} required />
            <input className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100" name="lastName" placeholder="Last name" value={form.lastName} onChange={onChange} required />
            <select className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100" name="gender" value={form.gender} onChange={onChange}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={onChange} required />
            <select className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100" name="curriculum" value={form.curriculum} onChange={onChange}>
              <option value="8-4-4">8-4-4</option>
              <option value="cbc">CBC</option>
            </select>
            <input className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100" name="currentGrade" placeholder="Current grade (e.g. Form 1)" value={form.currentGrade} onChange={onChange} required />
            <input className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100" name="stream" placeholder="Stream (optional)" value={form.stream} onChange={onChange} />
            <select className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100" name="boardingStatus" value={form.boardingStatus} onChange={onChange}>
              <option value="day">Day</option>
              <option value="boarding">Boarding</option>
            </select>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-60 transition-all"
              >
                {submitting ? 'Saving...' : 'Save student'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
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
            <p className="mt-3">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No students found</p>
            <p className="text-sm text-slate-400 mt-1">Add your first student to get started</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft hover:shadow-lg transition-shadow">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-gradient-soft border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-900">Student name</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Admission No.</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Grade</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Stream</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{student.first_name} {student.last_name}</td>
                    <td className="px-6 py-4 text-slate-600">{student.admission_number}</td>
                    <td className="px-6 py-4 text-slate-600">{student.current_grade}</td>
                    <td className="px-6 py-4 text-slate-600">{student.stream || '-'}</td>
                    <td className="px-6 py-4">
                      {student.status === 'active' ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                          <span className="h-2 w-2 rounded-full bg-green-600"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs font-semibold">
                          <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                          Inactive
                        </span>
                      )}
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
