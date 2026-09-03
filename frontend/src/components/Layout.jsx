import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', roles: ['Central Management', 'Zone Management', 'Unit Management', 'Sub-Unit Management', 'Collector'] },
  { label: 'Members', to: '/members', roles: ['Central Management', 'Zone Management', 'Unit Management', 'Sub-Unit Management', 'Collector'] },
  { label: 'Collect Cash', to: '/collect', roles: ['Collector'] },
  { label: 'Periods', to: '/periods', roles: ['Central Management'] },
  { label: 'Zones', to: '/zones', roles: ['Central Management'] },
  { label: 'Units', to: '/units', roles: ['Central Management'] },
  { label: 'Sub-Units', to: '/sub-units', roles: ['Central Management'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const navLinkCls = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition text-center ${
      isActive ? 'bg-white text-emerald-700' : 'text-emerald-100 hover:bg-emerald-600'
    }`;

  return (
    <div className="min-h-screen bg-emerald-50">
      {/* Top bar */}
      <header className="bg-emerald-700 text-white shadow sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-emerald-600 transition"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="font-bold text-xl text-white">Dues Manager</div>
          </div>

          {/* Nav (desktop) */}
          <nav className="hidden md:flex gap-1 flex-1 justify-center">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkCls}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User area: details hidden on small screens */}
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden sm:block text-right">
              <div className="font-semibold text-white leading-tight">{user?.name}</div>
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

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-emerald-700 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={closeMenu} className={navLinkCls}>
                {item.label}
              </NavLink>
            ))}
            <div className="sm:hidden text-center text-emerald-100 text-xs mt-2">
              {user?.name} · {user?.role}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}