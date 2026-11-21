import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Globe, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { logout } from '../features/auth/authSlice';
import { toggleTheme } from '../features/theme/themeSlice';
import AiChatbotWidget from './AiChatbotWidget';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { to: '/inventory', label: 'Inventory', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { to: '/transactions', label: 'Shipments', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { to: '/suppliers', label: 'Suppliers', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { to: '/customers', label: 'Customers', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { to: '/documents', label: 'Documents', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { to: '/reports', label: 'Reports', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { to: '/users', label: 'Settings', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
];

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) =>
    user?.role ? item.roles.includes(user.role) : true
  );

  const handleLogout = () => {
    dispatch(logout());
    navigate('/welcome');
  };

  const roleLabel =
    user?.role === 'ADMIN'
      ? 'Administrator'
      : user?.role === 'MANAGER'
      ? 'Manager'
      : 'Staff';

  return (
    <div className="min-h-screen transition-colors pb-16">
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-card)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/welcome" className="flex items-center gap-3" title="View Landing Homepage">
            <img
              src="/images/logo-icon.png"
              alt="Ceylon Spices BIMS Logo"
              className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 border border-amber-500/30 shadow-sm shrink-0"
            />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Ceylon Spices</p>
              <p className="text-[11px] text-zinc-400 font-medium">BIMS</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-full bims-subcard p-1">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-zinc-950 shadow-sm dark:bg-white dark:text-zinc-950'
                      : 'text-zinc-500 dark:text-zinc-300 hover:text-violet-500 dark:hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/welcome"
              title="Landing Homepage"
              className="hidden xl:flex h-9 px-3 rounded-full bims-subcard items-center gap-1.5 text-xs text-zinc-400 hover:text-violet-400"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>

            <button
              type="button"
              onClick={() => dispatch(toggleTheme())}
              aria-label="Toggle Light/Dark Theme"
              title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Theme`}
              className="h-9 px-3 rounded-full bims-subcard flex items-center gap-1.5 text-xs font-medium hover:border-violet-500/50 transition-colors cursor-pointer"
            >
              {mode === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-violet-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 rounded-full bims-subcard pl-1.5 pr-3 py-1">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-violet-600 text-[11px] font-bold flex items-center justify-center text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'M'}
              </span>
              <span className="text-xs font-medium">{roleLabel}</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Notifications"
                className="w-9 h-9 rounded-full bims-subcard flex items-center justify-center relative hover:border-violet-500/50 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-orange-500" />
              </button>

              {notifOpen ? (
                <div className="absolute right-0 mt-2 w-72 bims-card p-3 z-40 text-xs space-y-2">
                  <p className="font-semibold text-amber-500">System Alerts</p>
                  <div className="p-2 rounded-lg bims-subcard">
                    <p className="font-medium">Low Stock: Organic Black Pepper &amp; Turmeric</p>
                    <p className="text-zinc-400 mt-0.5">Below reorder threshold</p>
                  </div>
                  <div className="p-2 rounded-lg bims-subcard">
                    <p className="font-medium">Shipment EXP-2026-0001</p>
                    <p className="text-zinc-400 mt-0.5">Ceylon Cinnamon in transit to USA ($48.5K)</p>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="w-9 h-9 rounded-full bims-subcard flex items-center justify-center hover:text-rose-500 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Toggle Menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden w-9 h-9 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav className="lg:hidden border-t border-zinc-800/40 px-4 py-3 flex flex-wrap gap-2">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-violet-600 text-white' : 'bims-subcard'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      <AiChatbotWidget />
    </div>
  );
}
