import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BottomNav from '../components/BottomNav';

const SEASONS = [
  { label: '认知重启', range: [1, 13] },
  { label: '行动破局', range: [14, 26] },
  { label: '关系与影响力', range: [27, 39] },
  { label: '变现实战', range: [40, 52] },
];

const CATEGORIES = ['表达类', '决策类', '关系类', '变现类', '行动类', '认知类'];

function SkillCard({ skill }) {
  const locked = skill.unlocked === false;
  return (
    <Link
      to={`/skill/${skill.id}`}
      className={`relative block border rounded-xl p-4 transition-colors ${
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
    </Link>
  );
}

export default function Skills() {
  const [tab, setTab] = useState('week');
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSkills().then(setSkills).catch((err) => setError(err.message));
  }, []);

  const byWeek = useMemo(() => {
    return SEASONS.map((season) => ({
      ...season,
      items: skills.filter((s) => s.week_number >= season.range[0] && s.week_number <= season.range[1]),
    }));
  }, [skills]);

  const byCategory = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      label: cat,
      items: skills.filter((s) => s.category === cat),
    }));
  }, [skills]);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4">
        <h1 className="text-lg font-semibold text-ink">Skill 总库</h1>
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
      </header>

      <main className="max-w-content mx-auto px-6 space-y-8">
        {error && <p className="text-vermilion text-sm">{error}</p>}

        {tab === 'week' &&
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

        {tab === 'category' &&
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
