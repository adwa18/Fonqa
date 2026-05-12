// src/pages/PremiumPage.jsx — v3 (E)
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle, Upload, Copy, Check } from 'lucide-react';
import { premiumAPI } from '../services/api';
import BackButton from '../components/BackButton';

const PERKS = [
  '💬 Unlimited chat with all matches',
  '❤️ See everyone who liked you',
  '⚡ Priority in discovery',
  '✓ Read receipts',
  '🚀 Weekly profile boost',
];

// (E) Payment methods with account owner name = Tewodros Ephrem
const METHODS = [
  {
    id:      'cbe_birr',
    label:   'CBE Birr',
    icon:    '🏦',
    account: process.env.VITE_CBE_ACCOUNT || '1000xxxxxxxxx',
    name:    'Tewodros Ephrem',
    instructions: 'Open CBE Birr app → Send Money → Enter account number → Amount: 200 ETB',
  },
  {
    id:      'telebirr',
    label:   'TeleBirr',
    icon:    '📱',
    account: process.env.VITE_TELEBIRR_ACCOUNT || '09xxxxxxxxx',
    name:    'Tewodros Ephrem',
    instructions: 'Open TeleBirr app → Send Money → Enter phone number → Amount: 200 ETB',
  },
  {
    id:      'bank_transfer',
    label:   'Bank Transfer (CBE)',
    icon:    '🏛️',
    account: process.env.VITE_BANK_ACCOUNT || '1000xxxxxxxxx',
    name:    'Tewodros Ephrem',
    instructions: 'Go to any CBE branch or use mobile banking → Transfer 200 ETB to account',
  },
];

function CopyableField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-xs tg-hint">{label}</p>
        <p className="text-sm font-semibold tg-text">{value}</p>
      </div>
      <button onClick={copy} className="p-2 rounded-lg transition-colors"
        style={{ background: copied ? 'rgba(74,222,128,0.1)' : 'var(--surface-2)', color: copied ? '#4ade80' : 'var(--text-muted)' }}>
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

export default function PremiumPage() {
  const [status, setStatus]         = useState(null);
  const [selected, setSelected]     = useState(null);
  const [reference, setReference]   = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    premiumAPI.status().then(setStatus).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selected) return toast.error('Choose a payment method');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('method', selected);
      if (reference)  fd.append('reference', reference);
      if (screenshot) fd.append('screenshot', screenshot);
      await premiumAPI.submitPayment(fd);
      setSubmitted(true);
      toast.success('Payment submitted! We\'ll review within 24 hours.');
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const selectedMethod = METHODS.find(m => m.id === selected);

  if (status?.isPremium) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-5xl mb-4">⭐</div>
      <h2 className="text-2xl font-bold tg-text mb-2">You're Premium!</h2>
      <p className="text-sm tg-hint">Active until <strong>{new Date(status.premiumEnds).toLocaleDateString()}</strong></p>
    </div>
  );

  if (submitted || status?.pendingRequest) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-5xl mb-4">⏳</div>
      <h2 className="text-xl font-bold tg-text mb-2">Under Review</h2>
      <p className="text-sm tg-hint">Your payment is being reviewed. You'll receive a Telegram notification once approved — usually within 24 hours.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <BackButton to="/profile" label="Profile" />
        <h1 className="text-base font-semibold tg-text flex-1">Get Premium</h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll">
        {/* Hero */}
        <div className="fonqa-gradient px-5 pt-6 pb-6 text-center">
          <div className="text-4xl mb-2">⭐</div>
          <h1 className="text-xl font-bold text-white">Fonqa Premium</h1>
          <p className="text-white/80 text-sm mt-1">200 ETB / month</p>
          {status?.isInTrial && (
            <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 text-white text-sm">
              🎁 Free trial active until {new Date(status.trialEnds).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="px-5 pt-4 pb-8 space-y-5">
          {/* Perks */}
          <div className="p-4 rounded-2xl space-y-2" style={{ background: 'var(--surface)' }}>
            {PERKS.map(p => (
              <div key={p} className="flex items-center gap-2.5">
                <CheckCircle size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <p className="text-sm tg-text">{p}</p>
              </div>
            ))}
          </div>

          {/* Female note */}
          {status?.isFemale && (
            <div className="p-4 rounded-2xl text-center"
              style={{ background: 'rgba(233,30,99,0.08)', border: '1px solid rgba(233,30,99,0.2)' }}>
              <p className="text-sm" style={{ color: 'var(--brand)' }}>
                💕 Fonqa is <strong>free for women</strong>. You have unlimited chat!
              </p>
            </div>
          )}

          {!status?.isFemale && (
            <>
              {/* Step 1: Select method */}
              <div>
                <p className="text-sm font-semibold tg-text mb-3">Step 1 — Choose payment method</p>
                <div className="space-y-2">
                  {METHODS.map(m => (
                    <button key={m.id} onClick={() => setSelected(m.id)}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left"
                      style={{
                        background:  selected === m.id ? 'rgba(233,30,99,0.08)' : 'var(--surface)',
                        borderColor: selected === m.id ? 'var(--brand)'          : 'var(--border)',
                      }}>
                      <span className="text-2xl">{m.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium tg-text">{m.label}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: selected === m.id ? 'var(--brand)' : 'var(--border)' }}>
                        {selected === m.id && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brand)' }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Account details (E) */}
              {selectedMethod && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold tg-text mb-3">Step 2 — Send payment</p>
                    <div className="p-4 rounded-2xl space-y-1 divide-y"
                      style={{ background: 'var(--surface)', divideColor: 'var(--border)' }}>
                      <CopyableField label="Account Name"   value={selectedMethod.name} />
                      <CopyableField label="Account / Phone" value={selectedMethod.account} />
                      <CopyableField label="Amount"          value="200 ETB" />
                    </div>
                    <div className="mt-2 p-3 rounded-xl" style={{ background: 'rgba(233,30,99,0.06)' }}>
                      <p className="text-xs tg-hint leading-relaxed">{selectedMethod.instructions}</p>
                    </div>
                  </div>

                  {/* Step 3: Upload proof */}
                  <div>
                    <p className="text-sm font-semibold tg-text mb-3">Step 3 — Submit proof</p>
                    <input value={reference} onChange={e => setReference(e.target.value)}
                      placeholder="Transaction reference (optional)"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
                      style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} />

                    <label className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer mb-4"
                      style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
                      <Upload size={18} className="text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm tg-text">{screenshot ? screenshot.name : 'Upload screenshot (optional)'}</p>
                        <p className="text-xs tg-hint">Speeds up approval</p>
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
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
