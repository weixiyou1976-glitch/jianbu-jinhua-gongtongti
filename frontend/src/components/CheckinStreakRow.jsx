function practiceFlame(streak) {
  if (streak >= 30) return { icon: '🔥🔥🔥', glow: true };
  if (streak >= 14) return { icon: '🔥🔥', glow: false };
  if (streak >= 7) return { icon: '🔥', glow: false };
  if (streak >= 3) return { icon: '🔥', glow: false };
  return { icon: '', glow: false };
}

function Column({ iconColor, icon, label, days, sublabel, accent, glow }) {
  return (
    <div
      className="flex-1 flex flex-col items-center text-center py-3 px-2"
      style={glow ? { boxShadow: '0 0 14px 3px rgba(212,175,55,0.5)', borderRadius: 12 } : undefined}
    >
      <p className="text-xs text-ink/50 flex items-center gap-1">
        {icon && <span style={iconColor ? { color: iconColor } : undefined}>{icon}</span>}
        {label}
      </p>
      <p className="mt-1" style={{ fontSize: accent ? 24 : 20, fontWeight: 700, color: accent ? '#C41E1E' : '#2B2B2B' }}>
        {days}
        <span className="text-xs font-normal" style={{ color: accent ? '#C41E1E' : '#2B2B2B', opacity: 0.6 }}>
          天
        </span>
      </p>
      <p className="text-[11px] text-ink/35 mt-0.5">{sublabel}</p>
    </div>
  );
}

export default function CheckinStreakRow({ visitStreak, learningStreak, practiceStreak }) {
  const flame = practiceFlame(practiceStreak);
  return (
    <div className="flex items-stretch border border-ink/10 rounded-2xl mb-8 bg-white/40 divide-x divide-ink/10">
      <Column iconColor="#9CA3AF" icon="📅" label="连续访问" days={visitStreak} sublabel="每天打开" />
      <Column iconColor="#3B82F6" icon="📖" label="连续学习" days={learningStreak} sublabel="每天读Skill" />
      <Column
        icon={flame.icon}
        label="实战连续"
        days={practiceStreak}
        sublabel="每天用出来"
        accent
        glow={flame.glow}
      />
    </div>
  );
}
