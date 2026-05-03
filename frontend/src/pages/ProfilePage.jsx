// src/pages/ProfilePage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Camera, Shield, Star, Users, Settings, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { profileAPI, uploadAPI } from '../services/api';
import useStore from '../store/useStore';

const FIELD_LABELS = {
  education:  { high_school: 'High School', some_college: 'Some College', bachelors: "Bachelor's", masters: "Master's", phd: 'PhD', trade_school: 'Trade School', other: 'Other' },
  religion:   { christian: 'Christian', orthodox: 'Orthodox', catholic: 'Catholic', protestant: 'Protestant', muslim: 'Muslim', jewish: 'Jewish', hindu: 'Hindu', buddhist: 'Buddhist', other: 'Other', none: 'None' },
  kidsStatus: { none: 'No kids', have_kids: 'Has kids', want_kids: 'Wants kids', dont_want_kids: "Doesn't want kids", open: 'Open about kids' },
  lookingFor: { marriage: 'Marriage', relationship: 'Relationship', casual: 'Casual', friendship: 'Friendship', all: 'Open to all' },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [profile, setProfile]   = useState(null);
  const [photos, setPhotos]     = useState([]);
  const [subscription, setSub]  = useState(null);
  const [verification, setVerif] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    profileAPI.me().then(d => {
      setProfile(d.profile);
      setPhotos(d.photos || []);
      setSub(d.subscription);
      setVerif(d.verification);
    }).finally(() => setLoading(false));
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const id = toast.loading('Uploading…');
    try {
      const d = await uploadAPI.uploadPhoto(file);
      setPhotos(p => [...p, d.photo]);
      toast.success('Added!', { id });
    } catch (err) { toast.error(err.message, { id }); }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await uploadAPI.deletePhoto(photoId);
      setPhotos(p => p.filter(x => x.id !== photoId));
    } catch { toast.error('Failed to remove'); }
  };

  const handleSetMain = async (photoId) => {
    try {
      await uploadAPI.setMainPhoto(photoId);
      setPhotos(p => p.map(x => ({ ...x, isMain: x.id === photoId })));
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isPremium = subscription?.tier === 'premium' && subscription?.premiumEnds && new Date() < new Date(subscription.premiumEnds);
  const isVerified = profile?.isVerified;

  return (
    <div className="h-full overflow-y-auto custom-scroll">
      {/* Photo grid */}
      <div className="p-4 grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="aspect-[3/4] rounded-xl overflow-hidden relative group">
            <img src={p.url} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-active:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
              {!p.isMain && (
                <button onClick={() => handleSetMain(p.id)}
                  className="text-xs bg-white/90 text-gray-900 px-2 py-1 rounded-full font-medium">
                  Set main
                </button>
              )}
              <button onClick={() => handleDeletePhoto(p.id)}
                className="text-xs bg-red-500/90 text-white px-2 py-1 rounded-full font-medium">
                Remove
              </button>
            </div>
            {p.isMain && (
              <div className="absolute bottom-1 left-1 text-[10px] fonqa-gradient text-white px-1.5 py-0.5 rounded-full">
                Main
              </div>
            )}
          </div>
        ))}
        {photos.length < 6 && (
          <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer">
            <Camera size={22} className="text-gray-500 mb-1" />
            <span className="text-xs text-gray-500">Add</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        )}
      </div>

      {/* Identity */}
      <div className="px-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tg-text">
                {user?.firstName}{profile?.age ? `, ${profile.age}` : ''}
              </h2>
              {isVerified && <span className="verified-badge">✓ Verified</span>}
            </div>
            {profile?.city && <p className="text-sm tg-hint mt-0.5">📍 {profile.city}</p>}
            {profile?.occupation && <p className="text-sm tg-hint">💼 {profile.occupation}</p>}
          </div>
          <button onClick={() => navigate('/profile/edit')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface)', color: 'var(--brand)' }}>
            <Edit2 size={14} /> Edit
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {isPremium && (
            <span className="premium-badge">⭐ Premium</span>
          )}
          {!isVerified && (
            <button onClick={() => navigate('/verify')}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border"
              style={{ borderColor: 'rgba(96,165,250,0.4)', color: '#60a5fa' }}>
              <Shield size={12} /> Get verified
            </button>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile?.bio && (
        <div className="mx-4 mt-3 p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
          <p className="text-sm tg-text leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Details grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-2">
        {[
          profile?.lookingFor && ['💑 Looking for', FIELD_LABELS.lookingFor[profile.lookingFor]],
          profile?.education  && ['🎓 Education',   FIELD_LABELS.education[profile.education]],
          profile?.religion   && ['🙏 Religion',    FIELD_LABELS.religion[profile.religion]],
          profile?.kidsStatus && ['👶 Kids',        FIELD_LABELS.kidsStatus[profile.kidsStatus]],
        ].filter(Boolean).map(([label, value]) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
            <p className="text-xs tg-hint mb-0.5">{label}</p>
            <p className="text-sm font-medium tg-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Interests */}
      {profile?.interests?.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-sm tg-hint mb-2">Interests</p>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map(i => (
              <span key={i} className="interest-pill">{i}</span>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="px-4 mt-6 space-y-2 pb-8">
        {[
          { icon: Star,   label: 'Premium',       to: '/premium',  color: '#ffca28' },
          { icon: Shield, label: 'Verification',  to: '/verify',   color: '#60a5fa' },
          { icon: Users,  label: 'Invite Friends', to: '/referral', color: '#4ade80' },
          { icon: Settings, label: 'Settings',    to: '/settings', color: 'var(--text-muted)' },
        ].map(({ icon: Icon, label, to, color }) => (
          <button key={to} onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
            style={{ background: 'var(--surface)' }}>
            <Icon size={18} style={{ color, flexShrink: 0 }} />
            <p className="text-sm font-medium tg-text">{label}</p>
            <span className="ml-auto text-gray-600">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
