import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { generateShareImage } from '../lib/shareImage';

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

  async function handleSave() {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `渐步-${skill.skill_name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // 忽略保存失败，用户仍可长按图片保存
    }
  }

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
          <img src={imageUrl} alt="分享图片" className="w-full rounded-xl border border-ink/10 mb-4" />
        )}

        {imageUrl && (
          <div className="space-y-2">
            <button
              onClick={handleSave}
              className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium"
            >
              保存图片
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full border border-vermilion/30 text-vermilion rounded-lg py-3 text-sm font-medium"
            >
              {copied ? '✓ 链接已复制' : '复制链接'}
            </button>
            <p className="text-xs text-ink/35 text-center pt-1">长按图片也可以直接保存</p>
          </div>
        )}
      </div>
    </div>
  );
}
