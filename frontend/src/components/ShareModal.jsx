import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { generateShareImage } from '../lib/shareImage';

function getSaveInstruction() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  if (isIOS) {
    return (
      <>
        👇 长按下方图片 → 选择&apos;共享&apos;→ 发给微信好友
        <br />
        朋友在微信里长按图片即可扫码体验
      </>
    );
  }
  if (isAndroid) {
    return (
      <>
        👇 长按下方图片 → 选择&apos;保存图片&apos;→ 打开微信发给好友
        <br />
        朋友在微信里长按图片即可扫码体验
      </>
    );
  }
  return '👇 长按下方图片保存，发到微信让朋友扫码体验';
}

export default function ShareModal({ skill, shareType, gainedText, onClose }) {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const referralCode = user?.referral_code;

  useEffect(() => {
    let cancelled = false;
    if (!referralCode) {
      setError('生成分享内容需要先刷新页面，请稍后重试');
      return;
    }
    api.recordShare(skill.id, shareType).catch(() => {});
    generateShareImage({ skill, gainedText: shareType === 'stamped' ? gainedText : '', referralCode })
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

  const shareLink = referralCode
    ? `${window.location.origin}/trial?ref=${referralCode}&skill=${skill.id}&type=${shareType}`
    : '';

  function handleCopyLink() {
    if (!shareLink) return;
    navigator.clipboard?.writeText(shareLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-paper rounded-2xl p-5 max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">分享给你关心的人</h2>
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
              className="w-full mx-auto rounded-xl border border-ink/10 mb-4 block"
              style={{ maxWidth: 375 }}
            />

            <button
              onClick={handleCopyLink}
              className="w-full border border-vermilion/30 text-vermilion rounded-lg py-3 text-sm font-medium"
            >
              {copied ? '✓ 链接已复制' : '复制链接'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
