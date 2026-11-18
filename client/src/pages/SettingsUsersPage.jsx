import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Check,
  Database,
  FileText,
  Link2,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  CardHeader,
  ProgressPillBar,
  RadialTickGauge,
} from '../components/BentoWidgets';
import { api } from '../services/api';

const EMPTY_USER = {
  name: 'Kasun Perera',
  email: 'kasun@ceylonspices.com',
  password: 'Password@123',
  role: 'STAFF',
};

export default function SettingsUsersPage() {
  const { user: currentUser } = useSelector((state) => state.auth);
  const isAdmin = currentUser?.role === 'ADMIN';
  const canEditPerms = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const [bundle, setBundle] = useState(null);
  const [jwtStatusOn, setJwtStatusOn] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER);

  useEffect(() => {
    api
      .get('/users')
      .then(({ data }) => setBundle(data))
      .catch(() => {});
  }, []);

  const handleTogglePerm = async (role, field) => {
    if (!canEditPerms) return;
    try {
      const { data } = await api.patch('/users/permissions', { role, field });
      setBundle((prev) => ({ ...prev, ...data }));
    } catch {
      // ignore
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm(EMPTY_USER);
    setShowUserModal(true);
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (editingUser) {
      const { data } = await api.put(`/users/${editingUser.userId}`, userForm);
      setBundle(data);
    } else {
      const { data } = await api.post('/users', userForm);
      setBundle(data);
    }
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId) => {
    if (!isAdmin) return;
    try {
      const { data } = await api.delete(`/users/${userId}`);
      setBundle(data);
    } catch {
      // ignore self-delete error
    }
  };

  const users = bundle?.users || [];
  const permissions = bundle?.permissions || [];
  const securityLogs = bundle?.securityLogs || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bims-card p-5">
            <CardHeader
              title="System Users & Roles"
              onAction={isAdmin ? openAddUser : undefined}
              actionLabel="Add User"
            />

            <div className="space-y-3">
              {users.map((u) => {
                const roleBadge =
                  u.role === 'ADMIN'
                    ? { label: 'Administrator', cls: 'bg-violet-600 text-white' }
                    : u.role === 'MANAGER'
                    ? { label: 'Manager', cls: 'bg-emerald-500 text-white' }
                    : { label: 'Staff', cls: 'bg-orange-500 text-white' };

                return (
                  <div key={u.userId} className="bims-subcard p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {u.name?.charAt(0) || 'U'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="font-semibold text-sm truncate">{u.name}</p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${roleBadge.cls}`}
                          >
                            {roleBadge.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Active Sessions: {u.sessions || 1}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-orange-400 font-medium mr-1">High Authority</span>
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditUser(u)}
                              title="Edit User"
                              className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {u.userId !== currentUser?.userId ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.userId)}
                                title="Delete User"
                                className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isAdmin ? (
                <button
                  type="button"
                  onClick={openAddUser}
                  className="w-full py-2.5 rounded-xl border border-dashed border-zinc-600/60 text-xs font-medium text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-colors cursor-pointer"
                >
                  + Add New User
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-[#6D28D9] via-[#7C3AED] to-[#6366F1] p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Add New User</span>
              <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </span>
            </div>

            <div className="my-5 flex flex-col items-center text-center">
              <Plus className="w-7 h-7 mb-2 text-white/90" />
              <h4 className="text-lg font-bold">Create a new member profile</h4>
              <p className="text-xs text-violet-100/85 mt-1">
                Quickly invite users to join as team members
              </p>
            </div>

            <button
              type="button"
              onClick={openAddUser}
              disabled={!isAdmin}
              className="w-full py-2.5 rounded-full bg-white text-zinc-950 disabled:opacity-60 font-semibold text-xs hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              {isAdmin ? 'Quick Add' : 'Admin Only'}
            </button>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">Overall Progress</h3>
            <div className="space-y-3">
              {(bundle?.overallProgress || []).map((row) => (
                <ProgressPillBar
                  key={row.label}
                  label={row.label}
                  percent={row.percent}
                  rightLabel={`${row.percent}%`}
                  tone={row.tone}
                />
              ))}
            </div>
          </div>

          <div className="bims-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold tracking-tight">
                RBAC Module Permissions
              </h3>
              <span className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center text-zinc-400">
                <FileText className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-4 text-xs text-zinc-400 pb-2 border-b border-zinc-800/40">
              <span>Role</span>
              <span className="text-center">Inventory</span>
              <span className="text-center">Trade Docs</span>
              <span className="text-center">Finance</span>
            </div>

            <div className="divide-y divide-zinc-800/40 text-xs">
              {permissions.map((row) => (
                <div key={row.role} className="py-3.5 space-y-2.5">
                  <div className="grid grid-cols-4 items-center gap-2">
                    <span className="font-semibold">{row.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-semibold text-center">
                      {row.inventory}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-white text-[10px] font-semibold text-center ${
                        row.tradeDocs === 'Edit & View' ? 'bg-violet-600' : 'bg-orange-500'
                      }`}
                    >
                      {row.tradeDocs}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold text-center ${
                        row.finance !== 'Restricted'
                          ? 'bg-orange-500 text-white'
                          : 'bims-subcard text-zinc-400'
                      }`}
                    >
                      {row.finance}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2 pt-1">
                    <span className="text-zinc-400 flex items-center">
                      <User className="w-3.5 h-3.5" />
                    </span>

                    <div className="flex justify-center">
                      {row.role === 'ADMIN' ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePerm(row.role, 'inventoryEnabled')}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                            row.inventoryEnabled ? 'bg-emerald-500' : 'bg-zinc-600'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                              row.inventoryEnabled ? 'translate-x-4' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <Check className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>

                    <div className="flex justify-center">
                      {row.role === 'ADMIN' ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePerm(row.role, 'tradeDocsEnabled')}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                            row.tradeDocsEnabled ? 'bg-violet-600' : 'bg-zinc-600'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                              row.tradeDocsEnabled ? 'translate-x-4' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <Check className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>

                    <div className="flex justify-center">
                      <Check className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-2">
              JWT Security &amp; Audit Logs
            </h3>

            <RadialTickGauge
              topCaption="Secure"
              valueText="94%"
              subText="encrypted"
              percent={94}
              accent="violet"
            />

            <div className="mt-3 space-y-1.5 text-xs">
              <p className="font-semibold">Security Info:</p>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">
                  Token Life: <strong className="text-orange-400">8 hours</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-semibold">
                  Status
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">
                  Token Life: <strong className="text-emerald-400">8 hours</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                  Processing
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/40 space-y-3 text-xs">
              {securityLogs.slice(0, 3).map((log, i) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                      i === 0 ? 'bg-violet-500 ring-4 ring-violet-500/20' : 'bg-zinc-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium leading-snug">
                      {log.text} - <span className="text-zinc-400">{log.time}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bims-card p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Link2 className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="font-semibold">JWT/System Status</p>
                <p className="text-zinc-400">
                  Status: <span className="text-emerald-400 font-medium">Indicated</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setJwtStatusOn((p) => !p)}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                jwtStatusOn ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  jwtStatusOn ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <div className="bims-card p-4 space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">Cloud Database &amp; Media Storage</p>
                <p className="text-zinc-400">
                  DB:{' '}
                  <span
                    className={
                      bundle?.infrastructure?.databaseConnected
                        ? 'text-emerald-400 font-medium'
                        : 'text-amber-400 font-medium'
                    }
                  >
                    {bundle?.infrastructure?.databaseProvider || 'Checking...'}
                  </span>
                </p>
                <p className="text-zinc-400">
                  Media:{' '}
                  <span
                    className={
                      bundle?.infrastructure?.cloudinaryConfigured
                        ? 'text-emerald-400 font-medium'
                        : 'text-amber-400 font-medium'
                    }
                  >
                    {bundle?.infrastructure?.mediaProvider || 'Checking...'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {showUserModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingUser ? 'Edit Team User Account' : 'Create Team User Account'}
              </h3>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium">Full Name</label>
                <input
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  >
                    <option value="ADMIN" className="bg-zinc-900 text-white">
                      Administrator
                    </option>
                    <option value="MANAGER" className="bg-zinc-900 text-white">
                      Manager
                    </option>
                    <option value="STAFF" className="bg-zinc-900 text-white">
                      Staff
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">
                    Password {editingUser ? '(optional)' : ''}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-2 cursor-pointer"
              >
                {editingUser ? 'Save Changes' : 'Create User Profile'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
