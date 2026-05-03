// src/pages/VerifyPage.jsx
import { useEffect, useState } from 'react';
import { Camera, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyAPI } from '../services/api';

export default function VerifyPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    verifyAPI.status().then(d => setStatus(d)).finally(() => setLoading(false));
  }, []);

  const handleSelfie = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const r = await verifyAPI.submitSelfie(file);
      toast.success(r.message);
      setStatus(s => ({ ...s, status: 'pending', required: false }));
    } catch (err) {
      toast.error(err.message);
    } finally { setUploading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col h-full px-5 pt-8">
      <div className="text-center mb-6">
        <Shield size={48} className="mx-auto mb-3" style={{ color: 'var(--brand)' }} />
        <h1 className="text-2xl font-bold tg-text">Profile Verification</h1>
        <p className="text-sm tg-hint mt-2">Verified profiles get more matches and stand out in the deck.</p>
      </div>

      {status?.status === 'approved' ? (
        <div className="text-center p-6 rounded-2xl" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <p className="text-4xl mb-2">✅</p>
          <p className="font-bold text-green-400">Profile Verified!</p>
          <p className="text-sm tg-hint mt-1">Your ✓ badge is live.</p>
        </div>
      ) : status?.status === 'pending' ? (
        <div className="text-center p-6 rounded-2xl" style={{ background: 'var(--surface)' }}>
          <p className="text-4xl mb-2">⏳</p>
          <p className="font-bold tg-text">Under Review</p>
          <p className="text-sm tg-hint mt-1">Usually approved within 24 hours.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)' }}>
            <p className="font-semibold tg-text mb-2">Your gesture:</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>{status?.gesture || 'Thumbs up 👍'}</p>
            <p className="text-sm tg-hint mt-2">Take a clear selfie making this gesture. Make sure your face is visible.</p>
          </div>

          <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer"
            style={{ borderColor: uploading ? 'var(--brand)' : 'rgba(255,255,255,0.15)' }}>
            {uploading ? (
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Camera size={40} className="text-gray-500 mb-3" />
                <p className="font-medium tg-text">Take or upload selfie</p>
                <p className="text-xs tg-hint mt-1">Clear face · good lighting · making the gesture</p>
              </>
            )}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfie} />
          </label>
        </div>
      )}
    </div>
  );
}
