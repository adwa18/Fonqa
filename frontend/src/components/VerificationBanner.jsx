// src/components/VerificationBanner.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { verifyAPI } from '../services/api';
import useStore from '../store/useStore';

export default function VerificationBanner() {
  const { verificationNeeded, verificationGesture, setVerification } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check silently on app load
    verifyAPI.status()
      .then(d => {
        if (d.required) setVerification(true, d.gesture);
      })
      .catch(() => {});
  }, []);

  if (!verificationNeeded) return null;

  return (
    <div className="flex-shrink-0 mx-4 mt-2 p-3 rounded-2xl flex items-center gap-3 cursor-pointer"
      style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)' }}
      onClick={() => navigate('/verify')}>
      <Shield size={18} style={{ color: '#60a5fa', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: '#60a5fa' }}>Verify your profile</p>
        <p className="text-xs text-gray-500 truncate">Gesture: {verificationGesture}</p>
      </div>
      <span className="text-blue-400 text-sm flex-shrink-0">›</span>
    </div>
  );
}
