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

  const handleCreateStudent = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createStudent(form);
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
      setError(err.response?.data?.message || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Students</h3>
            <p className="text-sm text-slate-500">View and manage student profiles. Total: {students.length}</p>
          </div>
          <button
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => setShowForm((prev) => !prev)}
          >
            Add new student
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateStudent}
            className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft md:grid-cols-2"
          >
            <input className="w-full" name="firstName" placeholder="First name" value={form.firstName} onChange={onChange} required />
            <input className="w-full" name="lastName" placeholder="Last name" value={form.lastName} onChange={onChange} required />
            <select className="w-full" name="gender" value={form.gender} onChange={onChange}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input className="w-full" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={onChange} required />
            <select className="w-full" name="curriculum" value={form.curriculum} onChange={onChange}>
              <option value="8-4-4">8-4-4</option>
              <option value="cbc">CBC</option>
            </select>
            <input className="w-full" name="currentGrade" placeholder="Current grade (e.g. Form 1)" value={form.currentGrade} onChange={onChange} required />
            <input className="w-full" name="stream" placeholder="Stream (optional)" value={form.stream} onChange={onChange} />
            <select className="w-full" name="boardingStatus" value={form.boardingStatus} onChange={onChange}>
              <option value="day">Day</option>
              <option value="boarding">Boarding</option>
            </select>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save student'}
              </button>
            </div>
          </form>
        )}

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No students found</div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-6 py-4">Student name</th>
                  <th className="px-6 py-4">Admission No.</th>
                  <th className="px-6 py-4">Grade</th>
                  <th className="px-6 py-4">Stream</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4">{student.first_name} {student.last_name}</td>
                    <td className="px-6 py-4">{student.admission_number}</td>
                    <td className="px-6 py-4">{student.current_grade}</td>
                    <td className="px-6 py-4">{student.stream || '-'}</td>
                    <td className={`px-6 py-4 ${student.status === 'active' ? 'text-green-600' : 'text-slate-500'}`}>
                      {student.status}
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
