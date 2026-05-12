// src/pages/ReferralPage.jsx — v3 (G)
import { useEffect, useState } from 'react';
import { Users, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { referralAPI } from '../services/api';
import BackButton from '../components/BackButton';

export default function ReferralPage() {
  const [data, setData]   = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { referralAPI.me().then(setData).catch(() => {}); }, []);

  const copy = () => {
    navigator.clipboard.writeText(data?.inviteLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  // (G) Fixed Telegram share — opens Telegram share sheet properly
  const shareOnTelegram = () => {
    if (!data?.inviteLink) return;
    const msg  = `I am on Fonqa, let's connect! ${data.inviteLink}`;
    const url  = `https://t.me/share/url?url=${encodeURIComponent(data.inviteLink)}&text=${encodeURIComponent('I am on Fonqa, let\'s connect!')}`;

    // Try Telegram WebApp share API first
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(msg);
      toast.success('Message copied! Paste it in any Telegram chat.');
    }
  };

  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const THRESHOLD   = data.threshold || 10;
  const progress    = data.referralCount % THRESHOLD;
  const pct         = Math.min(100, (progress / THRESHOLD) * 100);
  const cyclesCompleted = Math.floor(data.referralCount / THRESHOLD);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <BackButton to="/profile" label="Profile" />
        <h1 className="text-base font-semibold tg-text flex-1">Invite Friends</h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-4 space-y-5">
        <div className="text-center">
          <Users size={36} className="mx-auto mb-2" style={{ color: 'var(--brand)' }} />
          <p className="text-sm tg-hint">Invite {THRESHOLD} friends → get a free reward!</p>
        </div>

        {/* (G) Progress tracking */}
        <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)' }}>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold tg-text">Progress</span>
            <span className="tg-hint">{progress} / {THRESHOLD} friends joined</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all duration-700 fonqa-gradient"
              style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs tg-hint mt-2">
            Total invited: <strong>{data.referralCount}</strong>
            {cyclesCompleted > 0 && ` · ${cyclesCompleted} reward${cyclesCompleted > 1 ? 's' : ''} earned`}
          </p>
        </div>

        {/* Reward info */}
        <div className="p-4 rounded-2xl text-center"
          style={{ background: 'rgba(233,30,99,0.06)', border: '1px solid rgba(233,30,99,0.15)' }}>
          <p className="text-2xl mb-1">🎁</p>
          <p className="font-semibold tg-text text-sm">Reward per {THRESHOLD} invites</p>
          <p className="text-xs tg-hint mt-1">1 Super Like <strong>or</strong> 2-day chat extension</p>
        </div>

        {/* Invite link */}
        <div>
          <p className="text-xs tg-hint mb-2">Your invite link</p>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 px-3 py-2.5 rounded-xl text-sm truncate"
              style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
              {data.inviteLink}
            </div>
            <button onClick={copy}
              className="px-3 py-2.5 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-all"
              style={{ background: copied ? 'rgba(74,222,128,0.12)' : 'var(--surface)', color: copied ? '#4ade80' : 'var(--brand)' }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>

          {/* (G) Fixed Telegram share button */}
          <button onClick={shareOnTelegram}
            className="w-full py-3.5 rounded-2xl font-semibold text-white fonqa-gradient flex items-center justify-center gap-2">
            <span>📤</span> Share on Telegram
          </button>

          <p className="text-xs tg-hint text-center mt-2">
            Message: "I am on Fonqa, let's connect!"
          </p>
        </div>

        {/* Recent referrals */}
        {data.referrals?.length > 0 && (
          <div>
            <p className="text-xs tg-hint mb-2">People you invited ({data.referrals.length})</p>
            <div className="space-y-2">
              {data.referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'var(--surface)' }}>
                  <p className="text-sm tg-text">{r.firstName}</p>
                  <p className="text-xs tg-hint">{new Date(r.joinedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
