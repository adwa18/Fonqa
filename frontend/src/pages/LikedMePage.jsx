// src/pages/LikedMePage.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';
import { swipeAPI } from '../services/api';

export default function LikedMePage() {
  const [likes, setLikes]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    swipeAPI.getLikedMe()
      .then(d => setLikes(d.likes || []))
      .catch(() => toast.error('Could not load likes'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (likes.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <Heart size={48} className="text-gray-700 mb-4" />
      <h3 className="text-xl font-bold tg-text mb-2">No likes yet</h3>
      <p className="text-sm tg-hint">Keep swiping — likes will appear here.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-2xl font-bold tg-text">Liked You</h1>
        <p className="text-sm tg-hint">{likes.length} people liked your profile</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 pt-2">
          {likes.map((l, i) => (
            <motion.div key={`${l.userId}-${i}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="relative rounded-2xl overflow-hidden aspect-[3/4]"
              style={{ background: 'var(--surface)' }}>
              {l.photo ? (
                <img src={l.photo} alt={l.firstName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full fonqa-gradient flex items-center justify-center">
                  <span className="text-5xl">👤</span>
                </div>
              )}

              {/* Direction badge */}
              <div className="absolute top-2 right-2">
                {l.direction === 'superlike'
                  ? <span className="text-lg">⭐</span>
                  : <span className="text-lg">❤️</span>}
              </div>

              {/* Info */}
              <div className="glass absolute bottom-0 inset-x-0 p-3">
                <p className="font-semibold text-white text-sm">{l.firstName}{l.age ? `, ${l.age}` : ''}</p>
                {l.city && <p className="text-white/70 text-xs">📍 {l.city}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
