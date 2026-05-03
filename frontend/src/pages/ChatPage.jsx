// src/pages/ChatPage.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { messageAPI, reportAPI } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useTelegram } from '../hooks/useTelegram';
import useStore from '../store/useStore';

export default function ChatPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { joinMatch, leaveMatch, sendMessage, startTyping, stopTyping, markRead } = useSocket();
  const { backButton } = useTelegram();
  const { messages, setMessages, typingUsers, user, matches, setShowPaywall } = useStore();
  const msgs = messages[matchId] || [];
  const typing = typingUsers[matchId] || new Set();

  const [text, setText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const match = matches.find(m => m.matchId === matchId);
  const other = match?.user;

  useEffect(() => {
    backButton.show(() => navigate('/matches'));
    return () => backButton.hide();
  }, []);

  useEffect(() => {
    joinMatch(matchId);
    markRead(matchId);
    messageAPI.history(matchId)
      .then(d => { setMessages(matchId, d.messages || []); })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingHistory(false));
    return () => leaveMatch(matchId);
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const handleSend = useCallback(() => {
    const t = text.trim();
    if (!t) return;
    sendMessage(matchId, t);
    setText('');
    stopTyping(matchId);
  }, [text, matchId, sendMessage, stopTyping]);

  const handleTyping = v => {
    setText(v);
    startTyping(matchId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(matchId), 1500);
  };

  if (loadingHistory) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => navigate('/matches')} className="p-1"><ArrowLeft size={22} className="tg-text" /></button>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
          {other?.photo ? <img src={other.photo} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full fonqa-gradient flex items-center justify-center text-sm">{other?.firstName?.[0]}</div>}
        </div>
        <div className="flex-1">
          <p className="font-semibold tg-text text-sm">{other?.firstName}</p>
          {typing.size > 0 && <p className="text-xs" style={{ color: 'var(--brand)' }}>typing…</p>}
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(s => !s)} className="p-2"><MoreVertical size={18} className="text-gray-500" /></button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-50 w-40"
              style={{ background: 'var(--surface-2)' }}>
              <button onClick={() => {
                reportAPI.report({ reportedId: other?.id, reason: 'inappropriate' });
                setShowMenu(false);
                toast.success('Report sent');
              }} className="w-full text-left px-4 py-3 text-sm text-red-400">🚨 Report</button>
              <button onClick={() => {
                reportAPI.block(other?.id);
                setShowMenu(false);
                navigate('/matches');
              }} className="w-full text-left px-4 py-3 text-sm text-gray-400">🚫 Block</button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-3 space-y-2">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-3">💕</p>
            <p className="font-semibold tg-text">You matched!</p>
            <p className="text-sm tg-hint mt-1">Say hi to {other?.firstName} 👋</p>
          </div>
        )}
        {msgs.map(msg => {
          const isMe = msg.senderId === user?.id;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {!isMe && (
                <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden bg-gray-700">
                  {other?.photo && <img src={other.photo} className="w-full h-full object-cover" alt="" />}
                </div>
              )}
              <div className="max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: isMe ? 'var(--brand)' : 'var(--surface)',
                  color: isMe ? '#fff' : 'var(--text)',
                  borderBottomRightRadius: isMe ? 4 : undefined,
                  borderBottomLeftRadius: !isMe ? 4 : undefined,
                }}>
                {msg.content}
              </div>
            </motion.div>
          );
        })}
        <AnimatePresence>
          {typing.size > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0" />
              <div className="px-4 py-3 rounded-2xl rounded-bl" style={{ background: 'var(--surface)' }}>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 typing-dot"
                      style={{ animationDelay: `${i*0.2}s` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="input-bar px-4 py-3 flex items-end gap-2 border-t flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <textarea value={text} onChange={e => handleTyping(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={`Message ${other?.firstName || ''}…`}
          rows={1} maxLength={2000}
          className="flex-1 px-4 py-2.5 rounded-2xl resize-none outline-none text-sm"
          style={{ background: 'var(--surface)', color: 'var(--text)', maxHeight: 120 }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} />
        <motion.button onClick={handleSend} whileTap={{ scale: 0.88 }} disabled={!text.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 fonqa-gradient">
          <Send size={17} className="text-white" style={{ transform: 'translateX(1px)' }} />
        </motion.button>
      </div>
    </div>
  );
}
