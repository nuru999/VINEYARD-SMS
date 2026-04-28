import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getFeePayments, getStudents } from '../services/api';

export default function Fees() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentsAndPayments();
  }, []);

  const fetchStudentsAndPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const studentsResponse = await getStudents();
      const allStudents = studentsResponse.data || [];
      setStudents(allStudents);

      if (allStudents.length === 0) {
        setPayments([]);
        return;
      }

      const defaultStudentId = allStudents[0].id;
      setSelectedStudentId(defaultStudentId);

      const paymentsResponse = await getFeePayments(defaultStudentId);
      setPayments(paymentsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch fee payments');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = async (event) => {
    const studentId = event.target.value;
    setSelectedStudentId(studentId);
    setLoading(true);
    setError('');
    try {
      const response = await getFeePayments(studentId);
      setPayments(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch fee payments');
    } finally {
      setLoading(false);
    }
  };

  const totalCollected = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Fees</h3>
            <p className="text-sm text-slate-500">Record payments and check outstanding balances.</p>
          </div>
          <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Record payment
          </button>
        </div>

        <div className="max-w-md">
          <label className="mb-2 block text-sm font-medium text-slate-700">Select student</label>
          <select
            className="w-full"
            value={selectedStudentId}
            onChange={handleStudentChange}
            disabled={loading || students.length === 0}
          >
            {students.length === 0 ? (
              <option value="">No students available</option>
            ) : (
              students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} ({student.admission_number})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-soft">
            <p className="text-sm text-slate-500">Total collected</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              KES {(totalCollected / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-soft">
            <p className="text-sm text-slate-500">Pending payments</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              KES {(totalPending / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-soft">
            <p className="text-sm text-slate-500">Total transactions</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {payments.length}
            </p>
          </div>
        </div>

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No payments recorded yet</div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {payments.slice(0, 10).map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4">Student {payment.student_id?.substring(0, 8)}</td>
                    <td className="px-6 py-4">KES {payment.amount.toLocaleString()}</td>
                    <td className={`px-6 py-4 ${payment.status === 'completed' ? 'text-emerald-600' : payment.status === 'pending' ? 'text-amber-600' : 'text-red-600'}`}>
                      {payment.status}
                    </td>
                    <td className="px-6 py-4 capitalize">{payment.payment_method}</td>
                    <td className="px-6 py-4">{new Date(payment.created_at).toLocaleDateString()}</td>
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
