import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resetPassword } from '../api';
import { AuthMotionField } from '../components/AuthBackground';
import PasswordField from '../components/PasswordField';

const ResetPassword = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || token;
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token: resetToken, new_password: password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-100 via-indigo-100 to-emerald-100 p-6 dark:from-gray-950 dark:via-indigo-950 dark:to-cyan-950">
      <AuthMotionField />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-lg border border-white/70 bg-white/85 p-8 shadow-2xl shadow-indigo-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/85 dark:shadow-black/30"
      >
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Reset password</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Choose a new password for your account.</p>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">New password</span>
            <PasswordField value={password} minLength={6} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</span>
            <PasswordField value={confirmPassword} minLength={6} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition disabled:opacity-60"
          >
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-500 dark:text-cyan-300">Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
