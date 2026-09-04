import { useNavigate } from 'react-router-dom';

export default function SkillCard({ skill }) {
  const navigate = useNavigate();
  const locked = skill.unlocked === false;
  const tags = skill.tags || [];

  function handleTagClick(e, tag) {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/tag/${encodeURIComponent(tag)}`);
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/skill/${skill.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/skill/${skill.id}`)}
      className={`relative block border rounded-xl p-4 transition-colors cursor-pointer ${
        locked
          ? 'border-ink/5 bg-white/20 opacity-50 grayscale'
          : 'border-ink/10 bg-white/40 hover:border-vermilion/30'
      }`}
    >
      {locked && <span className="absolute top-3 right-3 text-sm">🔒</span>}
      <div className="flex items-center justify-between mb-1 pr-5">
        <span className="text-xs text-ink/40">第 {skill.week_number} 周</span>
        <span className="text-xs bg-vermilion/10 text-vermilion rounded-full px-2 py-0.5">{skill.category}</span>
      </div>
      <p className="text-sm font-medium text-ink">{skill.skill_name}</p>
      {skill.stamped && <span className="text-xs text-vermilion mt-1 inline-block">✓ 已打卡</span>}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={(e) => handleTagClick(e, tag)}
              className="text-xs text-ink/50 bg-ink/5 rounded-full px-2 py-0.5 hover:bg-vermilion/10 hover:text-vermilion"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
