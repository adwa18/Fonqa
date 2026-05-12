// src/pages/OnboardingPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { MapPin, ChevronRight } from 'lucide-react';
import { profileAPI } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import CityPicker from '../components/CityPicker';
import PhotoUploader from '../components/PhotoUploader';
import useStore from '../store/useStore';

const INTERESTS = [
  '🏔️ Hiking', '🍳 Cooking', '✈️ Travel', '🎵 Music', '📸 Photography',
  '🎮 Gaming', '🧘 Yoga', '📚 Reading', '🎨 Art', '💪 Fitness',
  '☕ Coffee', '🎬 Movies', '💃 Dancing', '🐾 Pets', '💻 Tech',
  '🌿 Nature', '🏋️ Sports', '🧠 Meditation', '🍷 Food & Drinks', '🎭 Culture',
];

const STEPS = ['photos', 'basics', 'details', 'interests', 'preferences'];
const STEP_TITLES = ['Your Photos', 'About You', 'More Details', 'Your Interests', 'Preferences'];

const LOOKING_FOR_OPTIONS = [
  { value: 'marriage',     label: '💍 Marriage' },
  { value: 'relationship', label: '❤️ Relationship' },
  { value: 'casual',       label: '🌊 Casual' },
  { value: 'friendship',   label: '👯 Friendship' },
  { value: 'all',          label: '🌈 Open to all' },
];

const KIDS_OPTIONS = [
  { value: 'none',          label: "Don't have kids" },
  { value: 'have_kids',     label: 'Have kids' },
  { value: 'want_kids',     label: 'Want kids' },
  { value: 'dont_want_kids',label: "Don't want kids" },
  { value: 'open',          label: 'Open / flexible' },
];

const EDUCATION_OPTIONS = [
  { value: 'high_school',   label: 'High School' },
  { value: 'some_college',  label: 'Some College' },
  { value: 'trade_school',  label: 'Trade School' },
  { value: 'bachelors',     label: "Bachelor's" },
  { value: 'masters',       label: "Master's" },
  { value: 'phd',           label: 'PhD' },
  { value: 'other',         label: 'Other' },
];

