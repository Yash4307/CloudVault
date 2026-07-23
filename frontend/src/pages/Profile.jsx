import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../useAuth';
import { deleteAccount, getProfile } from '../api';
import API from '../api';
import { useToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => { fetchProfileData(); }, []);

  const fetchProfileData = async () => {
    try { const response = await getProfile(); setProfile(response.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { addToast('Passwords do not match', 'error'); return; }
    if (newPassword.length < 6) { addToast('Min 6 characters', 'error'); return; }
    try {
      await API.put('/profile/change-password', { current_password: currentPassword, new_password: newPassword });
      addToast('Password changed!', 'success');
      setShowPasswordForm(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) { addToast(err.response?.data?.detail || 'Failed', 'error'); }
  };

  const expectedUsername = profile?.username || user?.username || '';
  const usernameMatches = confirmUsername === expectedUsername;
  const usernameMismatch = confirmUsername.length > 0 && !usernameMatches;

  const closeDeleteModal = () => {
    if (deletingAccount) return;
    setShowDeleteModal(false);
    setConfirmUsername('');
  };

  const handleDeleteAccount = async () => {
    if (!usernameMatches || deletingAccount) return;
    setDeletingAccount(true);
    try {
      await deleteAccount({ username: confirmUsername });
      logout();
      localStorage.removeItem('token');
      sessionStorage.clear();
      addToast('Your account has been permanently deleted.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to delete account', 'error');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
      <Navbar user={user} onLogout={() => { logout(); navigate('/login'); }} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

          {loading ? (
            <div className="space-y-4">
              <div className="h-32 skeleton rounded-2xl" />
              <div className="h-24 skeleton rounded-2xl" />
            </div>
          ) : profile ? (
            <div className="space-y-6 animate-slide-up">
              {/* Profile Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {profile.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{profile.username}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Files', value: profile.total_files },
                  { label: 'Folders', value: profile.total_folders },
                  { label: 'Storage', value: formatBytes(profile.total_storage) },
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Change Password */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
                {!showPasswordForm ? (
                  <button onClick={() => setShowPasswordForm(true)} className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">
                    Change Password
                  </button>
                ) : (
                  <div className="space-y-4">
                    {['Current Password', 'New Password', 'Confirm Password'].map((label, i) => (
                      <div key={i}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                        <input
                          type="password"
                          value={i === 0 ? currentPassword : i === 1 ? newPassword : confirmPassword}
                          onChange={(e) => i === 0 ? setCurrentPassword(e.target.value) : i === 1 ? setNewPassword(e.target.value) : setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <button onClick={handleChangePassword} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">Save</button>
                      <button onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                        className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Account */}
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/30">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">Danger Zone</p>
                  <h3 className="mt-1 text-lg font-semibold text-red-950 dark:text-red-100">Delete Account</h3>
                  <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-200">
                    Permanently delete your account and all CloudVault data linked to it. This cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  Delete Account
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={closeDeleteModal}>
          <div
            className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-2xl dark:border-red-900/60 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">Delete Account</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              This action is permanent and cannot be undone. All your files, folders, shared links, activity history, and account data will be permanently deleted.
            </p>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Type your username to confirm</span>
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                disabled={deletingAccount}
                className={`w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 dark:bg-gray-950 dark:text-white ${
                  usernameMismatch
                    ? 'border-red-300 focus:ring-red-500 dark:border-red-800'
                    : 'border-gray-200 focus:ring-indigo-500 dark:border-gray-700'
                }`}
                autoFocus
              />
            </label>
            {usernameMismatch && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-300">Username does not match.</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingAccount}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={!usernameMatches || deletingAccount}
                className="flex min-w-32 items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingAccount ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
