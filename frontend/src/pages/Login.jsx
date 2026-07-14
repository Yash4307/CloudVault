import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../useAuth';
import { AuthMotionField, AuthVisualPanel } from '../components/AuthBackground';
import PasswordField from '../components/PasswordField';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <AuthVisualPanel />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-100 via-sky-50 to-emerald-50 p-6 dark:from-gray-950 dark:via-indigo-950 dark:to-cyan-950">
        <AuthMotionField />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-md rounded-lg border border-white/70 bg-white/85 p-8 shadow-2xl shadow-indigo-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/85 dark:shadow-black/30"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-400/30 lg:hidden">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in to your CloudVault account</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
            >
              <span className="font-bold">!</span>
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
              <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01, boxShadow: '0 12px 35px rgba(79, 70, 229, 0.32)' }}
              whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-700 hover:text-indigo-500 dark:text-cyan-300">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
