// src/pages/MatchesPage.jsx — v3 (C, H, I)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { matchAPI } from '../services/api';
import BackButton from '../components/BackButton';
import useStore from '../store/useStore';

export default function MatchesPage() {
  const navigate = useNavigate();
  const { matches, setMatches } = useStore();

  useEffect(() => {
    matchAPI.list().then(d => setMatches(d.matches || [])).catch(() => {});
  }, [setMatches]);

  return (
    <div className="flex flex-col h-full">
      {/* Header (C) */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <BackButton to="/" label="Discover" />
        <div className="flex-1">
          <h1 className="text-lg font-bold tg-text">Matches</h1>
          {matches.length > 0 && (
            <p className="text-xs tg-hint">{matches.length} match{matches.length !== 1 ? 'es' : ''}</p>
          )}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
          <span className="text-5xl mb-4">💕</span>
          <h3 className="text-xl font-bold tg-text mb-2">No matches yet</h3>
          <p className="text-sm tg-hint">Keep swiping — your match is out there!</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-3 custom-scroll">
          {matches.map((m, i) => (
            <motion.div key={m.matchId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: 'var(--surface)' }}>

              {/* Avatar — tap opens profile (H) */}
              <button onClick={() => navigate(`/user/${m.user.id}`)}
                className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                {m.user.photo
                  ? <img src={m.user.photo} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full fonqa-gradient flex items-center justify-center text-lg">
                      {m.user.firstName[0]}
                    </div>}
              </button>

              {/* Info — tap opens chat */}
              <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`/chat/${m.matchId}`)}>
                <div className="flex justify-between items-baseline">
                  <p className="font-semibold tg-text">
                    {m.user.firstName}{m.user.age ? `, ${m.user.age}` : ''}
                    {/* (I) deactivated indicator */}
                    {m.user.isDeactivated && (
                      <span className="ml-2 text-xs text-gray-500 font-normal">inactive</span>
                    )}
                  </p>
                  {m.lastMessage && (
                    <p className="text-xs tg-hint ml-2 flex-shrink-0">
                      {new Date(m.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <p className="text-sm tg-hint truncate mt-0.5">
                  {m.lastMessage?.content || 'Say hello! 👋'}
                </p>
              </button>

              <MessageCircle size={17} className="text-gray-600 flex-shrink-0"
                onClick={() => navigate(`/chat/${m.matchId}`)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
