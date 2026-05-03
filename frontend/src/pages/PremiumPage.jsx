// src/pages/PremiumPage.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle, Upload } from 'lucide-react';
import { premiumAPI } from '../services/api';

const PERKS = [
  'Unlimited chat with all matches',
  'See your full match list',
  'Priority in discovery',
  'Read receipts',
  'Profile boost included',
];

export default function PremiumPage() {
  const [status, setStatus] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [reference, setReference] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    premiumAPI.status()
      .then(d => setStatus(d))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedMethod) return toast.error('Choose a payment method');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('method', selectedMethod);
      if (reference) fd.append('reference', reference);
      if (screenshot) fd.append('screenshot', screenshot);
      await premiumAPI.submitPayment(fd);
      setSubmitted(true);
      toast.success('Payment submitted! We\'ll review it within 24 hours.');
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Already premium
  if (status?.isPremium) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-5xl mb-4">⭐</div>
      <h2 className="text-2xl font-bold tg-text mb-2">You're Premium!</h2>
      <p className="text-sm tg-hint">Active until <strong>{new Date(status.premiumEnds).toLocaleDateString()}</strong></p>
    </div>
  );

  // Already submitted
  if (submitted || status?.pendingRequest) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-5xl mb-4">⏳</div>
      <h2 className="text-xl font-bold tg-text mb-2">Payment Under Review</h2>
      <p className="text-sm tg-hint">
        Your payment is being reviewed. You'll receive a Telegram notification once approved — usually within 24 hours.
      </p>
    </div>
  );

  const methods = status?.paymentInfo?.methods || [];

  return (
    <div className="h-full overflow-y-auto custom-scroll pb-8">
      {/* Hero */}
      <div className="fonqa-gradient px-5 pt-8 pb-8 text-center">
        <div className="text-5xl mb-3">⭐</div>
        <h1 className="text-2xl font-bold text-white">Fonqa Premium</h1>
        <p className="text-white/80 text-sm mt-1">Unlimited chat · 200 ETB / month</p>
        {status?.isInTrial && (
          <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 text-white text-sm">
            🎁 Free trial active until {new Date(status.trialEnds).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Perks */}
        <div className="p-4 rounded-2xl space-y-2.5" style={{ background: 'var(--surface)' }}>
          {PERKS.map(p => (
            <div key={p} className="flex items-center gap-2.5">
              <CheckCircle size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <p className="text-sm tg-text">{p}</p>
            </div>
          ))}
        </div>

        {/* Women note */}
        {status?.isFemale && (
          <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(233,30,99,0.1)', border: '1px solid rgba(233,30,99,0.2)' }}>
            <p className="text-sm" style={{ color: 'var(--brand)' }}>💕 Fonqa is <strong>free for women</strong>. You already have unlimited chat!</p>
          </div>
        )}

        {!status?.isFemale && (
          <>
            {/* Method selection */}
            <div>
              <h3 className="font-semibold tg-text mb-3">Select Payment Method</h3>
              <div className="space-y-2">
                {methods.map(m => (
                  <button key={m.id} onClick={() => setSelectedMethod(m.id)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left"
                    style={{
                      background: selectedMethod === m.id ? 'rgba(233,30,99,0.1)' : 'var(--surface)',
                      borderColor: selectedMethod === m.id ? 'var(--brand)' : 'var(--border)',
                    }}>
                    <div>
                      <p className="font-medium tg-text">{m.label}</p>
                      <p className="text-xs tg-hint mt-0.5">Account: <strong>{m.account}</strong></p>
                      <p className="text-xs tg-hint">Name: {m.name}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: selectedMethod === m.id ? 'var(--brand)' : 'var(--border)' }}>
                      {selectedMethod === m.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brand)' }} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedMethod && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="p-4 rounded-2xl text-sm" style={{ background: 'var(--surface)', border: '1px solid rgba(233,30,99,0.2)' }}>
                  <p className="font-semibold tg-text mb-1">Instructions:</p>
                  <p className="tg-hint">1. Send <strong>200 ETB</strong> to the account above</p>
                  <p className="tg-hint">2. Enter your transaction reference below</p>
                  <p className="tg-hint">3. Optionally upload a screenshot</p>
                  <p className="tg-hint">4. Submit — we'll activate your account within 24h</p>
                </div>

                <input value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="Transaction reference (optional)"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} />

                <label className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer"
                  style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
                  <Upload size={20} className="text-gray-500" />
                  <div>
                    <p className="text-sm tg-text">{screenshot ? screenshot.name : 'Upload payment screenshot'}</p>
                    <p className="text-xs tg-hint">Optional but speeds up approval</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => setScreenshot(e.target.files[0])} />
                </label>

                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 fonqa-gradient">
                  {submitting
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Submit Payment 💳'}
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
