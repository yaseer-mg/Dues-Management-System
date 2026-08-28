import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', roles: ['Central Management', 'Zone Management', 'Unit Management', 'Sub-Unit Management', 'Collector'] },
  { label: 'Zones', to: '/zones', roles: ['Central Management'] },
  { label: 'Units', to: '/units', roles: ['Central Management'] },
  { label: 'Sub-Units', to: '/sub-units', roles: ['Central Management'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="bg-emerald-700 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          <div className="font-bold text-xl text-white">Dues Manager</div>
          <nav className="flex gap-1 flex-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-emerald-700'
                      : 'text-emerald-100 hover:bg-emerald-600'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-semibold text-white">{user?.name}</div>
              <div className="text-xs bg-emerald-600 text-emerald-50 px-2 py-0.5 rounded-full inline-block">
                {user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-emerald-400 text-white rounded-lg hover:bg-emerald-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}