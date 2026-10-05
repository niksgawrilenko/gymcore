'use client';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { signUpload } from '@/actions/misc';
import type { Media, PendingMedia } from '@/lib/types';

/** Uploads the selected files straight to Cloudinary using a signature from the server. */
export async function uploadPending(pending: PendingMedia[]): Promise<Media[]> {
  if (!pending.length) return [];
  const sig = await signUpload();
  if (!sig.ok) throw new Error(sig.error);
  const { cloudName, apiKey, timestamp, signature, folder, allowedFormats } = sig.data;

  return Promise.all(
    pending.map(async (p) => {
      const fd = new FormData();
      fd.append('file', p.file);
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);
      fd.append('allowed_formats', allowedFormats);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'fileUploadFailed');
      return { type: json.resource_type === 'video' ? 'video' : 'image', url: json.secure_url } as Media;
    }),
  );
}

export function MediaSection({
  media,
  pending,
  editing,
  onMediaChange,
  onPendingChange,
}: {
  media: Media[];
  pending: PendingMedia[];
  editing: boolean;
  onMediaChange: (m: Media[]) => void;
  onPendingChange: (p: PendingMedia[]) => void;
}) {
  const t = useTranslations('media');
  const fileRef = useRef<HTMLInputElement>(null);
  const empty = media.length === 0 && pending.length === 0;
  if (!editing && media.length === 0) return null;

  return (
    <div className="card mt" style={{ padding: 15 }}>
      <h4 className="mb" style={{ fontSize: 15 }}>
        {t('title')}
      </h4>
      <div className="media-grid">
        {empty && <div className="muted small">{t('empty')}</div>}
        {media.map((m, i) => (
          <Thumb key={m.url} item={m} href={m.url} onRemove={editing ? () => onMediaChange(media.filter((_, j) => j !== i)) : undefined} />
        ))}
        {pending.map((p, i) => (
          <Thumb
            key={p.url}
            item={p}
            pending
            onRemove={() => {
              URL.revokeObjectURL(p.url);
              onPendingChange(pending.filter((_, j) => j !== i));
            }}
          />
        ))}
      </div>
      {editing && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const type = file.type.startsWith('video') ? 'video' : 'image';
                onPendingChange([...pending, { file, url: URL.createObjectURL(file), type }]);
              }
              e.target.value = '';
            }}
          />
          <button type="button" className="dashed-btn accent" onClick={() => fileRef.current?.click()}>
            {t('add')}
          </button>
        </>
      )}
    </div>
  );
}

function Thumb({ item, pending, href, onRemove }: { item: Media; pending?: boolean; href?: string; onRemove?: () => void }) {
  // eslint-disable-next-line @next/next/no-img-element -- blob:/Cloudinary preview, next/image adds nothing here
  const inner = item.type === 'video' ? <video src={item.url} muted playsInline /> : <img src={item.url} alt="" />;
  return (
    <div className={`media-thumb${pending ? ' pending' : ''}`}>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          {inner}
        </a>
      ) : (
        inner
      )}
      {pending && <span className="badge">⏳</span>}
      {onRemove && (
        <button type="button" className="remove" onClick={onRemove}>
          ✕
        </button>
      )}
    </div>
  );
}
