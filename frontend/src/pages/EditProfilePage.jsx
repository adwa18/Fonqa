// src/pages/EditProfilePage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Trash2 } from 'lucide-react';
import { profileAPI } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';

const EDUCATION_OPTIONS = ['high_school','some_college','trade_school','bachelors','masters','phd','other'];
const RELIGION_OPTIONS  = ['christian','orthodox','catholic','protestant','muslim','jewish','hindu','buddhist','other','none'];
const KIDS_OPTIONS      = ['none','have_kids','want_kids','dont_want_kids','open'];
const LOOKING_OPTIONS   = ['marriage','relationship','casual','friendship','all'];
const VISIBILITY_OPTIONS= ['public','matches_only'];

const label = s => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { backButton, haptic } = useTelegram();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    backButton.show(() => navigate('/profile'));
    profileAPI.me().then(d => {
      const p = d.profile || {};
      setForm({
        age: p.age || '', gender: p.gender || 'male', bio: p.bio || '',
        occupation: p.occupation || '', education: p.education || '',
        religion: p.religion || '', kidsStatus: p.kidsStatus || 'none',
        lookingFor: p.lookingFor || 'all', city: p.city || '',
        latitude: p.latitude || null, longitude: p.longitude || null,
        locationLabel: p.locationLabel || '', visibility: p.visibility || 'public',
        interests: p.interests || [],
      });
    });
    return () => backButton.hide();
  }, []);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileAPI.create(form);
      haptic.notification('success');
      toast.success('Profile updated!');
      navigate('/profile');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleGetLocation = () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      upd('latitude', pos.coords.latitude);
      upd('longitude', pos.coords.longitude);
      upd('locationLabel', 'Current location');
      toast.success('Location updated');
    }, () => toast.error('Could not get location'));
  };

  const handleDelete = async () => {
    try {
      await profileAPI.deleteAccount();
      toast('Account deleted. Goodbye 👋');
      window.Telegram?.WebApp?.close();
    } catch { toast.error('Failed'); }
  };

  if (!form) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none";
  const inputStyle = { background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' };
  const lbl = "block text-xs tg-hint mb-1.5";

  const ChipRow = ({ options, field }) => (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} onClick={() => upd(field, o)}
          className="px-3 py-1.5 rounded-full text-xs border transition-all capitalize"
          style={{
            background: form[field] === o ? 'var(--brand)' : 'var(--surface)',
            borderColor: form[field] === o ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
            color: form[field] === o ? '#fff' : 'var(--text-muted)',
          }}>
          {label(o)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2 flex-shrink-0 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-bold tg-text">Edit Profile</h1>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 fonqa-gradient">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-4 space-y-5">
        {/* Age */}
        <div>
          <label className={lbl}>Age</label>
          <input type="number" min="18" max="99" value={form.age}
            onChange={e => upd('age', e.target.value)} className={inputCls} style={inputStyle} />
        </div>

        {/* Gender */}
        <div>
          <label className={lbl}>Gender</label>
          <div className="flex gap-2">
            {['male', 'female'].map(g => (
              <button key={g} onClick={() => upd('gender', g)}
                className="flex-1 py-2.5 rounded-xl text-sm border capitalize font-medium transition-all"
                style={{ background: form.gender === g ? 'var(--brand)' : 'var(--surface)', borderColor: form.gender === g ? 'var(--brand)' : 'rgba(255,255,255,0.08)', color: form.gender === g ? '#fff' : 'var(--text-muted)' }}>
                {g === 'male' ? '👨 Male' : '👩 Female'}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className={lbl}>Bio <span className="text-gray-600">{form.bio.length}/600</span></label>
          <textarea value={form.bio} onChange={e => upd('bio', e.target.value)}
            placeholder="Tell people about yourself…" maxLength={600} rows={4}
            className={`${inputCls} resize-none`} style={inputStyle} />
        </div>

        {/* Occupation */}
        <div>
          <label className={lbl}>Occupation</label>
          <input value={form.occupation} onChange={e => upd('occupation', e.target.value)}
            placeholder="Engineer, Teacher…" className={inputCls} style={inputStyle} />
        </div>

        {/* Education */}
        <div>
          <label className={lbl}>Education</label>
          <ChipRow options={EDUCATION_OPTIONS} field="education" />
        </div>

        {/* Religion */}
        <div>
          <label className={lbl}>Religion</label>
          <ChipRow options={RELIGION_OPTIONS} field="religion" />
        </div>

        {/* Kids */}
        <div>
          <label className={lbl}>Kids</label>
          <ChipRow options={KIDS_OPTIONS} field="kidsStatus" />
        </div>

        {/* Looking for */}
        <div>
          <label className={lbl}>Looking for</label>
          <ChipRow options={LOOKING_OPTIONS} field="lookingFor" />
        </div>

        {/* Location */}
        <div>
          <label className={lbl}>City</label>
          <div className="flex gap-2">
            <input value={form.city} onChange={e => upd('city', e.target.value)}
              placeholder="Addis Ababa, Berlin…" className={`${inputCls} flex-1`} style={inputStyle} />
            <button onClick={handleGetLocation}
              className="px-3 rounded-xl border border-gray-700 text-gray-400">
              <MapPin size={17} />
            </button>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className={lbl}>Profile visibility</label>
          <div className="flex gap-2">
            {[['public', '🌍 Everyone'], ['matches_only', '🔒 Matches only']].map(([v, l]) => (
              <button key={v} onClick={() => upd('visibility', v)}
                className="flex-1 py-2.5 rounded-xl text-sm border transition-all"
                style={{ background: form.visibility === v ? 'var(--brand)' : 'var(--surface)', borderColor: form.visibility === v ? 'var(--brand)' : 'rgba(255,255,255,0.08)', color: form.visibility === v ? '#fff' : 'var(--text-muted)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Delete account */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 text-sm text-red-400">
              <Trash2 size={16} /> Delete account
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-red-500/30 space-y-3">
              <p className="text-sm text-red-400 font-medium">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500">
                  Yes, delete
                </button>
                <button onClick={() => setShowDelete(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
