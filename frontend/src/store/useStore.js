// src/store/useStore.js
import { create } from 'zustand';

const useStore = create((set, get) => ({
  // ── Auth / user
  user:         null,
  hasProfile:   false,
  isLoading:    true,
  subscription: null,
  setUser:         u  => set({ user: u }),
  setHasProfile:   v  => set({ hasProfile: v }),
  setLoading:      v  => set({ isLoading: v }),
  setSubscription: s  => set({ subscription: s }),

  // ── Swipe deck
  candidates:     [],
  setCandidates:  cs  => set({ candidates: cs }),
  removeCandidate: id => set(s => ({ candidates: s.candidates.filter(c => c.id !== id) })),

  // ── Who liked me
  likedMe:    [],
  setLikedMe: l => set({ likedMe: l }),

  // ── Matches
  matches:    [],
  setMatches: m  => set({ matches: m }),
  addMatch:   m  => set(s => ({ matches: [m, ...s.matches] })),

  // ── Chat
  activeMatchId: null,
  messages:      {},      // { [matchId]: Message[] }
  typingUsers:   {},      // { [matchId]: Set }
  setActiveMatch:   id  => set({ activeMatchId: id }),
  setMessages:      (id, msgs) => set(s => ({ messages: { ...s.messages, [id]: msgs } })),
  addMessage:       (id, msg)  => set(s => ({ messages: { ...s.messages, [id]: [...(s.messages[id] || []), msg] } })),
  prependMessages:  (id, msgs) => set(s => ({ messages: { ...s.messages, [id]: [...msgs, ...(s.messages[id] || [])] } })),
  setTyping:        (id, uid, on) => set(s => {
    const cur = new Set(s.typingUsers[id] || []);
    on ? cur.add(uid) : cur.delete(uid);
    return { typingUsers: { ...s.typingUsers, [id]: cur } };
  }),

  // ── Match celebration
  newMatch:     null,
  setNewMatch:  m => set({ newMatch: m }),
  clearNewMatch: () => set({ newMatch: null }),

  // ── Premium paywall trigger
  showPaywall:     false,
  setShowPaywall:  v => set({ showPaywall: v }),

  // ── Verification prompt
  verificationNeeded: false,
  verificationGesture: null,
  setVerification: (needed, gesture) => set({ verificationNeeded: needed, verificationGesture: gesture }),
}));

export default useStore;
