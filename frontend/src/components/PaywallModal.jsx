// src/components/PaywallModal.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useStore from '../store/useStore';

export default function PaywallModal() {
  const { showPaywall, setShowPaywall } = useStore();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {showPaywall && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowPaywall(false)} />

          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }} transition={{ type: 'spring', damping: 28 }}
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl p-6 slide-up"
            style={{ background: 'var(--surface)' }}>

            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold tg-text">Free trial ended</h2>
                <p className="text-sm tg-hint mt-1">Upgrade to keep chatting with your matches</p>
              </div>
              <button onClick={() => setShowPaywall(false)} className="p-1 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 rounded-2xl mb-4 fonqa-gradient">
              <p className="text-white font-bold text-lg">⭐ Fonqa Premium</p>
              <p className="text-white/80 text-sm mt-0.5">200 ETB / month · Unlimited chat · All features</p>
            </div>

            <p className="text-xs tg-hint text-center mb-4">
              Women use Fonqa free. Men need Premium after the 7-day trial.
            </p>

            <button onClick={() => { setShowPaywall(false); navigate('/premium'); }}
              className="w-full py-4 rounded-2xl font-semibold text-white fonqa-gradient">
              Get Premium 💳
            </button>
            <button onClick={() => setShowPaywall(false)}
              className="w-full py-3 mt-2 text-sm tg-hint text-center">
              Maybe later
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
