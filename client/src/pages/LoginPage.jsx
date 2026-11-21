import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Moon, Sun } from 'lucide-react';
import { clearAuthError, loginUser } from '../features/auth/authSlice';
import { toggleTheme } from '../features/theme/themeSlice';

const DEMO_ACCOUNTS = [
  { role: 'ADMIN', label: 'Administrator (M. L. Umaima)', email: 'admin@ceylonspices.com' },
  { role: 'MANAGER', label: 'Manager (Sarah Smith)', email: 'manager@ceylonspices.com' },
  { role: 'STAFF', label: 'Staff (John Doe)', email: 'staff@ceylonspices.com' },
];

export default function LoginPage() {
  const dispatch = useDispatch();
  const { token, user, status, error } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const [email, setEmail] = useState('admin@ceylonspices.com');
  const [password, setPassword] = useState('Password@123');
  const [selectedRole, setSelectedRole] = useState('ADMIN');

  if (token && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setSelectedRole(role);
    const match = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (match) {
      setEmail(match.email);
      setPassword('Password@123');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative">
      <div className="w-full max-w-md flex items-center justify-between mb-4 px-1">
        <Link
          to="/welcome"
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-violet-400"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Landing Homepage</span>
        </Link>

        <button
          type="button"
          onClick={() => dispatch(toggleTheme())}
          className="h-9 px-3.5 rounded-full bims-card flex items-center gap-1.5 text-xs font-medium cursor-pointer"
        >
          {mode === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-violet-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full max-w-md bims-card p-7 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/logo-icon.png"
              alt="Ceylon Spices BIMS Logo"
              className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 border border-amber-500/30 shadow-sm shrink-0"
            />
            <span className="text-xs font-semibold text-zinc-400">BIMS Login Portal</span>
          </div>
          <span className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center text-zinc-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="flex justify-center mb-5">
          <img
            src="/images/logo-full.png"
            alt="Ceylon Spices BIMS — Business Inventory Management System"
            className="h-28 w-auto rounded-2xl bg-white px-4 py-2 border border-zinc-200/80 shadow-sm object-contain"
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-6 text-center">Sign In to BIMS</h1>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error ? (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs text-rose-400">
              {error}
            </div>
          ) : null}

          <div>
            <input
              id="email"
              type="email"
              required
              aria-label="Email Address"
              value={email}
              onChange={(e) => {
                if (error) dispatch(clearAuthError());
                setEmail(e.target.value);
              }}
              placeholder="Email Address"
              className="w-full rounded-full bims-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              required
              aria-label="Password"
              value={password}
              onChange={(e) => {
                if (error) dispatch(clearAuthError());
                setPassword(e.target.value);
              }}
              placeholder="Password (••••••••)"
              className="w-full rounded-full bims-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <select
              aria-label="Select Role"
              value={selectedRole}
              onChange={handleRoleChange}
              className="w-full rounded-full bims-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              {DEMO_ACCOUNTS.map((acc) => (
                <option key={acc.role} value={acc.role} className="bg-zinc-900 text-white">
                  {acc.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 text-white font-semibold py-3 text-sm transition-all shadow-lg shadow-violet-600/25 cursor-pointer mt-2"
          >
            {status === 'loading' ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-1.5 text-xs text-zinc-400">
          <p>Default Password: Password@123</p>
          <p className="hover:text-violet-400 cursor-pointer">Contact Administrator</p>
        </div>
      </div>
    </div>
  );
}
