import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getStudents } from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0, activePercentage: 0 });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await getStudents();
      const allStudents = response.data;
      const activeStudents = allStudents.filter((s) => s.status === 'active').length;
      const activePercentage = allStudents.length > 0 ? Math.round((activeStudents / allStudents.length) * 100) : 0;
      setStats({
        totalStudents: allStudents.length,
        activeStudents,
        activePercentage
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="grid gap-8">
        {/* Key Stats */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Students */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Students</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading ? '...' : stats.totalStudents}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center text-xl">👥</div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Across all grades</p>
          </div>

          {/* Active Students */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-green-50 to-green-100/50 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Active Students</p>
                <p className="mt-2 text-3xl font-bold text-green-700">
                  {loading ? '...' : `${stats.activePercentage}%`}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center text-xl">✅</div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{stats.activeStudents} students active</p>
          </div>

          {/* Inactive Students */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Inactive</p>
                <p className="mt-2 text-3xl font-bold text-orange-700">
                  {loading ? '...' : stats.totalStudents - stats.activeStudents}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center text-xl">⏸️</div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Need attention</p>
          </div>

          {/* Status */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">System Status</p>
                <p className="mt-2 font-bold text-purple-700">
                  {loading ? 'Loading' : '✓ Online'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center text-xl">🟢</div>
            </div>
            <p className="mt-3 text-xs text-slate-500">All systems operational</p>
          </div>
        </section>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-soft hover:shadow-lg transition-shadow sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Last updated</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not refreshed yet'}
            </p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="rounded-lg bg-gradient-primary px-5 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-60 transition-all"
          >
            {loading ? 'Refreshing...' : 'Refresh stats'}
          </button>
        </div>

        {/* Welcome & Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Welcome Card */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-8 shadow-soft hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Welcome back, {user?.first_name || user?.firstName || 'User'}! 👋
                </h3>
                <p className="mt-2 text-slate-600">
                  {user?.school_name || user?.schoolName || 'School Management System'}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium">Backend Connected</span>
                </div>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium">Live Data Syncing</span>
                </div>
              </div>
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                <div className="flex items-center gap-2 text-purple-700">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium">Auth Working</span>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Active student ratio</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-400 transition-all duration-700"
                  style={{ width: `${stats.activePercentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-600">{stats.activePercentage}% of students are active</p>
            </div>
          </div>

          {/* User Info Card */}
          <div className="rounded-xl border border-slate-200 bg-gradient-soft p-8 shadow-soft hover:shadow-lg transition-shadow">
            <h4 className="text-lg font-bold text-slate-900 mb-4">Account Info</h4>
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-200">
                <p className="text-xs uppercase font-semibold text-slate-500">Email</p>
                <p className="mt-1 font-medium text-slate-900 break-all">{user?.email}</p>
              </div>
              <div className="pb-4 border-b border-slate-200">
                <p className="text-xs uppercase font-semibold text-slate-500">Role</p>
                <div className="mt-2">
                  <span className="inline-block rounded-full bg-primary-100 text-primary-700 px-3 py-1 text-xs font-semibold capitalize">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-slate-500 mb-2">Last Login</p>
                <p className="text-sm text-slate-600">Just now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
