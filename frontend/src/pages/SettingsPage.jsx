// src/pages/SettingsPage.jsx — v3 (C, F)
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { profileAPI } from '../services/api';
import BackButton from '../components/BackButton';

export default function SettingsPage() {
  const [prefs, setPrefs]   = useState(null);
  const [myGender, setMyGender] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileAPI.me().then(d => {
      const p = d.preferences || {};
      setMyGender(d.profile?.gender || 'male');
      setPrefs({
        ageMin:             p.ageMin              ?? 18,
        ageMax:             p.ageMax              ?? 50,
        maxDistance:        p.maxDistance         ?? null,
        lookingFor:         p.lookingFor          ?? 'all',
        religionPreference: p.religionPreference  ?? null,
      });
    });
  }, []);

  const upd = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileAPI.updatePreferences(prefs);
      toast.success('Preferences saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (!prefs) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // (F) show which gender will be shown — locked, not editable
  const targetGender = myGender === 'male' ? 'Women' : 'Men';

  return (
    <div className="flex flex-col h-full">
      {/* Header (C) */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <BackButton to="/profile" label="Profile" />
        <h1 className="text-base font-semibold tg-text flex-1">Discovery Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-4 space-y-6">
        {/* (F) Gender — locked display */}
        <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)' }}>
          <p className="text-sm tg-hint mb-1">Showing you</p>
          <p className="font-semibold tg-text">{targetGender} only</p>
          <p className="text-xs tg-hint mt-1">Based on your gender. This cannot be changed.</p>
        </div>

        {/* Age range */}
        <div>
          <label className="text-sm tg-hint mb-2 block">
            Age range: {prefs.ageMin}–{prefs.ageMax}
          </label>
          <div className="flex gap-3">
            <input type="range" min="18" max="70" value={prefs.ageMin}
              onChange={e => upd('ageMin', +e.target.value)} className="flex-1 accent-pink-600" />
            <input type="range" min="18" max="99" value={prefs.ageMax}
              onChange={e => upd('ageMax', +e.target.value)} className="flex-1 accent-pink-600" />
          </div>
        </div>

        {/* Max distance */}
        <div>
          <label className="text-sm tg-hint mb-2 block">
            Max distance: {prefs.maxDistance === null ? '🌍 Anywhere' : `${prefs.maxDistance} km`}
          </label>
          <input type="range" min="5" max="500" step="5"
            value={prefs.maxDistance ?? 500}
            onChange={e => upd('maxDistance', +e.target.value >= 500 ? null : +e.target.value)}
            className="w-full accent-pink-600" />
          <p className="text-xs tg-hint mt-1">Slide to max for "Anywhere 🌍"</p>
        </div>

        {/* Looking for */}
        <div>
          <label className="text-sm tg-hint mb-2 block">Looking for</label>
          <div className="flex flex-wrap gap-2">
            {[['marriage','💍 Marriage'],['relationship','❤️ Relationship'],['casual','🌊 Casual'],['friendship','👯 Friends'],['all','🌈 All']].map(([v, l]) => (
              <button key={v} onClick={() => upd('lookingFor', v)}
                className="px-3 py-2 rounded-xl text-sm border transition-all"
                style={{ background: prefs.lookingFor === v ? 'var(--brand)' : 'var(--surface)', borderColor: prefs.lookingFor === v ? 'var(--brand)' : 'rgba(255,255,255,0.08)', color: prefs.lookingFor === v ? '#fff' : 'var(--text-muted)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Religion filter */}
        <div>
          <label className="text-sm tg-hint mb-2 block">Religion preference</label>
          <div className="flex flex-wrap gap-2">
            {[null,'christian','orthodox','muslim','jewish','hindu','buddhist','other'].map(v => (
              <button key={String(v)} onClick={() => upd('religionPreference', v)}
                className="px-3 py-1.5 rounded-full text-xs border transition-all capitalize"
                style={{ background: prefs.religionPreference === v ? 'var(--brand)' : 'var(--surface)', borderColor: prefs.religionPreference === v ? 'var(--brand)' : 'rgba(255,255,255,0.08)', color: prefs.religionPreference === v ? '#fff' : 'var(--text-muted)' }}>
                {v === null ? 'Any' : v.replace(/_/g,' ')}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 rounded-2xl font-semibold text-white disabled:opacity-40 fonqa-gradient">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
