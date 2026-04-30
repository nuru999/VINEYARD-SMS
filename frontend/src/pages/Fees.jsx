import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getFeePayments, getFeeStatement, getStudents, recordFeePayment } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { feePaymentSchema } from '../validation/schemas';

export default function Fees() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [feeSummary, setFeeSummary] = useState({
    totalCharged: 0,
    totalPaid: 0,
    balance: 0,
    pendingAmount: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const canRecordPayment = ['principal', 'bursar', 'super_admin'].includes(user?.role);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    status: 'completed',
    reference: '',
    description: ''
  });

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

      const [paymentsResponse, statementResponse] = await Promise.all([
        getFeePayments(defaultStudentId),
        getFeeStatement(defaultStudentId)
      ]);
      setPayments(paymentsResponse.data || []);
      setFeeSummary(statementResponse.data?.summary || {
        totalCharged: 0,
        totalPaid: 0,
        balance: 0,
        pendingAmount: 0
      });
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
    setSuccess('');
    try {
      const [paymentsResponse, statementResponse] = await Promise.all([
        getFeePayments(studentId),
        getFeeStatement(studentId)
      ]);
      setPayments(paymentsResponse.data || []);
      setFeeSummary(statementResponse.data?.summary || {
        totalCharged: 0,
        totalPaid: 0,
        balance: 0,
        pendingAmount: 0
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch fee payments');
    } finally {
      setLoading(false);
    }
  };

  const onPaymentFormChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    if (!selectedStudentId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        studentId: selectedStudentId,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        status: paymentForm.status,
        reference: paymentForm.reference.trim(),
        description: paymentForm.description.trim()
      };

      const parsed = feePaymentSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message || 'Please correct payment fields');
        setSubmitting(false);
        return;
      }

      await recordFeePayment(payload);
      setSuccess('Payment recorded successfully.');
      setPaymentForm({
        amount: '',
        paymentMethod: 'cash',
        status: 'completed',
        reference: '',
        description: ''
      });
      setShowForm(false);
      const [paymentsResponse, statementResponse] = await Promise.all([
        getFeePayments(selectedStudentId),
        getFeeStatement(selectedStudentId)
      ]);
      setPayments(paymentsResponse.data || []);
      setFeeSummary(statementResponse.data?.summary || {
        totalCharged: 0,
        totalPaid: 0,
        balance: 0,
        pendingAmount: 0
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCollected = Number.parseFloat(feeSummary.totalPaid || 0);
  const totalPending = Number.parseFloat(feeSummary.pendingAmount || 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Fee Management 💰</h3>
            <p className="mt-1 text-slate-600">Track and record student fee payments</p>
          </div>
          {canRecordPayment && (
            <button
              className="rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 transition-all"
              onClick={() => setShowForm((prev) => !prev)}
            >
              {showForm ? '✕ Cancel' : '+ Record payment'}
            </button>
          )}
        </div>

        {/* Student Selection */}
        <div className="max-w-xl">
          <label className="mb-2 block text-sm font-medium text-slate-700">Select student</label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            value={selectedStudentId}
            onChange={handleStudentChange}
            disabled={loading || students.length === 0}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} - {student.current_grade}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-green-50 to-green-100/50 p-6 hover:shadow-lg transition-shadow">
            <p className="text-sm text-slate-600 font-medium">Total Paid</p>
            <p className="mt-3 text-3xl font-bold text-green-700">KES {totalCollected.toLocaleString()}</p>
            <p className="mt-2 text-xs text-slate-500">Expected: KES {Number.parseFloat(feeSummary.totalCharged || 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-6 hover:shadow-lg transition-shadow">
            <p className="text-sm text-slate-600 font-medium">Pending</p>
            <p className="mt-3 text-3xl font-bold text-yellow-700">KES {totalPending.toLocaleString()}</p>
            <p className="mt-2 text-xs text-slate-500">Outstanding balance</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 hover:shadow-lg transition-shadow">
            <p className="text-sm text-slate-600 font-medium">Total Payments</p>
            <p className="mt-3 text-3xl font-bold text-blue-700">{payments.length}</p>
            <p className="mt-2 text-xs text-slate-500">All transactions</p>
          </div>
        </div>

        {!canRecordPayment && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            You can view fee records, but only principal/bursar accounts can record payments.
          </div>
        )}

        {showForm && canRecordPayment && (
          <form
            onSubmit={handleRecordPayment}
            className="grid gap-4 rounded-xl border border-slate-200 bg-gradient-soft p-6 md:grid-cols-2"
          >
            <input
              type="number"
              name="amount"
              placeholder="Amount (KES)"
              value={paymentForm.amount}
              onChange={onPaymentFormChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              required
            />
            <select
              name="paymentMethod"
              value={paymentForm.paymentMethod}
              onChange={onPaymentFormChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="cheque">Cheque</option>
              <option value="bank">Bank Transfer</option>
            </select>
            <select
              name="status"
              value={paymentForm.status}
              onChange={onPaymentFormChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
            <input
              type="text"
              name="reference"
              placeholder="Reference / Receipt No."
              value={paymentForm.reference}
              onChange={onPaymentFormChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
            <input
              type="text"
              name="description"
              placeholder="Description (optional)"
              value={paymentForm.description}
              onChange={onPaymentFormChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-gradient-primary px-4 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-60 transition-all"
              >
                {submitting ? 'Saving...' : 'Record payment'}
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

        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-3">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No payments recorded</p>
            <p className="text-sm text-slate-400 mt-1">Record the first payment to get started</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft hover:shadow-lg transition-shadow">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-gradient-soft border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-900">Date</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Amount</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Method</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Reference</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">KES {Number(payment.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{payment.payment_method || payment.paymentMethod}</td>
                    <td className="px-6 py-4 text-slate-600">{payment.transaction_code || '-'}</td>
                    <td className="px-6 py-4">
                      {payment.status === 'completed' ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                          <span className="h-2 w-2 rounded-full bg-green-600"></span>
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 text-yellow-700 px-3 py-1 text-xs font-semibold">
                          <span className="h-2 w-2 rounded-full bg-yellow-600"></span>
                          Pending
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
