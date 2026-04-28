import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Students', path: '/students' },
  { label: 'Fees', path: '/fees' },
  { label: 'Grades', path: '/grades' },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings' }
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className="hidden w-72 flex-col rounded-3xl bg-white p-6 shadow-soft lg:flex">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold text-slate-900">VINEYARD SMS</h1>
            <p className="mt-2 text-sm text-slate-500">School management system</p>
          </div>

          {user && (
            <div className="mb-8 rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">Logged in as:</p>
              <p className="mt-1 font-semibold text-slate-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="mt-1 text-xs text-slate-500 capitalize">{user.role?.replace('_', ' ')}</p>
            </div>
          )}

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
                end={item.path === '/'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={onLogout}
            className="mt-auto rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Log out
          </button>
        </aside>

        <main className="flex-1 rounded-3xl bg-white p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">School Management</h2>
              <p className="text-sm text-slate-500">Manage students, fees, grades and reports.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              🔴 Live Data
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
