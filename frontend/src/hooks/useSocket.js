// src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useStore from '../store/useStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
let socketInstance = null;

export function useSocket() {
  const socketRef = useRef(null);
  const { addMessage, addMatch, setNewMatch, setTyping, setShowPaywall } = useStore();

  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData || '';
    if (!initData && import.meta.env.PROD) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { initData },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 2000,
      });
    }
    socketRef.current = socketInstance;
    const s = socketRef.current;

    s.on('new:message', msg => addMessage(msg.matchId, msg));

    s.on('match', data => {
      setNewMatch(data);
      addMatch({ matchId: data.matchId, user: data.with, lastMessage: null, matchedAt: new Date() });
    });

    s.on('typing:start', ({ matchId, userId }) => setTyping(matchId, userId, true));
    s.on('typing:stop',  ({ matchId, userId }) => setTyping(matchId, userId, false));

    // Premium paywall — server rejected message
    s.on('subscription:required', () => setShowPaywall(true));

    return () => {
      s.off('new:message');
      s.off('match');
      s.off('typing:start');
      s.off('typing:stop');
      s.off('subscription:required');
    };
  }, []);

  const emit = (event, data) => socketRef.current?.emit(event, data);

  return {
    joinMatch:   (matchId)             => emit('join:match',  { matchId }),
    leaveMatch:  (matchId)             => emit('leave:match', { matchId }),
    sendMessage: (matchId, content)    => emit('send:message', { matchId, content }),
    startTyping: (matchId)             => emit('typing:start', { matchId }),
    stopTyping:  (matchId)             => emit('typing:stop',  { matchId }),
    markRead:    (matchId)             => emit('messages:read', { matchId }),
  };
}
