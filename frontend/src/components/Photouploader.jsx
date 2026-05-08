// src/components/PhotoUploader.jsx — (B) upload + auto-crop to portrait + clear errors
import { useState, useRef } from 'react';
import { Camera, X, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadAPI } from '../services/api';

const ERROR_MESSAGES = {
  FILE_TOO_LARGE:   'File too large (max 5 MB). Please compress your image.',
  UNSUPPORTED_FORMAT:'Unsupported format. Use JPG, PNG, or WebP.',
  NSFW:             'Photo rejected: adult or explicit content detected.',
  VIOLENCE:         'Photo rejected: violent content detected.',
  NO_FACE:          'No face detected. Upload a clear photo of your face.',
  DUPLICATE_PHOTO:  'This photo is a duplicate of one you already uploaded.',
  MODERATION:       'Photo did not pass our safety review.',
  NO_FILE:          'No file selected.',
  MAX_PHOTOS:       'You have reached the maximum of 6 photos.',
};

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB   = 5;

/** Crop + resize image to 800×1000 portrait via canvas (B) */
function cropToPortrait(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const TARGET_W = 800;
      const TARGET_H = 1000;
      const TARGET_RATIO = TARGET_W / TARGET_H;   // 0.8

      let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
      const srcRatio = img.width / img.height;

      if (srcRatio > TARGET_RATIO) {
        // Image is wider — crop sides
        srcW = Math.round(img.height * TARGET_RATIO);
        srcX = Math.round((img.width - srcW) / 2);
      } else {
        // Image is taller — crop top/bottom (keep top — face is usually there)
        srcH = Math.round(img.width / TARGET_RATIO);
        srcY = 0;
      }

      const canvas  = document.createElement('canvas');
      canvas.width  = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, TARGET_W, TARGET_H);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function PhotoUploader({ photos, setPhotos, max = 6 }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);

    for (const raw of files) {
      if (photos.length >= max) { toast.error(ERROR_MESSAGES.MAX_PHOTOS); break; }

      // Client-side validation
      if (!ALLOWED.includes(raw.type)) {
        toast.error(ERROR_MESSAGES.UNSUPPORTED_FORMAT); continue;
      }
      if (raw.size > MAX_MB * 1024 * 1024) {
        toast.error(ERROR_MESSAGES.FILE_TOO_LARGE); continue;
      }

      const toastId = toast.loading('Preparing photo…');
      try {
        // (B) Auto-crop to portrait before uploading
        const file = await cropToPortrait(raw);
        toast.loading('Uploading…', { id: toastId });

        const data = await uploadAPI.uploadPhoto(file);
        setPhotos(prev => [...prev, data.photo]);
        toast.success('Photo added!', { id: toastId });
      } catch (err) {
        const code = Object.keys(ERROR_MESSAGES).find(k =>
          err.message?.toUpperCase().includes(k)
        );
        toast.error(code ? ERROR_MESSAGES[code] : (err.message || 'Upload failed'), {
          id: toastId,
          duration: 5000,
        });
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async (photo) => {
    const id = toast.loading('Removing…');
    try {
      await uploadAPI.deletePhoto(photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast.success('Removed', { id });
    } catch { toast.error('Failed to remove', { id }); }
  };

  const handleSetMain = async (photo) => {
    try {
      await uploadAPI.setMainPhoto(photo.id);
      setPhotos(prev => prev.map(p => ({ ...p, isMain: p.id === photo.id })));
      toast.success('Main photo updated');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="aspect-[3/4] rounded-xl overflow-hidden relative group">
            <img src={p.url} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-active:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
              {!p.isMain && (
                <button onClick={() => handleSetMain(p)}
                  className="flex items-center gap-1 text-xs bg-white/90 text-gray-900 px-2.5 py-1.5 rounded-full font-medium">
                  <Star size={11} /> Set main
                </button>
              )}
              <button onClick={() => handleDelete(p)}
                className="text-xs bg-red-500/90 text-white px-2.5 py-1.5 rounded-full font-medium">
                Remove
              </button>
            </div>
            {p.isMain && (
              <div className="absolute bottom-1 left-1 text-[10px] fonqa-gradient text-white px-1.5 py-0.5 rounded-full font-medium">
                Main
              </div>
            )}
          </div>
        ))}

        {photos.length < max && (
          <label
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition-colors"
            style={{ opacity: uploading ? 0.5 : 1, pointerEvents: uploading ? 'none' : 'auto' }}>
            {uploading
              ? <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              : <>
                  <Camera size={22} className="text-gray-500 mb-1" />
                  <span className="text-xs text-gray-500">Add photo</span>
                </>}
            <input ref={inputRef} type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple className="hidden" onChange={handleFiles} />
          </label>
        )}
      </div>
      <p className="text-xs tg-hint">
        JPG · PNG · WebP · max {MAX_MB} MB · face required · auto-cropped to portrait · {photos.length}/{max}
      </p>
    </div>
  );
}
