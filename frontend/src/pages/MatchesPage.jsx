// src/pages/MatchesPage.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { matchAPI } from '../services/api';
import useStore from '../store/useStore';

export default function MatchesPage() {
  const navigate = useNavigate();
  const { matches, setMatches } = useStore();

  useEffect(() => {
    matchAPI.list().then(d => setMatches(d.matches || [])).catch(() => {});
  }, [setMatches]);

  if (matches.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <span className="text-5xl mb-4">💕</span>
      <h3 className="text-xl font-bold tg-text mb-2">No matches yet</h3>
      <p className="text-sm tg-hint">Keep swiping — your match is out there!</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-2xl font-bold tg-text">Matches</h1>
        <p className="text-sm tg-hint">{matches.length} match{matches.length !== 1 ? 'es' : ''}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scroll">
        {matches.map((m, i) => (
          <motion.button key={m.matchId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate(`/chat/${m.matchId}`)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
            style={{ background: 'var(--surface)' }}>
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
              {m.user.photo
                ? <img src={m.user.photo} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full fonqa-gradient flex items-center justify-center text-lg">{m.user.firstName[0]}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <p className="font-semibold tg-text">{m.user.firstName}{m.user.age ? `, ${m.user.age}` : ''}</p>
                {m.lastMessage && (
                  <p className="text-xs tg-hint ml-2 flex-shrink-0">
                    {new Date(m.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <p className="text-sm tg-hint truncate mt-0.5">{m.lastMessage?.content || 'Say hello! 👋'}</p>
            </div>
            <MessageCircle size={17} className="text-gray-600 flex-shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
