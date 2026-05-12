// src/pages/UserProfilePage.jsx — (H) view another user's full profile
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { profileAPI, reportAPI, swipeAPI } from '../services/api';
import BackButton from '../components/BackButton';

const FIELD_LABELS = {
  education:  { high_school:'High School', some_college:'Some College', bachelors:"Bachelor's", masters:"Master's", phd:'PhD', trade_school:'Trade School', other:'Other' },
  religion:   { christian:'Christian', orthodox:'Orthodox', catholic:'Catholic', protestant:'Protestant', muslim:'Muslim', jewish:'Jewish', hindu:'Hindu', buddhist:'Buddhist', other:'Other', none:'None' },
  kidsStatus: { none:'No kids', have_kids:'Has kids', want_kids:'Wants kids', dont_want_kids:"Doesn't want kids", open:'Open about kids' },
  lookingFor: { marriage:'Marriage', relationship:'Relationship', casual:'Casual', friendship:'Friendship', all:'Open to all' },
};

export default function UserProfilePage() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto]     = useState(0);

  useEffect(() => {
    profileAPI.getById(id)
      .then(setData)
      .catch(err => {
        if (err.message.includes('private')) toast.error('This profile is private');
        else toast.error('Could not load profile');
        navigate(-1);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return null;

  const { profile, photos, firstName, isDeactivated } = data;
  const allPhotos = photos || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header (C) */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <BackButton />
        <h1 className="text-base font-semibold tg-text flex-1">{firstName}</h1>
        {isDeactivated && (
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">Inactive</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll">
        {/* Main photo with carousel */}
        <div className="relative w-full" style={{ aspectRatio: '3/4', maxHeight: '70vw' }}>
          {allPhotos.length > 0 ? (
            <img src={allPhotos[photo]?.url} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full fonqa-gradient flex items-center justify-center">
              <span className="text-7xl">👤</span>
            </div>
          )}

          {/* Photo nav */}
          {allPhotos.length > 1 && (
            <>
              <button className="absolute left-0 top-0 w-1/2 h-full z-10"
                onClick={() => setPhoto(p => Math.max(0, p - 1))} />
              <button className="absolute right-0 top-0 w-1/2 h-full z-10"
                onClick={() => setPhoto(p => Math.min(allPhotos.length - 1, p + 1))} />
              <div className="absolute top-3 inset-x-0 flex justify-center gap-1 z-20 pointer-events-none">
                {allPhotos.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i === photo ? 'w-6 bg-white' : 'w-3 bg-white/40'}`} />
                ))}
              </div>
            </>
          )}

          {/* Verified / boosted badges */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
            {profile?.isVerified && (
              <span className="bg-blue-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pt-4 pb-8 space-y-4">
          <div>
            <h2 className="text-2xl font-bold tg-text">
              {firstName}{profile?.age ? `, ${profile.age}` : ''}
            </h2>
            {profile?.city && (
              <p className="text-sm tg-hint mt-0.5">
                📍 {profile.locationLabel || `${profile.city}, ${profile.country || ''}`}
              </p>
            )}
            {profile?.occupation && <p className="text-sm tg-hint">💼 {profile.occupation}</p>}
          </div>

          {profile?.bio && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
              <p className="text-sm tg-text leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              profile?.lookingFor && ['💑 Looking for', FIELD_LABELS.lookingFor[profile.lookingFor]],
              profile?.education  && ['🎓 Education',   FIELD_LABELS.education[profile.education]],
              profile?.religion   && ['🙏 Religion',    FIELD_LABELS.religion[profile.religion]],
              profile?.kidsStatus && profile.kidsStatus !== 'none' && ['👶 Kids', FIELD_LABELS.kidsStatus[profile.kidsStatus]],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
                <p className="text-xs tg-hint mb-0.5">{label}</p>
                <p className="text-sm font-medium tg-text">{value}</p>
              </div>
            ))}
          </div>

          {/* Interests */}
          {profile?.interests?.length > 0 && (
            <div>
              <p className="text-xs tg-hint mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map(i => (
                  <span key={i} className="interest-pill">{i}</span>
                ))}
              </div>
            </div>
          )}

          {/* Report */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => {
              reportAPI.report({ reportedId: id, reason: 'other' });
              toast.success('Report submitted');
            }} className="text-sm text-red-400">🚨 Report this profile</button>
          </div>
        </div>
      </div>
    </div>
  );
}
