// src/pages/ReferralPage.jsx
import { useEffect, useState } from 'react';
import { Users, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { referralAPI } from '../services/api';

export default function ReferralPage() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { referralAPI.me().then(setData).catch(() => {}); }, []);

  const copy = () => {
    navigator.clipboard.writeText(data?.inviteLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: 'Join Fonqa', text: '💕 Join me on Fonqa — a dating app inside Telegram!', url: data?.inviteLink });
    } else copy();
  };

  if (!data) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const progress = data.referralCount % data.threshold;

  return (
    <div className="h-full overflow-y-auto custom-scroll px-5 pt-8 pb-8 space-y-5">
      <div className="text-center">
        <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--brand)' }} />
        <h1 className="text-2xl font-bold tg-text">Invite Friends</h1>
        <p className="text-sm tg-hint mt-1">Invite {data.threshold} friends → both get a reward!</p>
      </div>

      {/* Progress */}
      <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)' }}>
        <div className="flex justify-between text-sm mb-2">
          <span className="tg-hint">Progress</span>
          <span className="font-semibold tg-text">{progress}/{data.threshold}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div className="h-full rounded-full transition-all duration-500 fonqa-gradient"
            style={{ width: `${(progress / data.threshold) * 100}%` }} />
        </div>
        <p className="text-xs tg-hint mt-2">Total invited: {data.referralCount} · Reward: {data.reward}</p>
      </div>

      {/* Invite link */}
      <div>
        <p className="text-sm tg-hint mb-2">Your invite link</p>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl text-sm truncate"
            style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
            {data.inviteLink}
          </div>
          <button onClick={copy} className="px-4 py-3 rounded-xl flex items-center gap-1.5 text-sm font-medium"
            style={{ background: copied ? 'rgba(74,222,128,0.15)' : 'var(--surface)', color: copied ? '#4ade80' : 'var(--brand)' }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <button onClick={share} className="w-full mt-3 py-3 rounded-xl text-sm font-semibold text-white fonqa-gradient">
          Share on Telegram 📤
        </button>
      </div>

      {/* Recent referrals */}
      {data.referrals?.length > 0 && (
        <div>
          <p className="text-sm tg-hint mb-2">People you invited</p>
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
  );
}
