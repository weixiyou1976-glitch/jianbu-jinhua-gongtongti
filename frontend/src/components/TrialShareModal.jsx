import { useEffect, useState } from 'react';
import { generateTrialShareImage } from '../lib/shareImage';

function getSaveInstruction() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  if (isIOS) {
    return "👇 长按图片 → 选择'共享'或'存储图像' → 发给朋友";
  }
  if (isAndroid) {
    return "👇 长按图片 → 选择'保存图片' → 发给朋友";
  }
  return '👇 长按下方图片保存，发给朋友';
}

export default function TrialShareModal({ concern, skillName, gainedText, refCode, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    generateTrialShareImage({ concern, skillName, gainedText, refCode })
      .then((url) => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('图片生成失败，请稍后再试');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-paper rounded-2xl p-5 max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">把这次体验发给朋友</h2>
          <button onClick={onClose} className="text-ink/40 text-lg leading-none px-1">×</button>
        </div>

        {error && <p className="text-vermilion text-sm mb-3">{error}</p>}

        {!imageUrl && !error && (
          <div className="aspect-[3/4] flex items-center justify-center border border-ink/10 rounded-xl bg-white/40">
            <p className="text-sm text-ink/40">正在生成分享图片…</p>
          </div>
        )}

        {imageUrl && (
          <>
            <p
              className="text-center leading-relaxed mb-3"
              style={{ fontSize: 12, color: '#888888', backgroundColor: '#FFFBE6', borderRadius: 6, padding: 10 }}
            >
              {getSaveInstruction()}
            </p>
            <img
              src={imageUrl}
              alt="分享图片"
              className="w-full mx-auto rounded-xl border border-ink/10 mb-2 block"
              style={{ maxWidth: 375 }}
            />
          </>
        )}
      </div>
    </div>
  );
}
