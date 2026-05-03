// src/pages/SwipePage.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, X, Star, RefreshCw, Shield } from 'lucide-react';
import { swipeAPI } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import useStore from '../store/useStore';

const THRESHOLD = 90;

function SwipeCard({ c, onSwipe, isTop }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-22, 0, 22]);
  const likeOpacity = useTransform(x, [15, 80], [0, 1]);
  const nopeOpacity = useTransform(x, [-80, -15], [1, 0]);
  const [photo, setPhoto] = useState(0);
  const { haptic } = useTelegram();

  const handleDragEnd = useCallback((e, info) => {
    if (info.offset.x > THRESHOLD) { triggerSwipe('like'); }
    else if (info.offset.x < -THRESHOLD) { triggerSwipe('pass'); }
    else { animate(x, 0, { type: 'spring', stiffness: 300, damping: 28 }); }
  }, [x]);

  const triggerSwipe = useCallback((dir) => {
    haptic.impact(dir === 'like' ? 'medium' : 'light');
    animate(x, dir === 'like' ? 600 : -600, { duration: 0.32 });
    setTimeout(() => onSwipe(c.id, dir), 280);
  }, [c.id, onSwipe, haptic, x]);

  if (!isTop) return (
    <div className="swipe-card" style={{ transform: 'scale(0.94) translateY(12px)', zIndex: 1, pointerEvents: 'none' }}>
      <div className="w-full h-full rounded-card" style={{ background: 'var(--surface)' }} />
    </div>
  );

  return (
    <motion.div className="swipe-card" style={{ x, rotate, zIndex: 10 }}
      drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.75} onDragEnd={handleDragEnd} whileTap={{ scale: 1.015 }}>

      <motion.div className="like-stamp" style={{ opacity: likeOpacity }}>LIKE ❤️</motion.div>
      <motion.div className="nope-stamp" style={{ opacity: nopeOpacity }}>NOPE ✕</motion.div>

      <div className="relative w-full h-full">
        {c.photos?.length > 0 ? (
          <img src={c.photos[photo]} alt={c.firstName}
            className="w-full h-full object-cover pointer-events-none" draggable={false} />
        ) : (
          <div className="w-full h-full fonqa-gradient flex items-center justify-center">
            <span className="text-8xl">{c.gender === 'female' ? '👩' : '👨'}</span>
          </div>
        )}

        {/* Photo nav */}
        {c.photos?.length > 1 && (
          <>
            <button className="absolute left-0 top-0 w-1/2 h-3/4 z-10"
              onClick={e => { e.stopPropagation(); setPhoto(p => Math.max(0, p - 1)); }} />
            <button className="absolute right-0 top-0 w-1/2 h-3/4 z-10"
              onClick={e => { e.stopPropagation(); setPhoto(p => Math.min(c.photos.length - 1, p + 1)); }} />
            <div className="absolute top-3 inset-x-0 flex justify-center gap-1 z-20 pointer-events-none">
              {c.photos.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all ${i === photo ? 'w-6 bg-white' : 'w-3 bg-white/40'}`} />
              ))}
            </div>
          </>
        )}

        {/* Boost indicator */}
        {c.isBoosted && (
          <div className="absolute top-3 right-3 z-20 bg-yellow-500/90 text-black text-xs font-bold px-2 py-1 rounded-full">
            ⚡ Boosted
          </div>
        )}

        {/* Info overlay */}
        <div className="glass absolute bottom-0 inset-x-0 p-5 z-20 pointer-events-none">
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-white">{c.firstName}, {c.age}</h2>
                {c.isVerified && <span className="text-blue-400 text-lg">✓</span>}
              </div>
              {(c.city || c.distanceKm != null) && (
                <p className="text-white/80 text-sm mt-0.5">
                  📍 {c.city}{c.distanceKm != null ? ` · ${c.distanceKm} km` : ''}
                </p>
              )}
              {c.occupation && <p className="text-white/70 text-xs mt-0.5">💼 {c.occupation}</p>}
              {c.bio && <p className="text-white/90 text-sm mt-2 line-clamp-2">{c.bio}</p>}
              {c.interests?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.interests.slice(0, 4).map(i => (
                    <span key={i} className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{i}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SwipePage() {
  const { candidates, setCandidates, removeCandidate, setNewMatch } = useStore();
  const [loading, setLoading] = useState(false);
  const [swiping, setSwiping] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await swipeAPI.getCandidates();
      setCandidates(data.candidates || []);
    } catch (err) {
      toast.error('Could not load profiles');
    } finally { setLoading(false); }
  }, [setCandidates]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSwipe = useCallback(async (id, dir) => {
    if (swiping) return;
    setSwiping(true);
    removeCandidate(id);
    try {
      const result = await swipeAPI.swipe(id, dir);
      if (result.isMatch) {
        const other = candidates.find(c => c.id === id);
        setNewMatch({ matchId: result.matchId, with: other });
      }
      if (candidates.length <= 2) fetch();
    } catch (err) {
      toast.error('Swipe failed');
    } finally { setSwiping(false); }
  }, [swiping, candidates, removeCandidate, setNewMatch, fetch]);

  const top  = candidates[0];
  const next = candidates[1];

  if (loading && candidates.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 pt-4 pb-2">
          <div className="h-7 w-24 rounded-xl bg-gray-800 animate-pulse" />
        </div>
        <div className="flex-1 px-4 py-2 relative">
          <div className="w-full h-full rounded-card bg-gray-800 animate-pulse shimmer relative" />
        </div>
        <div className="flex justify-center gap-6 py-5">
          {[52, 44, 52].map((s, i) => (
            <div key={i} className="rounded-full bg-gray-800 animate-pulse" style={{ width: s, height: s }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold fonqa-text">Fonqa</h1>
          <p className="text-xs text-gray-500 amharic">ፎንቃ</p>
        </div>
        <button onClick={fetch} className="p-2 rounded-full" style={{ background: 'var(--surface)' }}>
          <RefreshCw size={17} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 relative px-4 py-2">
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <span className="text-5xl mb-4">🌊</span>
            <h3 className="text-xl font-bold tg-text mb-2">You've seen everyone!</h3>
            <p className="text-sm tg-hint mb-6">Try expanding your preferences to see more people.</p>
            <button onClick={fetch} className="px-6 py-3 rounded-2xl font-semibold text-white fonqa-gradient">
              Refresh deck
            </button>
          </div>
        ) : (
          <div className="card-stack">
            {next && <SwipeCard key={next.id} c={next} onSwipe={handleSwipe} isTop={false} />}
            {top  && <SwipeCard key={top.id}  c={top}  onSwipe={handleSwipe} isTop={true} />}
          </div>
        )}
      </div>

      {candidates.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-4 pb-6">
          {[
            { dir: 'pass',      color: '#f87171', size: 52, icon: <X size={26} /> },
            { dir: 'superlike', color: '#facc15', size: 44, icon: <Star size={22} /> },
            { dir: 'like',      color: '#4ade80', size: 52, icon: <Heart size={26} /> },
          ].map(({ dir, color, size, icon }) => (
            <motion.button key={dir} onClick={() => handleSwipe(top.id, dir)}
              whileTap={{ scale: 0.88 }}
              className="rounded-full flex items-center justify-center shadow-lg border-2"
              style={{ width: size, height: size, background: 'var(--surface)', borderColor: color, color }}>
              {icon}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
