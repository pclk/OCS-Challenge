'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DeleteExerciseModal from './DeleteExerciseModal';
import DeleteUserModal from './DeleteUserModal';
import EditUserModal from './EditUserModal';
import CreateUserModal from './CreateUserModal';
import NominalRollHelpModal from './NominalRollHelpModal';
import NominalRollUploadModal from './NominalRollUploadModal';
import ReportTypesHelpModal from './ReportTypesHelpModal';

interface User {
  id: number;
  name: string;
  wing: string | null;
  hasLoggedIn?: boolean;
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

interface Exercise {
  id: number;
  name: string;
  type: 'rep';
}

type AdminLevel = 'OCS' | 'WING' | null;

export default function AdminPanel() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel>(null);
  const [adminWing, setAdminWing] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // User management
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', wing: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', wing: '', password: '' });

  // Exercise management (OCS only)
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({ name: '' });
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

  // Account logs (OCS only)
  const [accountActions, setAccountActions] = useState<AccountAction[]>([]);
  const [actionsPage, setActionsPage] = useState(1);
  const [actionsTotalPages, setActionsTotalPages] = useState(1);

  // Wing admin features
  const [reports, setReports] = useState<Array<{ id: string; name: string; wing: string; password?: string; type?: 'ACCOUNT_CONFLICT' | 'NEW_ACCOUNT_REQUEST'; email?: string; phone?: string; notes?: string; timestamp: number }>>([]);
  const [showNominalRollHelp, setShowNominalRollHelp] = useState(false);
  const [showNominalRollUpload, setShowNominalRollUpload] = useState(false);
  const [showReportTypesHelp, setShowReportTypesHelp] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('ocs_admin_token');
    const storedLevel = localStorage.getItem('ocs_admin_level') as AdminLevel;
    const storedWing = localStorage.getItem('ocs_admin_wing');
    if (storedToken && storedLevel) {
      setAdminToken(storedToken);
      setAdminLevel(storedLevel);
      setAdminWing(storedWing);
      setIsAuthenticated(true);
      fetchData(storedToken, storedLevel);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && adminToken && adminLevel) {
      fetchUsers(adminToken, userPage, userSearch);
      if (adminLevel === 'OCS') {
        fetchExercises(adminToken);
        fetchAccountActions(adminToken, actionsPage);
      }
      if (adminLevel === 'WING') {
        fetchReports(adminToken);
      }
    }
  }, [isAuthenticated, adminToken, adminLevel, userPage, userSearch, actionsPage]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.adminLevel) {
        localStorage.setItem('ocs_admin_token', password);
        localStorage.setItem('ocs_admin_level', data.adminLevel);
        if (data.wing) {
          localStorage.setItem('ocs_admin_wing', data.wing);
          setAdminWing(data.wing);
        }
        setAdminToken(password);
        setAdminLevel(data.adminLevel);
        setIsAuthenticated(true);
        setPassword('');
        toast.success(`${data.adminLevel} admin access granted${data.wing ? ` - ${data.wing}` : ''}`);
        fetchData(password, data.adminLevel);
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

  const fetchData = async (token: string, level: AdminLevel) => {
    fetchUsers(token, 1, '');
    if (level === 'OCS') {
      fetchExercises(token);
      fetchAccountActions(token, 1);
    }
    if (level === 'WING') {
      fetchReports(token);
    }
  };

  const fetchUsers = async (token: string, page: number, search: string) => {
    const headers = { 'Authorization': `Bearer ${token}` };
    const params = new URLSearchParams({ page: page.toString(), limit: '10' });
    if (search) params.append('search', search);
    // Wing is automatically filtered by the API based on admin's wing

    try {
      const response = await fetch(`/api/admin/users?${params}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
        setUserTotalPages(data.pagination?.totalPages || 1);
        setUserTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchExercises = async (token: string) => {
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const response = await fetch('/api/admin/exercises', { headers });
      if (response.ok) {
        const data = await response.json();
        setExercises(data.exercises || []);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const fetchAccountActions = async (token: string, page: number) => {
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const response = await fetch(`/api/admin/account-actions?page=${page}&limit=25`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAccountActions(data.actions || []);
        setActionsTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching account actions:', error);
    }
  };

  const fetchReports = async (token: string) => {
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const response = await fetch('/api/admin/reports', { headers });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };


  const handleCreateUser = async () => {
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
          wing: adminLevel === 'OCS' ? (createForm.wing || null) : adminWing,
          password: createForm.password || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('User created successfully');
        setShowCreateUserModal(false);
        setCreateForm({ name: '', wing: adminWing || '', password: '' });
        fetchUsers(adminToken, userPage, userSearch);
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
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
          wing: adminLevel === 'OCS' ? (editForm.wing || null) : adminWing,
          password: editForm.password || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('User updated successfully');
        setEditingUser(null);
        setEditForm({ name: '', wing: '', password: '' });
        fetchUsers(adminToken, userPage, userSearch);
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserClick = (user: User) => {
    setUserToDelete(user);
  };

  const handleDeleteUserConfirm = async (deletionType: 'reset' | 'ban') => {
    if (!adminToken || !userToDelete) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ userId: userToDelete.id, deletionType }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(deletionType === 'reset' ? 'User reset successfully' : 'User banned successfully');
        setUserToDelete(null);
        fetchUsers(adminToken, userPage, userSearch);
      } else {
        toast.error(data.error || `Failed to ${deletionType === 'reset' ? 'reset' : 'ban'} user`);
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: exerciseForm.name, type: 'rep' }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Exercise created successfully');
        setShowCreateExercise(false);
        setExerciseForm({ name: '' });
        fetchExercises(adminToken);
      } else {
        toast.error(data.error || 'Failed to create exercise');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingExercise) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/exercises', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: editingExercise.id,
          name: exerciseForm.name,
          type: 'rep',
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Exercise updated successfully');
        setEditingExercise(null);
        setExerciseForm({ name: '' });
        fetchExercises(adminToken);
      } else {
        toast.error(data.error || 'Failed to update exercise');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExerciseClick = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
  };

  const handleDeleteExerciseConfirm = async () => {
    if (!adminToken || !exerciseToDelete) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/exercises', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id: exerciseToDelete.id }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Exercise deleted successfully');
        setExerciseToDelete(null);
        fetchExercises(adminToken);
      } else {
        toast.error(data.error || 'Failed to delete exercise');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fix handlers for reports
  const handleCreateAccountFromReport = async (report: { id: string; name: string; wing: string; password?: string }) => {
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
          name: report.name,
          wing: adminLevel === 'OCS' ? report.wing : adminWing,
          password: report.password || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Account created successfully');
        fetchUsers(adminToken, userPage, userSearch);
        // Dismiss the report after successful creation
        handleDismissReport(report.id);
      } else {
        toast.error(data.error || 'Failed to create account');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/report-existing', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reportId }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Report dismissed');
        fetchReports(adminToken);
      } else {
        toast.error(data.error || 'Failed to dismiss report');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveConflict = async (report: { id: string; name: string; wing: string; password?: string }) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      // Find the user by name and wing
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(report.name)}&wing=${encodeURIComponent(report.wing)}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.users && data.users.length > 0) {
        const user = data.users[0];
        
        // If password is provided in the report, update it (this will invalidate old tokens)
        if (report.password && report.password.trim()) {
          const updateResponse = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              userId: user.id,
              password: report.password.trim(),
            }),
          });
          const updateData = await updateResponse.json();
          if (updateResponse.ok && updateData.success) {
            toast.success('Account approved and password updated. Users with old tokens will be logged out.');
            fetchUsers(adminToken, userPage, userSearch);
            handleDismissReport(report.id);
          } else {
            toast.error(updateData.error || 'Failed to approve account');
          }
        } else {
          // No password provided, just approve (though this shouldn't happen for account conflicts)
          toast.success('Account approved');
          fetchUsers(adminToken, userPage, userSearch);
          handleDismissReport(report.id);
        }
      } else {
        toast.error('User not found');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ocs_admin_token');
    localStorage.removeItem('ocs_admin_level');
    localStorage.removeItem('ocs_admin_wing');
    setAdminToken(null);
    setAdminLevel(null);
    setAdminWing(null);
    setIsAuthenticated(false);
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
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
          <p className="text-white/70 text-sm">Level: {adminLevel}{adminWing ? ` - ${adminWing}` : ''}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* OCS Level: Exercise Management */}
      {adminLevel === 'OCS' && (
        <div className="bg-black border border-white/20 rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Exercise Management</h3>
              <button
              onClick={() => {
                setShowCreateExercise(!showCreateExercise);
                setEditingExercise(null);
                setExerciseForm({ name: '' });
              }}
                className="bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 transition-colors"
              >
                {showCreateExercise ? 'Cancel' : '+ Create Exercise'}
              </button>
            </div>

            {showCreateExercise && (
              <form onSubmit={handleCreateExercise} className="mb-6 p-4 border border-white/20 rounded-md space-y-4">
                <h4 className="text-lg font-semibold text-white">Create Exercise</h4>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Name *</label>
                  <input
                    type="text"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors">
                  Create
                </button>
              </form>
            )}

            {editingExercise && (
              <form onSubmit={handleUpdateExercise} className="mb-6 p-4 border border-white/20 rounded-md space-y-4">
                <h4 className="text-lg font-semibold text-white">Edit Exercise</h4>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Name *</label>
                  <input
                    type="text"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    Update
                  </button>
                  <button type="button" onClick={() => setEditingExercise(null)} className="bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="border border-white/20 rounded-md p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{exercise.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingExercise(exercise);
                        setExerciseForm({ name: exercise.name });
                        setShowCreateExercise(false);
                      }}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteExerciseClick(exercise)}
                      disabled={loading}
                      className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shared: User Table with Pagination and Search */}
      <div className="bg-black border border-white/20 rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Users</h3>
            {(adminLevel === 'OCS' || adminLevel === 'WING') && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateUserModal(true);
                    setEditingUser(null);
                    setCreateForm({ name: '', wing: adminWing || '', password: '' });
                  }}
                  className="bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 transition-colors"
                >
                  + Create User
                </button>
                {adminLevel === 'WING' && (
                  <button
                    onClick={() => setShowNominalRollUpload(true)}
                    className="bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 transition-colors"
                  >
                    Upload Nominal Roll
                  </button>
                )}
              </div>
            )}
          </div>


          <div className="mb-4">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setUserPage(1);
              }}
              placeholder="Search by name or wing..."
              className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white mb-4"
            />
          </div>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
            <span className="text-white/70 text-sm">
              Showing {allUsers.length > 0 ? ((userPage - 1) * 10 + 1) : 0} - {Math.min(userPage * 10, userTotal)} of {userTotal} users
            </span>
            {userTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUserPage(1)}
                  disabled={userPage === 1 || loading}
                  className="bg-white/10 text-white py-2 px-3 rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  title="First page"
                >
                  ««
                </button>
                <button
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                  disabled={userPage === 1 || loading}
                  className="bg-white/10 text-white py-2 px-3 rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  title="Previous page"
                >
                  «
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, userTotalPages) }, (_, i) => {
                    let pageNum: number;
                    if (userTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (userPage <= 3) {
                      pageNum = i + 1;
                    } else if (userPage >= userTotalPages - 2) {
                      pageNum = userTotalPages - 4 + i;
                    } else {
                      pageNum = userPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setUserPage(pageNum)}
                        disabled={loading}
                        className={`py-2 px-3 rounded-md transition-colors text-sm min-w-[40px] ${
                          userPage === pageNum
                            ? 'bg-[#ff7301] text-white font-semibold'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        } disabled:opacity-50`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setUserPage(Math.min(userTotalPages, userPage + 1))}
                  disabled={userPage >= userTotalPages || loading}
                  className="bg-white/10 text-white py-2 px-3 rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  title="Next page"
                >
                  »
                </button>
                <button
                  onClick={() => setUserPage(userTotalPages)}
                  disabled={userPage >= userTotalPages || loading}
                  className="bg-white/10 text-white py-2 px-3 rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  title="Last page"
                >
                  »»
                </button>
                <span className="text-white/70 text-sm ml-2">
                  Page {userPage} of {userTotalPages}
                </span>
              </div>
            )}
          </div>
          {allUsers.length === 0 ? (
            <p className="text-white/70">No users found</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allUsers.map((user) => (
                <div key={user.id} className="border border-white/20 rounded-md p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{user.name}</p>
                    <p className="text-white/70 text-sm">Wing: {user.wing || 'N/A'}</p>
                    <p className="text-white/50 text-xs">Created: {new Date(user.createdAt).toLocaleString()}</p>
                    <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                      user.hasLoggedIn ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-600/20 text-gray-400'
                    }`}>
                      {user.hasLoggedIn ? 'Logged In' : 'Not Logged In'}
                    </span>
                  </div>
                  {(adminLevel === 'OCS' || adminLevel === 'WING') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setEditForm({ name: user.name, wing: user.wing || '', password: '' });
                        }}
                        disabled={loading}
                        className="bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 disabled:opacity-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUserClick(user)}
                        disabled={loading}
                        className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OCS Level: Account Logs */}
      {adminLevel === 'OCS' && (
        <div className="bg-black border border-white/20 rounded-lg shadow-md">
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Account Actions Audit Log</h3>
            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={() => setActionsPage(Math.max(1, actionsPage - 1))}
                disabled={actionsPage === 1 || loading}
                className="bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-white">Page {actionsPage} of {actionsTotalPages}</span>
              <button
                onClick={() => setActionsPage(Math.min(actionsTotalPages, actionsPage + 1))}
                disabled={actionsPage >= actionsTotalPages || loading}
                className="bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
            {accountActions.length === 0 ? (
              <p className="text-white/70">No account actions</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {accountActions.map((action) => (
                  <div key={action.id} className="border border-white/20 rounded-md p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{action.userName || 'Unknown'}</span>
                      {action.userWing && <span className="text-white/70 text-sm">({action.userWing})</span>}
                      <span className={`text-xs px-2 py-1 rounded ${
                        action.action === 'login' ? 'bg-green-600/20 text-green-400' :
                        action.action === 'logout' ? 'bg-blue-600/20 text-blue-400' :
                        action.action === 'account_deleted' ? 'bg-red-600/20 text-red-400' :
                        'bg-yellow-600/20 text-yellow-400'
                      }`}>
                        {action.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs">
                      {new Date(action.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wing Level: Reports */}
      {adminLevel === 'WING' && (
        <div className="bg-black border border-white/20 rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Reports</h3>
                <button
                  onClick={() => setShowReportTypesHelp(true)}
                  className="text-[#ff7301] hover:text-white transition-colors text-sm leading-none w-5 h-5 flex items-center justify-center rounded-full hover:bg-[#ff7301]"
                  title="Report types help"
                  aria-label="Help"
                >
                  ?
                </button>
              </div>
              <button
                onClick={() => adminToken && fetchReports(adminToken)}
                disabled={loading}
                className="bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 disabled:opacity-50 transition-colors"
              >
                Refresh
              </button>
            </div>
            {reports.length === 0 ? (
              <p className="text-white/70">No reports found</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reports.map((report) => {
                  // Use type field if available, otherwise fall back to parsing notes for backward compatibility
                  const isAccountConflict = report.type === 'ACCOUNT_CONFLICT' || (report.type === undefined && (report.notes?.includes('Account already exists') || report.notes?.includes('impersonation')));
                  const isNewAccountRequest = report.type === 'NEW_ACCOUNT_REQUEST' || (report.type === undefined && (report.notes?.includes('name not found') || report.notes?.includes('Requesting new account')));
                  
                  return (
                    <div key={report.id} className="border border-white/20 rounded-md p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{report.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-white/70 text-sm">
                              Type: <span className="font-mono text-xs">{report.type || 'UNKNOWN'}</span>
                            </p>
                            <div className="relative">
                              <button
                                onMouseEnter={() => setHoveredType(report.id)}
                                onMouseLeave={() => setHoveredType(null)}
                                className="text-[#ff7301] hover:text-white transition-colors text-xs leading-none w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#ff7301]"
                                aria-label="Type help"
                              >
                                ?
                              </button>
                              {hoveredType === report.id && (
                                <div className="absolute left-0 top-6 z-10 w-72 bg-black border border-white/20 rounded-md p-3 shadow-lg pointer-events-none">
                                  <p className="text-white text-xs font-semibold mb-1">
                                    {report.type === 'ACCOUNT_CONFLICT' ? 'ACCOUNT_CONFLICT' : report.type === 'NEW_ACCOUNT_REQUEST' ? 'NEW_ACCOUNT_REQUEST' : 'UNKNOWN'}
                                  </p>
                                  <p className="text-white/80 text-xs">
                                    {report.type === 'ACCOUNT_CONFLICT' 
                                      ? 'User reports that an account with their name already exists with a password set. This may indicate impersonation.'
                                      : report.type === 'NEW_ACCOUNT_REQUEST'
                                      ? 'User cannot find their name in the system and requests a new account to be created.'
                                      : 'Report type is not specified.'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-white/70 text-sm">Wing: {report.wing}</p>
                          {report.email && <p className="text-white/70 text-sm">Email: {report.email}</p>}
                          {report.phone && <p className="text-white/70 text-sm">Phone: {report.phone}</p>}
                          {report.notes && (
                            <p className="text-white/60 text-sm mt-2">{report.notes}</p>
                          )}
                          <p className="text-white/50 text-xs mt-2">
                            {new Date(report.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {isNewAccountRequest && (
                          <button
                            onClick={() => handleCreateAccountFromReport(report)}
                            disabled={loading}
                            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                          >
                            Create Account
                          </button>
                        )}
                        {isAccountConflict && (
                          <button
                            onClick={() => handleApproveConflict(report)}
                            disabled={loading}
                            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                          >
                            Approve Account
                          </button>
                        )}
                        <button
                          onClick={() => handleDismissReport(report.id)}
                          disabled={loading}
                          className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Exercise Confirmation Modal */}
      <DeleteExerciseModal
        isOpen={exerciseToDelete !== null}
        exerciseName={exerciseToDelete?.name || ''}
        onConfirm={handleDeleteExerciseConfirm}
        onCancel={() => setExerciseToDelete(null)}
        loading={loading}
      />

      {/* Delete User Confirmation Modal */}
      <DeleteUserModal
        isOpen={userToDelete !== null}
        userName={userToDelete?.name || ''}
        userWing={userToDelete?.wing || null}
        onConfirm={handleDeleteUserConfirm}
        onCancel={() => setUserToDelete(null)}
        loading={loading}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        adminLevel={adminLevel}
        adminWing={adminWing}
        formData={createForm}
        onFormChange={setCreateForm}
        onConfirm={handleCreateUser}
        onCancel={() => {
          setShowCreateUserModal(false);
          setCreateForm({ name: '', wing: '', password: '' });
        }}
        loading={loading}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={editingUser !== null}
        userId={editingUser?.id || 0}
        userName={editingUser?.name || ''}
        userWing={editingUser?.wing || null}
        adminLevel={adminLevel}
        adminWing={adminWing}
        adminToken={adminToken}
        formData={editForm}
        onFormChange={setEditForm}
        onConfirm={handleUpdateUser}
        onCancel={() => {
          setEditingUser(null);
          setEditForm({ name: '', wing: '', password: '' });
        }}
        loading={loading}
      />



      {/* Nominal Roll Upload Modal */}
      <NominalRollUploadModal
        isOpen={showNominalRollUpload}
        adminWing={adminWing}
        onClose={() => setShowNominalRollUpload(false)}
        onUploadSuccess={() => {
          if (adminToken) {
            fetchUsers(adminToken, userPage, userSearch);
          }
        }}
        loading={loading}
      />

      {/* Nominal Roll Help Modal */}
      <NominalRollHelpModal
        isOpen={showNominalRollHelp}
        onClose={() => setShowNominalRollHelp(false)}
      />
      <ReportTypesHelpModal
        isOpen={showReportTypesHelp}
        onClose={() => setShowReportTypesHelp(false)}
      />
    </div>
  );
}
