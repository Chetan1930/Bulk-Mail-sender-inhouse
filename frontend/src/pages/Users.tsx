import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users as UsersIcon } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

type CreateForm = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager';
};

const emptyCreate: CreateForm = {
  name: '',
  email: '',
  password: '',
  role: 'manager',
};

export default function Users() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [creating, setCreating] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setError('');
      setUsers(await api.getUsers());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      await api.createUser(createForm);
      setCreateForm(emptyCreate);
      setSuccess('User created.');
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    setBusyId(user.id);
    setError('');
    setSuccess('');
    try {
      await api.updateUser(user.id, { active: user.active === false });
      setSuccess(user.active === false ? 'User activated.' : 'User deactivated.');
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (user: User, role: 'admin' | 'manager') => {
    if (role === user.role) return;
    setBusyId(user.id);
    setError('');
    setSuccess('');
    try {
      await api.updateUser(user.id, { role });
      setSuccess('Role updated.');
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (resetPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setBusyId(userId);
    setError('');
    setSuccess('');
    try {
      await api.updateUser(userId, { password: resetPassword });
      setResetPasswordId(null);
      setResetPassword('');
      setSuccess('Password updated.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleResetTotp = async (user: User) => {
    if (!window.confirm(`Reset 2FA for ${user.email}? They will need to set it up again.`)) {
      return;
    }
    setBusyId(user.id);
    setError('');
    setSuccess('');
    try {
      await api.updateUser(user.id, { resetTotp: true });
      setSuccess('2FA reset.');
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Create and manage logins. Everyone shares the server SendGrid key."
      />

      {error && <p className="alert-error">{error}</p>}
      {success && <p className="alert-success">{success}</p>}

      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Create user</h2>
        </div>
        <form onSubmit={handleCreate} className="card-body grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="userName">Name</label>
            <input
              id="userName"
              className="input"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="userEmail">Email</label>
            <input
              id="userEmail"
              type="email"
              className="input"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="userPassword">Password</label>
            <input
              id="userPassword"
              type="password"
              className="input"
              required
              minLength={6}
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="userRole">Role</label>
            <select
              id="userRole"
              className="input"
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, role: e.target.value as 'admin' | 'manager' }))
              }
            >
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">All users</h2>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="p-6 space-y-2">
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>2FA</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const inactive = user.active === false;
                  return (
                    <tr key={user.id}>
                      <td className="font-medium text-slate-700 dark:text-slate-200">{user.name}</td>
                      <td className="text-slate-500">{user.email}</td>
                      <td>
                        <select
                          className="input py-1 text-xs w-auto min-w-[7rem]"
                          value={user.role}
                          disabled={busyId === user.id}
                          onChange={(e) =>
                            handleRoleChange(user, e.target.value as 'admin' | 'manager')
                          }
                        >
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className={inactive ? 'badge-danger' : 'badge-success'}>
                          {inactive ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <span className={user.totpEnabled ? 'badge-success' : 'badge-gray'}>
                          {user.totpEnabled ? 'On' : 'Off'}
                        </span>
                      </td>
                      <td className="text-slate-500 whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-right space-y-2">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="btn-secondary text-xs py-1"
                            disabled={busyId === user.id || isSelf}
                            onClick={() => handleToggleActive(user)}
                            title={isSelf ? 'You cannot deactivate yourself' : undefined}
                          >
                            {inactive ? 'Activate' : 'Deactivate'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-xs py-1"
                            disabled={busyId === user.id}
                            onClick={() => {
                              setResetPasswordId(resetPasswordId === user.id ? null : user.id);
                              setResetPassword('');
                            }}
                          >
                            Reset password
                          </button>
                          {user.totpEnabled && (
                            <button
                              type="button"
                              className="btn-secondary text-xs py-1"
                              disabled={busyId === user.id}
                              onClick={() => handleResetTotp(user)}
                            >
                              Reset 2FA
                            </button>
                          )}
                        </div>
                        {resetPasswordId === user.id && (
                          <div className="flex flex-wrap justify-end gap-2 items-center">
                            <input
                              type="password"
                              className="input py-1 text-xs w-40"
                              placeholder="New password"
                              minLength={6}
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn-primary text-xs py-1"
                              disabled={busyId === user.id}
                              onClick={() => handleResetPassword(user.id)}
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
