import { useState } from 'react';

const WECHAT_ID = '751759951';

export default function TrialJoinCard() {
  const [copied, setCopied] = useState(false);

  function handleJoin() {
    navigator.clipboard?.writeText(WECHAT_ID).catch(() => {});
    setCopied(true);
  }

  return (
    <div className="border border-vermilion/30 rounded-2xl p-6 bg-vermilion/5 text-center">
      <p className="text-xs text-vermilion font-semibold tracking-wide mb-1">创始成员 · 限额100席</p>
      <p className="text-2xl font-bold text-ink mb-4">¥499/年</p>
      <button
        onClick={handleJoin}
        className={`w-full rounded-lg py-3 text-sm font-medium transition-colors ${
          copied ? 'bg-ink/10 text-ink' : 'bg-vermilion text-paper'
        }`}
      >
        {copied ? `✓ 微信号已复制：${WECHAT_ID}，打开微信添加傲龙老师` : '立即加入'}
      </button>
    </div>
  );
}
