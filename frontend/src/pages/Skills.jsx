import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import BottomNav from '../components/BottomNav';
import SkillCard from '../components/SkillCard';

const SEASONS = [
  { label: '认知重启', range: [1, 13] },
  { label: '行动破局', range: [14, 26] },
  { label: '关系与影响力', range: [27, 39] },
  { label: '变现实战', range: [40, 52] },
];

export default function Skills() {
  const [tab, setTab] = useState('week');
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.getSkills().then(setSkills).catch((err) => setError(err.message));
  }, []);

  const byWeek = useMemo(() => {
    const seasons = SEASONS.map((season) => ({
      ...season,
      items: skills.filter((s) => s.week_number >= season.range[0] && s.week_number <= season.range[1]),
    }));
    const lastRangeEnd = SEASONS.length ? SEASONS[SEASONS.length - 1].range[1] : 0;
    const rest = skills.filter((s) => s.week_number > lastRangeEnd);
    if (rest.length) {
      const maxWeek = Math.max(...rest.map((s) => s.week_number));
      seasons.push({ label: '持续更新', range: [lastRangeEnd + 1, maxWeek], items: rest });
    }
    return seasons;
  }, [skills]);

  const byCategory = useMemo(() => {
    const seen = [];
    for (const s of skills) {
      if (!seen.includes(s.category)) seen.push(s.category);
    }
    return seen.map((cat) => ({
      label: cat,
      items: skills.filter((s) => s.category === cat),
    }));
  }, [skills]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return skills.filter(
      (s) =>
        s.skill_name.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (s.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  }, [skills, query]);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4">
        <h1 className="text-lg font-semibold text-ink mb-4">Skill 总库</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索 Skill 名称或标签"
          className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
        />
        {!query.trim() && (
          <div className="flex mt-4 border-b border-vermilion/15">
            <button
              className={`flex-1 pb-3 text-sm ${tab === 'week' ? 'text-vermilion border-b-2 border-vermilion font-semibold' : 'text-ink/40'}`}
              onClick={() => setTab('week')}
            >
              按周次
            </button>
            <button
              className={`flex-1 pb-3 text-sm ${tab === 'category' ? 'text-vermilion border-b-2 border-vermilion font-semibold' : 'text-ink/40'}`}
              onClick={() => setTab('category')}
            >
              按类型
            </button>
          </div>
        )}
      </header>

      <main className="max-w-content mx-auto px-6 space-y-8">
        {error && <p className="text-vermilion text-sm">{error}</p>}

        {searchResults && (
          <section>
            <h2 className="text-sm font-semibold text-ink/70 mb-3">
              搜索结果 <span className="text-ink/30 font-normal">共 {searchResults.length} 条</span>
            </h2>
            {searchResults.length === 0 ? (
              <p className="text-xs text-ink/30">没有找到匹配的 Skill</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((s) => (
                  <SkillCard key={s.id} skill={s} />
                ))}
              </div>
            )}
          </section>
        )}

        {!searchResults && tab === 'week' &&
          byWeek.map((season) => (
            <section key={season.label}>
              <h2 className="text-sm font-semibold text-ink/70 mb-3">
                {season.label} <span className="text-ink/30 font-normal">第{season.range[0]}-{season.range[1]}周</span>
              </h2>
              {season.items.length === 0 ? (
                <p className="text-xs text-ink/30">暂无内容</p>
              ) : (
                <div className="space-y-2">
                  {season.items.map((s) => (
                    <SkillCard key={s.id} skill={s} />
                  ))}
                </div>
              )}
            </section>
          ))}

        {!searchResults && tab === 'category' &&
          byCategory.map((cat) => (
            <section key={cat.label}>
              <h2 className="text-sm font-semibold text-ink/70 mb-3">{cat.label}</h2>
              {cat.items.length === 0 ? (
                <p className="text-xs text-ink/30">暂无内容</p>
              ) : (
                <div className="space-y-2">
                  {cat.items.map((s) => (
                    <SkillCard key={s.id} skill={s} />
                  ))}
                </div>
              )}
            </section>
          ))}
      </main>

      <BottomNav />
    </div>
  );
}
