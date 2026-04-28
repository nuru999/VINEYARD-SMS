import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-900">School profile</h3>
          <p className="mt-3 text-sm text-slate-500">Current school information from your account session.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">School name</label>
              <input type="text" className="w-full" value={user?.schoolName || user?.school_name || '-'} readOnly />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">School ID</label>
              <input type="text" className="w-full" value={user?.schoolId || user?.school_id || '-'} readOnly />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-900">User settings</h3>
          <p className="mt-3 text-sm text-slate-500">Current authenticated user information.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Admin email</label>
              <input type="email" className="w-full" value={user?.email || '-'} readOnly />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
              <input type="text" className="w-full" value={user?.role || '-'} readOnly />
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
