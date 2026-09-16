function getFlameTier(streak) {
  if (streak >= 30) return { emoji: '🔥🔥🔥', border: '#C41E1E', glow: true };
  if (streak >= 14) return { emoji: '🔥🔥', border: '#C41E1E', glow: false };
  if (streak >= 7) return { emoji: '🔥', border: '#FF8C42', glow: false };
  if (streak >= 3) return { emoji: '🔥', border: '#999999', glow: false };
  return null;
}

export default function StreakFlame({ streak }) {
  const tier = getFlameTier(streak);

  if (!tier) {
    return (
      <div>
        <p>
          连续打卡 <span className="text-vermilion font-semibold">{streak}</span> 天
        </p>
        <p className="text-[11px] text-ink/35 mt-0.5">每天打开渐步自动打卡</p>
      </div>
    );
  }

  return (
    <div
      className="inline-flex flex-col items-center rounded-2xl px-4 py-2"
      style={{
        border: `2px solid ${tier.border}`,
        boxShadow: tier.glow ? '0 0 14px 3px rgba(212,175,55,0.55)' : 'none',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{tier.emoji}</span>
      <p className="text-sm mt-1">
        连续打卡 <span className="text-vermilion font-semibold">{streak}</span> 天
      </p>
    </div>
  );
}
