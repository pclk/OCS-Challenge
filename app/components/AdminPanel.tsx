'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface PendingUser {
  id: number;
  name: string;
  wing: string | null;
  createdAt: string;
}

interface Report {
  id: string;
  name: string;
  wing: string;
  password?: string;
  email?: string;
  phone?: string;
  notes?: string;
  timestamp: number;
}

interface User {
  id: number;
  name: string;
  wing: string | null;
  approved: boolean;
  pendingApproval: boolean;
  createdAt: string | Date;
}

interface AccountAction {
  id: number;
  userId: number | null;
  userName: string | null;
  userWing: string | null;
  action: string;
  details: any;
  createdAt: string | Date;
}

export default function AdminPanel() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [accountActions, setAccountActions] = useState<AccountAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', wing: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', wing: '', password: '', approved: false });

  useEffect(() => {
    // Check if admin is already authenticated
    const storedToken = localStorage.getItem('ocs_admin_token');
    if (storedToken) {
      setAdminToken(storedToken);
      setIsAuthenticated(true);
      fetchData(storedToken);
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store admin token (using password as token for simplicity)
        localStorage.setItem('ocs_admin_token', password);
        setAdminToken(password);
        setIsAuthenticated(true);
        setPassword('');
        toast.success('Admin access granted');
        fetchData(password);
      } else {
        toast.error(data.error || 'Invalid admin password');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (token: string) => {
    const headers = {
      'Authorization': `Bearer ${token}`,
    };

    // Fetch pending approvals
    try {
      const approvalsResponse = await fetch('/api/admin/pending-approvals', { headers });
      if (approvalsResponse.ok) {
        const approvalsData = await approvalsResponse.json();
        setPendingUsers(approvalsData.users || []);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }

    // Fetch reports
    try {
      const reportsResponse = await fetch('/api/admin/reports', { headers });
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }

    // Fetch all users
    try {
      const usersResponse = await fetch('/api/admin/users', { headers });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setAllUsers(usersData.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }

    // Fetch account actions
    try {
      const actionsResponse = await fetch('/api/admin/account-actions?limit=100', { headers });
      if (actionsResponse.ok) {
        const actionsData = await actionsResponse.json();
        setAccountActions(actionsData.actions || []);
      }
    } catch (error) {
      console.error('Error fetching account actions:', error);
    }
  };

  const handleApprove = async (userId: number) => {
    if (!adminToken) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('User approved successfully');
        // Refresh pending users
        fetchData(adminToken);
      } else {
        toast.error(data.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (userId: number) => {
    if (!adminToken) return;

    if (!confirm('Are you sure you want to reject and delete this user?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/reject-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('User rejected and deleted');
        // Refresh data
        fetchData(adminToken);
      } else {
        toast.error(data.error || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: createForm.name,
          wing: createForm.wing || null,
          password: createForm.password || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('User created successfully');
        setShowCreateUser(false);
        setCreateForm({ name: '', wing: '', password: '' });
        fetchData(adminToken);
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingUser) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editForm.name,
          wing: editForm.wing || null,
          password: editForm.password || undefined,
          approved: editForm.approved,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('User updated successfully');
        setEditingUser(null);
        setEditForm({ name: '', wing: '', password: '', approved: false });
        fetchData(adminToken);
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!adminToken) return;

    if (!confirm('Are you sure you want to delete this user? This will also delete all their scores.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('User deleted successfully');
        fetchData(adminToken);
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      wing: user.wing || '',
      password: '',
      approved: user.approved,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('ocs_admin_token');
    setAdminToken(null);
    setIsAuthenticated(false);
    setPendingUsers([]);
    setReports([]);
    toast.success('Logged out');
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-black border border-white/20 rounded-lg shadow-md mb-6">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Admin Login</h2>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-white mb-1">
                Admin Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                placeholder="Enter admin password"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
        <button
          onClick={handleLogout}
          className="bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Pending Approvals */}
      <div className="bg-black border border-white/20 rounded-lg shadow-md">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Pending User Approvals</h3>
          {pendingUsers.length === 0 ? (
            <p className="text-white/70">No pending approvals</p>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="border border-white/20 rounded-md p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-semibold">{user.name}</p>
                    <p className="text-white/70 text-sm">Wing: {user.wing || 'N/A'}</p>
                    <p className="text-white/50 text-xs">
                      Requested: {new Date(user.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={loading}
                      className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={loading}
                      className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Users Management */}
      <div className="bg-black border border-white/20 rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">All Users</h3>
            <button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 transition-colors"
            >
              {showCreateUser ? 'Cancel' : '+ Create User'}
            </button>
          </div>

          {showCreateUser && (
            <form onSubmit={handleCreateUser} className="mb-6 p-4 border border-white/20 rounded-md space-y-4">
              <h4 className="text-lg font-semibold text-white">Create New User</h4>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Wing</label>
                <input
                  type="text"
                  value={createForm.wing}
                  onChange={(e) => setCreateForm({ ...createForm, wing: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Password (optional)</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Create User
              </button>
            </form>
          )}

          {editingUser && (
            <form onSubmit={handleUpdateUser} className="mb-6 p-4 border border-white/20 rounded-md space-y-4">
              <h4 className="text-lg font-semibold text-white">Edit User</h4>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Wing</label>
                <input
                  type="text"
                  value={editForm.wing}
                  onChange={(e) => setEditForm({ ...editForm, wing: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">New Password (leave empty to keep current)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="approved"
                  checked={editForm.approved}
                  onChange={(e) => setEditForm({ ...editForm, approved: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="approved" className="text-white">Approved</label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Update User
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {allUsers.length === 0 ? (
            <p className="text-white/70">No users found</p>
          ) : (
            <div className="space-y-4">
              {allUsers.map((user) => (
                <div
                  key={user.id}
                  className="border border-white/20 rounded-md p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{user.name}</p>
                      <p className="text-white/70 text-sm">Wing: {user.wing || 'N/A'}</p>
                      <p className="text-white/50 text-xs">
                        Created: {new Date(user.createdAt).toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${user.approved ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'}`}>
                          {user.approved ? 'Approved' : user.pendingApproval ? 'Pending' : 'Not Approved'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(user)}
                        disabled={loading || editingUser?.id === user.id}
                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={loading}
                        className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account Actions Audit Log */}
      <div className="bg-black border border-white/20 rounded-lg shadow-md">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Account Actions Audit Log</h3>
          {accountActions.length === 0 ? (
            <p className="text-white/70">No account actions recorded</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {accountActions.map((action) => (
                <div
                  key={action.id}
                  className="border border-white/20 rounded-md p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold">
                          {action.userName || 'Unknown User'}
                        </span>
                        {action.userWing && (
                          <span className="text-white/70 text-sm">({action.userWing})</span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${
                          action.action === 'login' ? 'bg-green-600/20 text-green-400' :
                          action.action === 'logout' ? 'bg-blue-600/20 text-blue-400' :
                          action.action === 'account_deleted' ? 'bg-red-600/20 text-red-400' :
                          action.action === 'password_changed' ? 'bg-purple-600/20 text-purple-400' :
                          'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {action.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      {action.details && typeof action.details === 'object' && (
                        <p className="text-white/50 text-xs mt-1">
                          {JSON.stringify(action.details)}
                        </p>
                      )}
                      <p className="text-white/50 text-xs mt-2">
                        {new Date(action.createdAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reports */}
      <div className="bg-black border border-white/20 rounded-lg shadow-md">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Account Existence Reports</h3>
          {reports.length === 0 ? (
            <p className="text-white/70">No reports</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border border-white/20 rounded-md p-4"
                >
                  <p className="text-white font-semibold">{report.name}</p>
                  <p className="text-white/70 text-sm">Wing: {report.wing}</p>
                  {report.email && (
                    <p className="text-white/70 text-sm">Email: {report.email}</p>
                  )}
                  {report.phone && (
                    <p className="text-white/70 text-sm">Phone: {report.phone}</p>
                  )}
                  {report.notes && (
                    <p className="text-white/70 text-sm mt-2">Notes: {report.notes}</p>
                  )}
                  <p className="text-white/50 text-xs mt-2">
                    Reported: {new Date(report.timestamp).toLocaleString()}
                  </p>
                  {report.password && (
                    <p className="text-white/50 text-xs mt-1">
                      Password provided (hidden for security)
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

