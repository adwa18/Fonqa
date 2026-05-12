// src/pages/EditProfilePage.jsx — v3 (A, B, C, I)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';
import { profileAPI } from '../services/api';
import BackButton from '../components/BackButton';
import PhotoUploader from '../components/PhotoUploader';
import CityPicker from '../components/CityPicker';

const EDUCATION_OPTIONS = ['high_school','some_college','trade_school','bachelors','masters','phd','other'];
const RELIGION_OPTIONS  = ['christian','orthodox','catholic','protestant','muslim','jewish','hindu','buddhist','other','none'];
const KIDS_OPTIONS      = ['none','have_kids','want_kids','dont_want_kids','open'];
const LOOKING_OPTIONS   = ['marriage','relationship','casual','friendship','all'];

const label = s => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [form, setForm]         = useState(null);
  const [photos, setPhotos]     = useState([]);
  const [saving, setSaving]     = useState(false);
  const [showCity, setShowCity] = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  useEffect(() => {
    profileAPI.me().then(d => {
      const p = d.profile || {};
      setForm({
        age:           p.age           || '',
        gender:        p.gender        || 'male',
        bio:           p.bio           || '',
        occupation:    p.occupation    || '',
        education:     p.education     || '',
        religion:      p.religion      || '',
        kidsStatus:    p.kidsStatus    || 'none',
        lookingFor:    p.lookingFor    || 'all',
        city:          p.city          || '',
        country:       p.country       || '',
        countryCode:   p.countryCode   || '',
        latitude:      p.latitude      || null,
        longitude:     p.longitude     || null,
        locationLabel: p.locationLabel || '',
        visibility:    p.visibility    || 'public',
        interests:     p.interests     || [],
      });
      setPhotos(d.photos || []);
    });
  }, []);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileAPI.create(form);
      toast.success('Profile updated!');
      navigate('/profile');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    try {
      await profileAPI.deactivate();
      toast('Account deactivated. Come back anytime!');
      window.Telegram?.WebApp?.close();
    } catch { toast.error('Failed'); }
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

  const inputCls   = "w-full px-4 py-3 rounded-xl text-sm outline-none";
  const inputStyle = { background: 'var(--surface)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.08)' };
  const lbl        = "block text-xs tg-hint mb-1.5 mt-4";

  const ChipRow = ({ options, field }) => (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {options.map(o => (
        <button key={o} onClick={() => upd(field, o)}
          className="px-3 py-1.5 rounded-full text-xs border transition-all capitalize"
          style={{
            background:  form[field] === o ? 'var(--brand)' : 'var(--surface)',
            borderColor: form[field] === o ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
            color:       form[field] === o ? '#fff'         : 'var(--text-muted)',
          }}>
          {label(o)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <BackButton to="/profile" label="Profile" />   {/* (C) */}
        <h1 className="text-base font-semibold tg-text">Edit Profile</h1>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 fonqa-gradient">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll px-5 py-4">
        {/* Photos (B) */}
        <label className={lbl}>Photos</label>
        <PhotoUploader photos={photos} setPhotos={setPhotos} max={6} />

        {/* Age */}
        <label className={lbl}>Age</label>
        <input type="number" min="18" max="99" value={form.age}
          onChange={e => upd('age', e.target.value)}
          className={inputCls} style={inputStyle} />

        {/* Gender */}
        <label className={lbl}>Gender</label>
        <div className="flex gap-2 mt-1.5">
          {['male','female'].map(g => (
            <button key={g} onClick={() => upd('gender', g)}
              className="flex-1 py-2.5 rounded-xl text-sm border capitalize font-medium transition-all"
              style={{ background: form.gender === g ? 'var(--brand)' : 'var(--surface)', borderColor: form.gender === g ? 'var(--brand)' : 'rgba(255,255,255,0.08)', color: form.gender === g ? '#fff' : 'var(--text-muted)' }}>
              {g === 'male' ? '👨 Male' : '👩 Female'}
            </button>
          ))}
        </div>

        {/* Bio */}
        <label className={lbl}>Bio <span className="text-gray-600">{form.bio.length}/600</span></label>
        <textarea value={form.bio} onChange={e => upd('bio', e.target.value)}
          placeholder="Tell people about yourself…" maxLength={600} rows={4}
          className={`${inputCls} resize-none`} style={inputStyle} />

        {/* Occupation */}
        <label className={lbl}>Occupation</label>
        <input value={form.occupation} onChange={e => upd('occupation', e.target.value)}
          placeholder="Engineer, Teacher…" className={inputCls} style={inputStyle} />

        {/* Education */}
        <label className={lbl}>Education</label>
        <ChipRow options={EDUCATION_OPTIONS} field="education" />

        {/* Religion */}
        <label className={lbl}>Religion</label>
        <ChipRow options={RELIGION_OPTIONS} field="religion" />

        {/* Kids */}
        <label className={lbl}>Kids</label>
        <ChipRow options={KIDS_OPTIONS} field="kidsStatus" />

        {/* Looking for */}
        <label className={lbl}>Looking for</label>
        <ChipRow options={LOOKING_OPTIONS} field="lookingFor" />

        {/* Location (A) */}
        <label className={lbl}>Location</label>
        <button onClick={() => setShowCity(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm"
          style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <MapPin size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <span className="tg-text flex-1">
            {form.locationLabel || form.city || 'Pick your city…'}
          </span>
          <span className="tg-hint text-xs">Change</span>
        </button>

        {/* Visibility */}
        <label className={lbl}>Profile visibility</label>
        <div className="flex gap-2 mt-1.5">
          {[['public','🌍 Everyone'],['matches_only','🔒 Matches only']].map(([v, l]) => (
            <button key={v} onClick={() => upd('visibility', v)}
              className="flex-1 py-2.5 rounded-xl text-sm border transition-all"
              style={{ background: form.visibility === v ? 'var(--brand)' : 'var(--surface)', borderColor: form.visibility === v ? 'var(--brand)' : 'rgba(255,255,255,0.08)', color: form.visibility === v ? '#fff' : 'var(--text-muted)' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Account actions (I) */}
        <div className="mt-8 pt-6 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
          {/* Deactivate */}
          {!showDeactivate ? (
            <button onClick={() => setShowDeactivate(true)}
              className="w-full py-3 rounded-xl text-sm text-yellow-400 border"
              style={{ borderColor: 'rgba(250,204,21,0.25)', background: 'rgba(250,204,21,0.06)' }}>
              Deactivate account
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-yellow-500/30 space-y-3">
              <p className="text-sm text-yellow-400 font-medium">Deactivate account?</p>
              <p className="text-xs tg-hint">Your profile will be hidden. You can return by opening Fonqa again.</p>
              <div className="flex gap-2">
                <button onClick={handleDeactivate} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black bg-yellow-400">Yes, deactivate</button>
                <button onClick={() => setShowDeactivate(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Delete */}
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)}
              className="w-full py-3 rounded-xl text-sm text-red-400 border"
              style={{ borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.06)' }}>
              Delete account permanently
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-red-500/30 space-y-3">
              <p className="text-sm text-red-400 font-medium">Delete permanently?</p>
              <p className="text-xs tg-hint">This cannot be undone. All data will be erased.</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500">Delete forever</button>
                <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>

      {/* City picker overlay (A) */}
      {showCity && (
        <CityPicker
          value={form.city}
          onSelect={(loc) => {
            upd('city',          loc.city         || '');
            upd('country',       loc.country      || '');
            upd('countryCode',   loc.countryCode  || '');
            upd('latitude',      loc.latitude     || null);
            upd('longitude',     loc.longitude    || null);
            upd('locationLabel', loc.locationLabel|| '');
            setShowCity(false);
          }}
          onClose={() => setShowCity(false)}
        />
      )}
    </div>
  );
}
