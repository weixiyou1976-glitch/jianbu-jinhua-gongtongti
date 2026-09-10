import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

  const [situation, setSituation] = useState('');
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [matchResults, setMatchResults] = useState(null);

  async function handleMatch() {
    if (!situation.trim() || matchLoading) return;
    setMatchLoading(true);
    setMatchError('');
    setMatchResults(null);
    try {
      const data = await api.matchSkills(situation.trim());
      setMatchResults(data.results || []);
    } catch (err) {
      setMatchError(err.message);
    } finally {
      setMatchLoading(false);
    }
  }

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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-ink">Skill 总库</h1>
          <Link to="/modules" className="text-xs text-vermilion">学习路径 →</Link>
        </div>

        <div className="mb-5 border border-vermilion/15 rounded-xl p-4 bg-white/40">
          <p className="text-sm font-semibold text-ink mb-2">遇到问题了？描述一下处境，帮你找对应的Skill</p>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="描述你现在遇到的处境，比如&quot;我总是拖延，知道要做但开始不了&quot;……"
            rows={3}
            className="w-full border border-ink/15 rounded-lg px-4 py-2.5 text-sm bg-white/60 focus:outline-none focus:border-vermilion resize-none"
          />
          <button
            type="button"
            onClick={handleMatch}
            disabled={!situation.trim() || matchLoading}
            className="mt-2 bg-vermilion text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40"
          >
            {matchLoading ? '正在为你匹配最合适的Skill……' : '找对应的Skill'}
          </button>

          {matchError && <p className="text-vermilion text-xs mt-2">{matchError}</p>}

          {matchResults && (
            <div className="mt-4 space-y-2">
              {matchResults.length === 0 ? (
                <p className="text-xs text-ink/30">没有找到匹配的Skill，换个说法试试？</p>
              ) : (
                matchResults.map((s) => (
                  <div key={s.id} className="border border-ink/10 rounded-lg p-3 bg-white/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink">{s.skill_name}</p>
                          {s.unlocked === false && <span className="text-xs">🔒</span>}
                        </div>
                        <span className="text-xs text-vermilion/80 mt-0.5 inline-block">{s.category}</span>
                        {s.match_reason && <p className="text-xs text-ink/60 mt-1.5">{s.match_reason}</p>}
                      </div>
                      <Link
                        to={`/skill/${s.id}`}
                        className="shrink-0 text-xs text-vermilion border border-vermilion/30 rounded-full px-3 py-1 whitespace-nowrap"
                      >
                        去学习
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

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
