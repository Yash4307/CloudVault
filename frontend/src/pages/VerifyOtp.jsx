import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resendLoginOtp } from '../api';
import useAuth from '../useAuth';
import { AuthMotionField } from '../components/AuthBackground';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, error } = useAuth();
  const [email] = useState(location.state?.email || sessionStorage.getItem('pendingOtpEmail') || '');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('Enter the 6-digit code we sent to your email.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);

  useEffect(() => {
    if (!email) navigate('/login');
  }, [email, navigate]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await verifyOtp(email, otp);
    setIsSubmitting(false);
    if (success) {
      sessionStorage.removeItem('pendingOtpEmail');
      navigate('/dashboard');
    }
  };

  const handleResend = async () => {
    try {
      await resendLoginOtp({ email });
      setOtp('');
      setMessage('A new verification code was sent.');
      setResendSeconds(30);
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Could not resend code yet.');
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
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Check your email</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
          <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-500">{email}</p>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Verification code</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.45em] text-gray-950 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting || otp.length !== 6}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition disabled:opacity-60"
          >
            {isSubmitting ? 'Verifying...' : 'Verify and sign in'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={resendSeconds > 0}
            onClick={handleResend}
            className="font-semibold text-indigo-700 disabled:text-gray-400 dark:text-cyan-300"
          >
            {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
          </button>
          <Link to="/login" className="font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400">
            Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOtp;
