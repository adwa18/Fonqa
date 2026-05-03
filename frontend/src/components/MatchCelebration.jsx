// src/components/MatchCelebration.jsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useTelegram } from '../hooks/useTelegram';

export default function MatchCelebration() {
  const { newMatch, clearNewMatch } = useStore();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  useEffect(() => {
    if (newMatch) haptic.notification('success');
  }, [newMatch]);

  return (
    <AnimatePresence>
      {newMatch && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}>
          <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
            {[1,2,3].map(i => (
              <div key={i} className="absolute inset-0 rounded-full pulse-ring"
                style={{ background: 'var(--brand)', animationDelay: `${i*0.35}s`, opacity: 0 }} />
            ))}
            <span className="text-6xl z-10">💕</span>
          </div>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }} className="text-center px-6">
            <h2 className="text-3xl font-bold text-white mb-2">It's a Match!</h2>
            <p className="text-gray-300 text-base mb-8">
              You and <strong>{newMatch.with?.firstName || 'someone'}</strong> liked each other 🎉
            </p>
            <div className="flex flex-col gap-3 w-64 mx-auto">
              <button onClick={() => { clearNewMatch(); navigate(`/chat/${newMatch.matchId}`); }}
                className="py-4 rounded-2xl font-semibold text-white fonqa-gradient">
                Send a message 💬
              </button>
              <button onClick={clearNewMatch}
                className="py-4 rounded-2xl font-semibold text-gray-400"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                Keep swiping
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
