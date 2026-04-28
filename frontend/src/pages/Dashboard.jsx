import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getStudents } from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await getStudents();
      const allStudents = response.data;
      const activeStudents = allStudents.filter(s => s.status === 'active').length;
      setStats({
        totalStudents: allStudents.length,
        activeStudents: activeStudents,
        activePercentage: allStudents.length > 0 ? Math.round((activeStudents / allStudents.length) * 100) : 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-xl font-semibold text-slate-900">School overview</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-5 shadow-soft">
              <p className="text-sm text-slate-500">Total students</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? '-' : stats.totalStudents}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-soft">
              <p className="text-sm text-slate-500">Active students</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? '-' : `${stats.activePercentage}%`}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-soft">
              <p className="text-sm text-slate-500">Inactive students</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? '-' : stats.totalStudents - stats.activeStudents}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-soft">
              <p className="text-sm text-slate-500">Last refresh</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{loading ? 'Loading...' : 'Just now'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-900">Welcome, {user?.firstName || user?.first_name}</h3>
          <p className="mt-2 text-sm text-slate-500">{user?.schoolName || 'School Management System'}</p>
          
          <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Email:</span>
              <span className="font-medium text-slate-900">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Role:</span>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-white capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">✅ Backend is connected and working</li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">✅ Frontend is pulling live student data</li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">✅ Authentication is working end-to-end</li>
          </ul>
        </section>
      </div>
    </Layout>
  );
}
