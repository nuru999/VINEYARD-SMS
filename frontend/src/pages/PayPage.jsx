import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' });

const STEPS = { LOOKUP: 'lookup', STATEMENT: 'statement', PAYING: 'paying', SUCCESS: 'success' };

// ─── component ───────────────────────────────────────────────────────────────
export default function PayPage() {
  const [step, setStep] = useState(STEPS.LOOKUP);
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [data, setData] = useState(null); // { student, feeStructure, payments, summary }

  const [payForm, setPayForm] = useState({ phone: '', amount: '' });
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);
  const [checkoutId, setCheckoutId] = useState('');
  const [receipt, setReceipt] = useState(null);

  const pollRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── step 1: lookup ──────────────────────────────────────────────────────────
  const handleLookup = async (e) => {
    e.preventDefault();
    if (!admissionNumber.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    try {
      const res = await api.get(`/public/pay/${admissionNumber.trim()}`);
      setData(res.data);
      setPayForm((f) => ({ ...f, amount: String(Math.max(res.data.summary.pendingAmount, 0)) }));
      setStep(STEPS.STATEMENT);
    } catch (err) {
      setLookupError(err.response?.data?.message || 'Student not found. Check the admission number.');
    } finally {
      setLookupLoading(false);
    }
  };

  // ── step 3: initiate stk push ───────────────────────────────────────────────
  const handlePay = async (e) => {
    e.preventDefault();
    setPayError('');
    const amount = parseFloat(payForm.amount);
    if (!payForm.phone.trim()) return setPayError('Please enter a phone number.');
    if (isNaN(amount) || amount < 1) return setPayError('Amount must be at least KES 1.');

    setPaying(true);
    try {
      const res = await api.post('/public/pay/initiate', {
        admissionNumber: data.student.admissionNumber,
        phoneNumber: payForm.phone.trim(),
        amount,
      });

      setCheckoutId(res.data.checkoutRequestId);
      setStep(STEPS.PAYING);
      startPolling(res.data.checkoutRequestId);
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment initiation failed. Try again.');
    } finally {
      setPaying(false);
    }
  };

  const startPolling = (cid) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/public/pay/status/${cid}`);
        const { status, receiptNumber, amount, failureReason } = res.data;

        if (status === 'completed') {
          clearInterval(pollRef.current);
          setReceipt({ receiptNumber, amount });
          setStep(STEPS.SUCCESS);
        } else if (status === 'failed') {
          clearInterval(pollRef.current);
          setPayError(failureReason || 'Payment was not completed.');
          setStep(STEPS.STATEMENT);
        } else if (attempts >= 24) {
          // 2 min timeout
          clearInterval(pollRef.current);
          setPayError('Payment confirmation timed out. If you entered your PIN, check with the school.');
          setStep(STEPS.STATEMENT);
        }
      } catch {
        // silently retry
      }
    }, 5000);
  };

  const reset = () => {
    clearInterval(pollRef.current);
    setStep(STEPS.LOOKUP);
    setAdmissionNumber('');
    setData(null);
    setPayForm({ phone: '', amount: '' });
    setPayError('');
    setCheckoutId('');
    setReceipt(null);
    setLookupError('');
  };

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* header */}
      <header style={{
        background: '#1e3a5f',
        color: '#fff',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: '#2e6da4', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 18,
        }}>V</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Vineyard School</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Fee Payment Portal</div>
        </div>
      </header>

      {/* stepper */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px 0' }}>
        {['Find Student', 'Fee Statement', 'Pay via M-Pesa'].map((label, i) => {
          const stepKeys = [STEPS.LOOKUP, STEPS.STATEMENT, STEPS.PAYING];
          const active = step === stepKeys[i] || step === STEPS.SUCCESS && i === 2;
          const done = (
            (i === 0 && [STEPS.STATEMENT, STEPS.PAYING, STEPS.SUCCESS].includes(step)) ||
            (i === 1 && [STEPS.PAYING, STEPS.SUCCESS].includes(step)) ||
            (i === 2 && step === STEPS.SUCCESS)
          );
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', margin: '0 auto 4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#16a34a' : active ? '#1e3a5f' : '#cbd5e1',
                  color: '#fff', fontWeight: 700, fontSize: 13, transition: 'all 0.3s',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 11, color: active || done ? '#1e3a5f' : '#94a3b8', fontWeight: active ? 700 : 400 }}>
                  {label}
                </div>
              </div>
              {i < 2 && (
                <div style={{
                  width: 48, height: 2, margin: '0 8px 16px',
                  background: done ? '#16a34a' : '#cbd5e1', transition: 'all 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* card */}
      <div style={{ maxWidth: 560, margin: '24px auto', padding: '0 16px 40px' }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* ── STEP 1: LOOKUP ── */}
          {step === STEPS.LOOKUP && (
            <div style={{ padding: 32 }}>
              <h2 style={{ margin: '0 0 6px', color: '#1e3a5f', fontSize: 20 }}>Find Your Child's Account</h2>
              <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>
                Enter the student's admission number to view their fee statement.
              </p>
              <form onSubmit={handleLookup}>
                <label style={labelStyle}>Admission Number</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. VS2024001"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  autoFocus
                  required
                />
                {lookupError && <div style={errorStyle}>{lookupError}</div>}
                <button type="submit" style={primaryBtn} disabled={lookupLoading}>
                  {lookupLoading ? 'Searching…' : 'Look Up Student →'}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2: FEE STATEMENT ── */}
          {step === STEPS.STATEMENT && data && (
            <div>
              {/* student card */}
              <div style={{ background: '#1e3a5f', color: '#fff', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: '#2e6da4', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20, fontWeight: 700,
                  }}>
                    {data.student.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{data.student.name}</div>
                    <div style={{ opacity: 0.75, fontSize: 13 }}>
                      {data.student.admissionNumber} &nbsp;·&nbsp; {data.student.grade}
                      {data.student.stream ? ` – ${data.student.stream}` : ''}
                    </div>
                  </div>
                </div>

                {/* summary row */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  {[
                    { label: 'Total Billed', value: fmt(data.summary.totalCharged) },
                    { label: 'Total Paid', value: fmt(data.summary.totalPaid) },
                    { label: 'Balance Due', value: fmt(data.summary.pendingAmount), highlight: data.summary.balance > 0 },
                  ].map((item) => (
                    <div key={item.label} style={{
                      flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 8,
                      padding: '10px 12px', textAlign: 'center',
                      border: item.highlight ? '1px solid rgba(255,200,100,0.6)' : 'none',
                    }}>
                      <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: item.highlight ? '#fbbf24' : '#fff' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* fee breakdown */}
                {data.feeStructure.length > 0 && (
                  <>
                    <SectionTitle>Fee Structure</SectionTitle>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Category</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.feeStructure.map((f, i) => (
                          <tr key={f.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={tdStyle}>{f.category}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(f.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {/* recent payments */}
                {data.payments.length > 0 && (
                  <>
                    <SectionTitle style={{ marginTop: 20 }}>Recent Payments</SectionTitle>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Date</th>
                          <th style={thStyle}>Method</th>
                          <th style={thStyle}>Reference</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                          <th style={thStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.slice(0, 10).map((p, i) => (
                          <tr key={p.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ ...tdStyle, fontSize: 12 }}>
                              {new Date(p.payment_date).toLocaleDateString('en-KE')}
                            </td>
                            <td style={{ ...tdStyle, textTransform: 'capitalize', fontSize: 12 }}>
                              {p.payment_method}
                            </td>
                            <td style={{ ...tdStyle, fontSize: 11, color: '#64748b' }}>
                              {p.mpesa_receipt_number || p.transaction_code || '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontSize: 12 }}>
                              {fmt(p.amount)}
                            </td>
                            <td style={tdStyle}>
                              <StatusBadge status={p.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {/* pay form */}
                {data.summary.balance > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <SectionTitle>Pay via M-Pesa</SectionTitle>
                    <form onSubmit={handlePay}>
                      <label style={labelStyle}>M-Pesa Phone Number</label>
                      <input
                        style={inputStyle}
                        placeholder="07XX XXX XXX"
                        value={payForm.phone}
                        onChange={(e) => setPayForm((f) => ({ ...f, phone: e.target.value }))}
                        required
                      />
                      <label style={{ ...labelStyle, marginTop: 12 }}>Amount (KES)</label>
                      <input
                        style={inputStyle}
                        type="number"
                        min="1"
                        step="1"
                        value={payForm.amount}
                        onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                        required
                      />
                      {payError && <div style={errorStyle}>{payError}</div>}
                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <button type="button" onClick={reset} style={ghostBtn}>← Back</button>
                        <button type="submit" style={{ ...primaryBtn, flex: 1 }} disabled={paying}>
                          {paying ? 'Sending prompt…' : `Pay ${fmt(payForm.amount || 0)} via M-Pesa`}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {data.summary.balance <= 0 && (
                  <div style={{
                    marginTop: 20, background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 8, padding: '14px 16px', color: '#15803d', fontSize: 14, textAlign: 'center',
                  }}>
                    ✅ All fees are fully paid. Thank you!
                  </div>
                )}

                {data.summary.balance > 0 && (
                  <button onClick={reset} style={{ ...ghostBtn, marginTop: 8, display: 'block', width: '100%', textAlign: 'center' }}>
                    Look up a different student
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: AWAITING PAYMENT ── */}
          {step === STEPS.PAYING && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
              <h2 style={{ margin: '0 0 8px', color: '#1e3a5f' }}>Check Your Phone</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
                An M-Pesa prompt has been sent to <strong>{payForm.phone}</strong>.
                Enter your PIN to complete the payment of <strong>{fmt(payForm.amount)}</strong>.
              </p>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, color: '#64748b', fontSize: 13,
              }}>
                <Spinner /> Waiting for confirmation…
              </div>

              <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
                This page will update automatically once payment is confirmed. Do not close it.
              </p>

              <button onClick={() => { clearInterval(pollRef.current); setStep(STEPS.STATEMENT); }}
                style={{ ...ghostBtn, marginTop: 24 }}>
                ← Cancel / Go Back
              </button>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === STEPS.SUCCESS && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: '#dcfce7', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 16px', fontSize: 36,
              }}>✅</div>
              <h2 style={{ margin: '0 0 8px', color: '#16a34a' }}>Payment Successful!</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 4 }}>
                Payment of <strong>{fmt(receipt?.amount)}</strong> received.
              </p>
              {receipt?.receiptNumber && (
                <p style={{ color: '#64748b', fontSize: 13 }}>
                  M-Pesa Receipt: <strong>{receipt.receiptNumber}</strong>
                </p>
              )}
              <p style={{ color: '#64748b', fontSize: 13 }}>
                Student: <strong>{data?.student?.name}</strong> ({data?.student?.admissionNumber})
              </p>
              <button onClick={reset} style={{ ...primaryBtn, marginTop: 24, display: 'inline-block' }}>
                Make Another Payment
              </button>
            </div>
          )}

        </div>
      </div>

      {/* footer */}
      <div style={{ textAlign: 'center', padding: '0 0 24px', color: '#94a3b8', fontSize: 12 }}>
        Secured M-Pesa payment &nbsp;·&nbsp; Contact the school if you need help
      </div>
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────
function SectionTitle({ children, style }) {
  return (
    <div style={{
      fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8, ...style,
    }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: { bg: '#dcfce7', color: '#16a34a', label: 'Paid' },
    pending:   { bg: '#fef9c3', color: '#ca8a04', label: 'Pending' },
    failed:    { bg: '#fee2e2', color: '#dc2626', label: 'Failed' },
  };
  const { bg, color, label } = map[status] || map.pending;
  return (
    <span style={{
      background: bg, color, fontSize: 10, fontWeight: 700,
      padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: '2px solid #e2e8f0', borderTopColor: '#1e3a5f',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

const inputStyle = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 14px',
  fontSize: 14, color: '#1e293b', outline: 'none',
  transition: 'border-color 0.2s',
};

const errorStyle = {
  background: '#fee2e2', color: '#dc2626', borderRadius: 8,
  padding: '10px 14px', fontSize: 13, marginTop: 10,
};

const primaryBtn = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  marginTop: 16, padding: '12px 20px', background: '#1e3a5f',
  color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
  fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
};

const ghostBtn = {
  padding: '10px 20px', background: 'transparent',
  color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const tableStyle = {
  width: '100%', borderCollapse: 'collapse', fontSize: 13,
};

const thStyle = {
  textAlign: 'left', fontWeight: 600, color: '#94a3b8',
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
  padding: '6px 8px', borderBottom: '1px solid #e2e8f0',
};

const tdStyle = {
  padding: '8px 8px', color: '#374151', verticalAlign: 'middle',
};
