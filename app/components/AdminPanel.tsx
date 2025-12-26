'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DeleteExerciseModal from './DeleteExerciseModal';
import DeleteUserModal from './DeleteUserModal';
import DeleteScoreModal from './DeleteScoreModal';
import EditUserModal from './EditUserModal';
import CreateUserModal from './CreateUserModal';
import NominalRollHelpModal from './NominalRollHelpModal';
import NominalRollUploadModal from './NominalRollUploadModal';
import ReportTypesHelpModal from './ReportTypesHelpModal';

interface User {
  id: number;
  name: string;
  wing: string | null;
  approved: boolean;
  pendingApproval: boolean;
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
  const [editForm, setEditForm] = useState({ name: '', wing: '', password: '', approved: false });

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
  const [scores, setScores] = useState<Array<{ id: number; value: number; createdAt: string; exerciseName: string; userName: string; userWing: string | null; userId: number }>>([]);
  const [scoreSearch, setScoreSearch] = useState('');
  const [scoreToDelete, setScoreToDelete] = useState<{ id: number; userName: string; exerciseName: string; value: number } | null>(null);

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
        fetchScores(adminToken, adminWing);
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
      const wing = adminWing || localStorage.getItem('ocs_admin_wing');
      fetchScores(token, wing);
      fetchReports(token);
    }
  };

  const fetchUsers = async (token: string, page: number, search: string) => {
    const headers = { 'Authorization': `Bearer ${token}` };
    const params = new URLSearchParams({ page: page.toString(), limit: '25' });
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

  const fetchScores = async (token: string, wing?: string | null) => {
    if (!wing) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      // Get all users in the wing first, then get their scores
      const usersResponse = await fetch(`/api/admin/users?page=1&limit=1000&wing=${encodeURIComponent(wing)}`, { headers });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const userIds = (usersData.users || []).map((u: User) => u.id);
        
        // Fetch scores for each user
        const allScores: Array<{ id: number; value: number; createdAt: string; exerciseName: string; userName: string; userWing: string | null; userId: number }> = [];
        for (const userId of userIds) {
          const scoresResponse = await fetch(`/api/admin/scores?userId=${userId}`, { headers });
          if (scoresResponse.ok) {
            const scoresData = await scoresResponse.json();
            if (scoresData.success && scoresData.scores) {
              allScores.push(...scoresData.scores.map((s: any) => ({
                id: s.id,
                value: s.value,
                createdAt: s.createdAt,
                exerciseName: s.exerciseName,
                userName: s.userName,
                userWing: s.userWing,
                userId: s.userId,
              })));
            }
          }
        }
        // Sort by most recent first
        allScores.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setScores(allScores);
      }
    } catch (error) {
      console.error('Error fetching scores:', error);
    }
  };

  const handleDeleteScoreClick = (score: { id: number; userName: string; exerciseName: string; value: number }) => {
    setScoreToDelete(score);
  };

  const handleDeleteScoreConfirm = async () => {
    if (!adminToken || !scoreToDelete) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/scores', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ scoreId: scoreToDelete.id }),
      });

      if (response.ok) {
        toast.success('Score deleted successfully');
        setScoreToDelete(null);
        if (adminWing) {
          fetchScores(adminToken, adminWing);
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete score');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
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
          approved: editForm.approved,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('User updated successfully');
        setEditingUser(null);
        setEditForm({ name: '', wing: '', password: '', approved: false });
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

  const handleDeleteUserConfirm = async () => {
    if (!adminToken || !userToDelete) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('User deleted successfully');
        setUserToDelete(null);
        fetchUsers(adminToken, userPage, userSearch);
      } else {
        toast.error(data.error || 'Failed to delete user');
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

  const handleApproveConflict = async (report: { id: string; name: string; wing: string }) => {
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
        // Approve the user
        const updateResponse = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            userId: user.id,
            approved: true,
          }),
        });
        const updateData = await updateResponse.json();
        if (updateResponse.ok && updateData.success) {
          toast.success('Account approved');
          fetchUsers(adminToken, userPage, userSearch);
          handleDismissReport(report.id);
        } else {
          toast.error(updateData.error || 'Failed to approve account');
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
          <div className="mb-4 flex items-center justify-between">
            <span className="text-white/70 text-sm">Total: {userTotal} users</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setUserPage(Math.max(1, userPage - 1))}
                disabled={userPage === 1 || loading}
                className="bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-white">Page {userPage} of {userTotalPages}</span>
              <button
                onClick={() => setUserPage(Math.min(userTotalPages, userPage + 1))}
                disabled={userPage >= userTotalPages || loading}
                className="bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
          {allUsers.length === 0 ? (
            <p className="text-white/70">No users found</p>
          ) : (
            <div className="space-y-2">
              {allUsers.map((user) => (
                <div key={user.id} className="border border-white/20 rounded-md p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{user.name}</p>
                    <p className="text-white/70 text-sm">Wing: {user.wing || 'N/A'}</p>
                    <p className="text-white/50 text-xs">Created: {new Date(user.createdAt).toLocaleString()}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded inline-block ${
                        user.approved ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                      }`}>
                        {user.approved ? 'Approved' : user.pendingApproval ? 'Pending' : 'Not Approved'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded inline-block ${
                        user.hasLoggedIn ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {user.hasLoggedIn ? 'Logged In' : 'Not Logged In'}
                      </span>
                    </div>
                  </div>
                  {(adminLevel === 'OCS' || adminLevel === 'WING') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setEditForm({ name: user.name, wing: user.wing || '', password: '', approved: user.approved });
                        }}
                        disabled={loading}
                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

      {/* Wing Level: Score Management */}
      {adminLevel === 'WING' && (
        <div className="bg-black border border-white/20 rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Score Management</h3>
              <button
                onClick={() => adminToken && adminWing && fetchScores(adminToken, adminWing)}
                disabled={loading}
                className="bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 disabled:opacity-50 transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={scoreSearch}
                onChange={(e) => setScoreSearch(e.target.value)}
                placeholder="Search by user name, exercise, or wing..."
                className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
              />
            </div>
            {loading && scores.length === 0 ? (
              <p className="text-white/70">Loading scores...</p>
            ) : (() => {
              const filteredScores = scores.filter(score => {
                if (!scoreSearch.trim()) return true;
                const searchLower = scoreSearch.toLowerCase();
                return (
                  score.userName.toLowerCase().includes(searchLower) ||
                  score.exerciseName.toLowerCase().includes(searchLower) ||
                  (score.userWing && score.userWing.toLowerCase().includes(searchLower)) ||
                  score.value.toString().includes(searchLower)
                );
              });
              return filteredScores.length === 0 ? (
                <p className="text-white/70">No scores found{scoreSearch ? ` matching "${scoreSearch}"` : ''}</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredScores.map((score) => (
                    <div key={score.id} className="border border-white/20 rounded-md p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{score.userName} {score.userWing && `(${score.userWing})`}</p>
                        <p className="text-white/70 text-sm">{score.exerciseName}: {score.value}</p>
                        <p className="text-white/50 text-xs">{new Date(score.createdAt).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteScoreClick({ id: score.id, userName: score.userName, exerciseName: score.exerciseName, value: score.value })}
                        disabled={loading}
                        className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
                                title={report.type === 'ACCOUNT_CONFLICT' 
                                  ? 'Account conflict: User reports that an account with their name already exists with a password set'
                                  : report.type === 'NEW_ACCOUNT_REQUEST'
                                  ? 'New account request: User cannot find their name and requests a new account'
                                  : 'Unknown report type'}
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
        userName={editingUser?.name || ''}
        userWing={editingUser?.wing || null}
        adminLevel={adminLevel}
        adminWing={adminWing}
        formData={editForm}
        onFormChange={setEditForm}
        onConfirm={handleUpdateUser}
        onCancel={() => {
          setEditingUser(null);
          setEditForm({ name: '', wing: '', password: '', approved: false });
        }}
        loading={loading}
      />

      {/* Delete Score Confirmation Modal */}
      <DeleteScoreModal
        isOpen={scoreToDelete !== null}
        userName={scoreToDelete?.userName || ''}
        exerciseName={scoreToDelete?.exerciseName || ''}
        value={scoreToDelete?.value || 0}
        onConfirm={handleDeleteScoreConfirm}
        onCancel={() => setScoreToDelete(null)}
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
