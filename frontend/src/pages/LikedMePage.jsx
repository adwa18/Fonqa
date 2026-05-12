// src/pages/LikedMePage.jsx — v3 (C, H)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';
import { swipeAPI } from '../services/api';
import BackButton from '../components/BackButton';

const STATUS_CONFIG = {
  liked_you: { label: 'Liked you',       color: '#e91e63', bg: 'rgba(233,30,99,0.12)' },
  matched:   { label: '💕 Matched',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  you_liked: { label: 'You liked them',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
};

export default function LikedMePage() {
  const navigate          = useNavigate();
  const [likes, setLikes] = useState([]);
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

  return (
    <div className="flex flex-col h-full">
      {/* Header (C) */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <BackButton to="/" label="Discover" />
        <div className="flex-1">
          <h1 className="text-lg font-bold tg-text">Liked You</h1>
          {likes.length > 0 && (
            <p className="text-xs tg-hint">{likes.length} {likes.length === 1 ? 'person' : 'people'}</p>
          )}
        </div>
      </div>

      {likes.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
          <Heart size={48} className="text-gray-700 mb-4" />
          <h3 className="text-xl font-bold tg-text mb-2">No likes yet</h3>
          <p className="text-sm tg-hint">Keep swiping — likes will appear here.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            {likes.map((l, i) => {
              const cfg = STATUS_CONFIG[l.status] || STATUS_CONFIG.liked_you;
              return (
                <motion.div key={`${l.userId}-${i}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer"
                  style={{ background: 'var(--surface)' }}
                  onClick={() => {
                    // (H) Navigate to profile — if matched, go to chat
                    if (l.status === 'matched' && l.matchId) {
                      navigate(`/chat/${l.matchId}`);
                    } else {
                      navigate(`/user/${l.userId}`);
                    }
                  }}>

                  {l.photo ? (
                    <img src={l.photo} alt={l.firstName}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full fonqa-gradient flex items-center justify-center">
                      <span className="text-5xl">👤</span>
                    </div>
                  )}

                  {/* Superlike badge */}
                  {l.direction === 'superlike' && (
                    <div className="absolute top-2 right-2 bg-yellow-400/90 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                      ⭐ Super
                    </div>
                  )}

                  {/* Info + status */}
                  <div className="glass absolute bottom-0 inset-x-0 p-3">
                    <p className="font-semibold text-white text-sm">
                      {l.firstName}{l.age ? `, ${l.age}` : ''}
                      {l.isVerified && <span className="ml-1 text-blue-300 text-xs">✓</span>}
                    </p>
                    {l.city && <p className="text-white/70 text-xs">📍 {l.city}</p>}
                    {/* (H) status badge */}
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
