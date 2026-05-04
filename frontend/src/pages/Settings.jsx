import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings ⚙️</h2>
          <p className="mt-1 text-gray-600">Manage your school profile and account settings</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* School Profile */}
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <img
                src={user?.school_logo || '/vineyard-school.png'}
                alt="School logo"
                className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
              />
              <div>
                <h3 className="text-xl font-bold text-gray-900">School Profile</h3>
                <p className="text-sm text-gray-500">Logo is loaded from your school profile.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">Current school information from your account session.</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">School name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 cursor-not-allowed"
                  value={user?.school_name || '-'}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">School ID</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 cursor-not-allowed"
                  value={user?.school_id || '-'}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* User Settings */}
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">User Settings</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Current authenticated user information.</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">User email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 cursor-not-allowed"
                  value={user?.email || '-'}
                  readOnly
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Role</label>
                <div className="mt-2">
                  <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-4 py-2 text-sm font-semibold capitalize">
                    {user?.role?.replace('_', ' ') || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">System Information</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white border border-gray-200 p-4">
              <p className="text-xs uppercase font-semibold text-gray-500">Status</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">🟢 Active</p>
            </div>
            <div className="rounded-lg bg-white border border-gray-200 p-4">
              <p className="text-xs uppercase font-semibold text-gray-500">Database</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">✓ Connected</p>
            </div>
            <div className="rounded-lg bg-white border border-gray-200 p-4">
              <p className="text-xs uppercase font-semibold text-gray-500">API</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">✓ Online</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}