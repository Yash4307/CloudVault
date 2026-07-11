import { motion } from 'framer-motion';

const tiles = [
  { label: 'PDF', x: '8%', y: '14%', color: 'border-red-300 text-red-600', delay: 0 },
  { label: 'IMG', x: '76%', y: '12%', color: 'border-violet-300 text-violet-600', delay: 0.4 },
  { label: 'DOC', x: '16%', y: '72%', color: 'border-blue-300 text-blue-600', delay: 0.8 },
  { label: 'ZIP', x: '78%', y: '68%', color: 'border-emerald-300 text-emerald-600', delay: 1.2 },
  { label: 'XLS', x: '50%', y: '7%', color: 'border-amber-300 text-amber-600', delay: 1.6 },
  { label: 'MP4', x: '54%', y: '82%', color: 'border-pink-300 text-pink-600', delay: 2 },
];

const streamLines = [18, 32, 46, 60, 74];

export const AuthMotionField = ({ intensity = 'light' }) => {
  const isDark = intensity === 'dark';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className={`absolute inset-x-[-20%] top-14 h-28 blur-2xl ${isDark ? 'bg-cyan-400/30' : 'bg-indigo-300/60'}`}
        animate={{ x: ['-8%', '8%', '-8%'], opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`absolute inset-x-[-20%] bottom-14 h-28 blur-2xl ${isDark ? 'bg-violet-400/30' : 'bg-emerald-300/55'}`}
        animate={{ x: ['8%', '-8%', '8%'], opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {streamLines.map((top, index) => (
        <motion.div
          key={top}
          className={`absolute left-[-18%] h-px w-[136%] bg-gradient-to-r from-transparent to-transparent ${
            isDark ? 'via-white/35' : 'via-indigo-400/70'
          }`}
          style={{ top: `${top}%` }}
          animate={{ x: ['-10%', '10%', '-10%'], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {tiles.map((tile) => (
        <motion.div
          key={tile.label}
          className={`absolute flex h-14 w-14 items-center justify-center rounded-lg border bg-white/90 text-xs font-bold shadow-xl ${
            isDark ? 'shadow-black/30' : 'shadow-indigo-200/70'
          } ${tile.color}`}
          style={{ left: tile.x, top: tile.y }}
          animate={{ y: [0, -18, 0], rotate: [-3, 3, -3], scale: [1, 1.07, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: tile.delay, ease: 'easeInOut' }}
        >
          {tile.label}
        </motion.div>
      ))}
    </div>
  );
};

export const AuthVisualPanel = () => (
  <div className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950 p-12 text-white lg:flex lg:w-1/2 lg:items-center lg:justify-center">
    <AuthMotionField intensity="dark" />
    <div className="relative z-10 max-w-lg text-center">
      <motion.div
        className="mx-auto mb-10 w-full max-w-sm"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 260 170" className="w-full drop-shadow-2xl">
          <defs>
            <linearGradient id="authCloud" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="authVault" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <motion.path
            d="M58 126c-24 0-42-17-42-39 0-21 16-38 37-39 8-24 30-39 56-34 15-18 43-16 56 3 25-2 46 16 49 40 18 4 30 18 30 35 0 20-16 34-39 34H58z"
            fill="url(#authCloud)"
            animate={{ scale: [0.98, 1.02, 0.98] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <rect x="96" y="68" width="68" height="54" rx="8" fill="url(#authVault)" />
          <path d="M111 68V55c0-12 8-20 19-20s19 8 19 20v13" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
          <circle cx="130" cy="94" r="8" fill="#fff" />
          <path d="M130 101v12" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
        </svg>
      </motion.div>

      <motion.h2
        className="mb-3 text-3xl font-bold"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Your files, always within reach.
      </motion.h2>
      <motion.p
        className="mx-auto mb-8 max-w-md text-lg text-white/75"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        Store, organize, and recover documents in a secure workspace.
      </motion.p>

      <div className="flex flex-wrap justify-center gap-3">
        {['Secure Storage', 'Fast Sync', 'Private by Default'].map((badge, index) => (
          <motion.span
            key={badge}
            className="rounded-lg border border-white/20 bg-white/12 px-4 py-2 text-sm text-white/90 backdrop-blur"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + index * 0.1 }}
            whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            {badge}
          </motion.span>
        ))}
      </div>
    </div>
  </div>
);