const RELIGION_OPTIONS = [
  { value: 'christian',   label: '✝️ Christian' },
  { value: 'orthodox',    label: '☦️ Orthodox' },
  { value: 'catholic',    label: '⛪ Catholic' },
  { value: 'protestant',  label: '🕊️ Protestant' },
  { value: 'muslim',      label: '☪️ Muslim' },
  { value: 'jewish',      label: '✡️ Jewish' },
  { value: 'hindu',       label: '🕉️ Hindu' },
  { value: 'buddhist',    label: '☸️ Buddhist' },
  { value: 'other',       label: 'Other' },
  { value: 'none',        label: 'None / Prefer not to say' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { haptic, telegramUser } = useTelegram();
  const { setHasProfile, setSubscription } = useStore();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [showCity, setShowCity] = useState(false);

  const [form, setForm] = useState({
    age: '', gender: '', bio: '', occupation: '',
    education: '', religion: '', kidsStatus: 'none',
    lookingFor: '', city: '', latitude: null, longitude: null,
    locationLabel: '', interests: [], visibility: 'public',
    ageMin: 18, ageMax: 50, maxDistance: null,
  });

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canProceed = () => {
    if (step === 0) return photos.length >= 1;
    if (step === 1) return form.age >= 18 && form.gender && form.bio.length >= 10 && form.lookingFor;
    if (step === 2) return true; // optional fields
    if (step === 3) return form.interests.length >= 3;
    return true;
  };



  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error('Location not available');
    navigator.geolocation.getCurrentPosition(
      pos => {
        upd('latitude', pos.coords.latitude);
        upd('longitude', pos.coords.longitude);
        upd('locationLabel', 'Current location');
        toast.success('Location captured!');
      },
      () => toast.error('Could not get location')
    );
  };

  const toggleInterest = i => {
    haptic.selection();
    setForm(f => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter(x => x !== i)
        : f.interests.length < 10 ? [...f.interests, i] : f.interests,
    }));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await profileAPI.create({
        age: parseInt(form.age), gender: form.gender, bio: form.bio,
        occupation: form.occupation || undefined,
        education: form.education || undefined,
        religion: form.religion || undefined,
        kidsStatus: form.kidsStatus,
        lookingFor: form.lookingFor,
        city: form.city || undefined,
        latitude: form.latitude, longitude: form.longitude,
        locationLabel: form.locationLabel || undefined,
        interests: form.interests.map(i => i.split(' ').slice(1).join(' ') || i),
        visibility: form.visibility,
      });
      await profileAPI.updatePreferences({
        ageMin:      form.ageMin,
        ageMax:      form.ageMax,
        maxDistance: form.maxDistance,
        lookingFor:  form.lookingFor || 'all',
      });
      setHasProfile(true);
      haptic.notification('success');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const variants = {
    initial: { opacity: 0, x: 32 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -32 },
  };

  return (
    <div className="flex flex-col h-full tg-bg">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl font-bold fonqa-text">Fonqa</div>
          <div className="text-xs text-gray-500 amharic">ፎንቃ</div>
        </div>
        {/* Progress */}
        <div className="flex gap-1.5 mb-1">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
              style={{ background: i <= step ? 'var(--brand)' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
        <p className="text-xs tg-hint">{STEP_TITLES[step]}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        <AnimatePresence mode="wait">
          <motion.div key={step} variants={variants} initial="initial" animate="animate" exit="exit"
            transition={{ duration: 0.2 }} className="px-5 py-4 space-y-4">

            {/* ── Step 0: Photos */}
            {step === 0 && (
              <>
                <p className="text-sm tg-hint mb-3">Add at least 1 photo. Up to 6.</p>
                <PhotoUploader photos={photos} setPhotos={setPhotos} max={6} />
              </>
            )}

            {/* ── Step 1: Basics */}
            {step === 1 && (
              <>
                <div>
                  <label className="label-sm">Age *</label>
                  <input type="number" min="18" max="99" value={form.age}
                    onChange={e => upd('age', e.target.value)} placeholder="Your age"
                    className="fonqa-input" />
                </div>
                <div>
                  <label className="label-sm">Gender *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['male', 'female'].map(g => (
                      <button key={g} onClick={() => { upd('gender', g); haptic.selection(); }}
                        className="py-3 rounded-xl border transition-all capitalize font-medium"
                        style={{
                          background: form.gender === g ? 'var(--brand)' : 'var(--surface)',
                          borderColor: form.gender === g ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
                          color: form.gender === g ? '#fff' : 'var(--text-muted)',
                        }}>
                        {g === 'male' ? '👨 Male' : '👩 Female'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-sm">Looking for *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOOKING_FOR_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => { upd('lookingFor', o.value); haptic.selection(); }}
                        className="py-2.5 px-2 rounded-xl border transition-all text-sm font-medium text-left"
                        style={{
                          background: form.lookingFor === o.value ? 'var(--brand)' : 'var(--surface)',
                          borderColor: form.lookingFor === o.value ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
                          color: form.lookingFor === o.value ? '#fff' : 'var(--text-muted)',
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-sm">Bio * (min 10 chars)</label>
                  <textarea value={form.bio} onChange={e => upd('bio', e.target.value)}
                    placeholder="Tell people about yourself…" maxLength={600} rows={3}
                    className="fonqa-input resize-none" />
                  <p className="text-xs tg-hint text-right mt-1">{form.bio.length}/600</p>
                </div>
                <div>
                  <label className="label-sm">City</label>
                  <button onClick={() => setShowCity(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm"
                    style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <MapPin size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <span className="tg-text flex-1">
                      {form.locationLabel || form.city || 'Pick your city…'}
                    </span>
                    <span className="tg-hint text-xs">Search</span>
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: Details */}
            {step === 2 && (
              <>
                <p className="text-sm tg-hint">All optional — but helps find better matches!</p>
                <div>
                  <label className="label-sm">Occupation</label>
                  <input value={form.occupation} onChange={e => upd('occupation', e.target.value)}
                    placeholder="Engineer, Teacher, Student…" className="fonqa-input" />
                </div>
                <div>
                  <label className="label-sm">Education</label>
                  <div className="flex flex-wrap gap-2">
                    {EDUCATION_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => { upd('education', o.value); haptic.selection(); }}
                        className="px-3 py-1.5 rounded-xl text-sm border transition-all"
                        style={{
                          background: form.education === o.value ? 'var(--brand)' : 'var(--surface)',
                          borderColor: form.education === o.value ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
                          color: form.education === o.value ? '#fff' : 'var(--text-muted)',
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-sm">Religion</label>
                  <div className="flex flex-wrap gap-2">
                    {RELIGION_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => { upd('religion', o.value); haptic.selection(); }}
                        className="px-3 py-1.5 rounded-xl text-sm border transition-all"
                        style={{
                          background: form.religion === o.value ? 'var(--brand)' : 'var(--surface)',
                          borderColor: form.religion === o.value ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
                          color: form.religion === o.value ? '#fff' : 'var(--text-muted)',
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-sm">Kids</label>
                  <div className="grid grid-cols-2 gap-2">
                    {KIDS_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => { upd('kidsStatus', o.value); haptic.selection(); }}
                        className="py-2.5 rounded-xl text-sm border transition-all"
                        style={{
                          background: form.kidsStatus === o.value ? 'var(--brand)' : 'var(--surface)',
                          borderColor: form.kidsStatus === o.value ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
                          color: form.kidsStatus === o.value ? '#fff' : 'var(--text-muted)',
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-sm">Profile visibility</label>
                  <div className="flex gap-2">
                    {[['public', '🌍 Everyone'], ['matches_only', '🔒 Matches only']].map(([v, l]) => (
                      <button key={v} onClick={() => upd('visibility', v)}
                        className="flex-1 py-2.5 rounded-xl text-sm border transition-all"
                        style={{
                          background: form.visibility === v ? 'var(--brand)' : 'var(--surface)',
                          borderColor: form.visibility === v ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
                          color: form.visibility === v ? '#fff' : 'var(--text-muted)',
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Step 3: Interests */}
            {step === 3 && (
              <>
                <p className="text-sm tg-hint">Pick at least 3 — up to 10.</p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(i => (
                    <button key={i} onClick={() => toggleInterest(i)}
                      className={`interest-pill ${form.interests.includes(i) ? 'selected' : ''}`}>
                      {i}
                    </button>
                  ))}
                </div>
                <p className="text-xs tg-hint text-center">{form.interests.length}/10 selected</p>
              </>
            )}

            {/* ── Step 4: Preferences */}
            {step === 4 && (
              <>
                {/* Gender preference auto-set by backend based on your gender */}
                <div>
                  <label className="label-sm">Age range: {form.ageMin}–{form.ageMax}</label>
                  <div className="flex gap-3">
                    <input type="range" min="18" max="70" value={form.ageMin}
                      onChange={e => upd('ageMin', +e.target.value)} className="flex-1 accent-pink-600" />
                    <input type="range" min="18" max="99" value={form.ageMax}
                      onChange={e => upd('ageMax', +e.target.value)} className="flex-1 accent-pink-600" />
                  </div>
                </div>
                <div>
                  <label className="label-sm">
                    Max distance: {form.maxDistance === null ? 'Anywhere' : `${form.maxDistance} km`}
                  </label>
                  <input type="range" min="5" max="500" step="5"
                    value={form.maxDistance ?? 500}
                    onChange={e => upd('maxDistance', +e.target.value >= 500 ? null : +e.target.value)}
                    className="w-full accent-pink-600" />
                  <p className="text-xs tg-hint mt-1">Drag to max (500) for "Anywhere"</p>
                </div>
                <div className="p-4 rounded-2xl text-center" style={{ background: 'var(--surface)' }}>
                  <p className="text-3xl mb-2">💕</p>
                  <h3 className="font-bold tg-text">You're ready!</h3>
                  <p className="text-sm tg-hint mt-1">Start discovering people on Fonqa.</p>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="px-5 py-4 bottom-nav flex-shrink-0">
        <button onClick={() => {
          if (step < STEPS.length - 1) { haptic.impact('light'); setStep(s => s + 1); }
          else handleFinish();
        }}
          disabled={!canProceed() || saving}
          className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity fonqa-gradient">
          {saving
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : step < STEPS.length - 1
            ? <><span>Continue</span><ChevronRight size={18} /></>
            : 'Start Discovering 💕'}
        </button>
      </div>

      {showCity && (
        <CityPicker
          value={form.city}
          onSelect={(loc) => {
            upd('city',          loc.city          || '');
            upd('country',       loc.country       || '');
            upd('countryCode',   loc.countryCode   || '');
            upd('latitude',      loc.latitude      || null);
            upd('longitude',     loc.longitude     || null);
            upd('locationLabel', loc.locationLabel || '');
            setShowCity(false);
          }}
          onClose={() => setShowCity(false)}
        />
      )}

      <style>{`
        .fonqa-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--surface);
          color: var(--text);
          border: 1px solid rgba(255,255,255,0.08);
          outline: none;
          font-size: 15px;
        }
        .fonqa-input:focus { border-color: var(--brand); }
        .label-sm { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
      `}</style>
    </div>
  );
}
