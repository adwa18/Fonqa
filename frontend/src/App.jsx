// src/App.jsx — Fonqa v3
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTelegram } from './hooks/useTelegram';
import { useSocket } from './hooks/useSocket';
import { authAPI } from './services/api';
import useStore from './store/useStore';

import SplashScreen      from './pages/SplashScreen';
import OnboardingPage    from './pages/OnboardingPage';
import SwipePage         from './pages/SwipePage';
import LikedMePage       from './pages/LikedMePage';
import MatchesPage       from './pages/MatchesPage';
import ChatPage          from './pages/ChatPage';
import ProfilePage       from './pages/ProfilePage';
import EditProfilePage   from './pages/EditProfilePage';
import UserProfilePage   from './pages/UserProfilePage';
import SettingsPage      from './pages/SettingsPage';
import PremiumPage       from './pages/PremiumPage';
import VerifyPage        from './pages/VerifyPage';
import ReferralPage      from './pages/ReferralPage';
import AdminPage         from './pages/AdminPage';

import BottomNav          from './components/BottomNav';
import MatchCelebration   from './components/MatchCelebration';
import PaywallModal       from './components/PaywallModal';
import VerificationBanner from './components/VerificationBanner';

function Guard({ children }) {
  const { hasProfile, isLoading } = useStore();
  if (isLoading) return null;
  if (!hasProfile) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  const { expand, ready, setHeaderColor } = useTelegram();
  const { user, setUser, setHasProfile, setLoading, setSubscription, isLoading } = useStore();
  useSocket();

  useEffect(() => {
    expand();
    setHeaderColor('#0d0d0d');
    ready();

    authAPI.login()
      .then(data => {
        setUser(data.user);
        setHasProfile(data.hasProfile);
        setSubscription(data.subscription);
      })
      .catch(() => {
        if (import.meta.env.DEV) {
          setUser({ id: 'dev', firstName: 'Dev', referralCode: 'DEVCODE' });
          setHasProfile(false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (isLoading) return <SplashScreen />;

  const showNav = !!user && useStore.getState().hasProfile;

  return (
    <BrowserRouter>
      <div className="flex flex-col h-full overflow-hidden tg-bg">
        <Toaster position="top-center" toastOptions={{
          style: { background: '#1a1a1a', color: '#f0f0f0', borderRadius: '12px', fontSize: '14px' },
        }} />
        <MatchCelebration />
        <PaywallModal />
        <VerificationBanner />

        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/onboarding"      element={<OnboardingPage />} />
            <Route path="/"                element={<Guard><SwipePage /></Guard>} />
            <Route path="/liked-me"        element={<Guard><LikedMePage /></Guard>} />
            <Route path="/matches"         element={<Guard><MatchesPage /></Guard>} />
            <Route path="/chat/:matchId"   element={<Guard><ChatPage /></Guard>} />
            <Route path="/profile"         element={<Guard><ProfilePage /></Guard>} />
            <Route path="/profile/edit"    element={<Guard><EditProfilePage /></Guard>} />
            <Route path="/user/:id"        element={<Guard><UserProfilePage /></Guard>} />
            <Route path="/settings"        element={<Guard><SettingsPage /></Guard>} />
            <Route path="/premium"         element={<Guard><PremiumPage /></Guard>} />
            <Route path="/verify"          element={<Guard><VerifyPage /></Guard>} />
            <Route path="/referral"        element={<Guard><ReferralPage /></Guard>} />
            <Route path="/admin"           element={<Guard><AdminPage /></Guard>} />
            <Route path="*"               element={<Navigate to="/" />} />
          </Routes>
        </div>

        {showNav && <BottomNav />}
      </div>
    </BrowserRouter>
  );
}
