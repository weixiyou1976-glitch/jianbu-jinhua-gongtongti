import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function SkillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ learned: '', practiced: '', gained: '' });
  const [submitting, setSubmitting] = useState(false);
  const [stampNumber, setStampNumber] = useState(null);

  function load() {
    api
      .getSkill(id)
      .then(setSkill)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setSkill(null);
    setStampNumber(null);
    setForm({ learned: '', practiced: '', gained: '' });
    load();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api.submitStamp(id, form);
      setStampNumber(res.stamp_number);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !skill) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <p className="text-vermilion text-sm">{error}</p>
      </div>
    );
  }

  if (!skill) {
    return <div className="min-h-screen bg-paper" />;
  }

  const stamp = skill.stamp;

  return (
    <div className="min-h-screen bg-paper pb-16">
      <header className="max-w-content mx-auto px-6 pt-6 pb-2">
        <Link to="/skills" className="text-xs text-ink/40">← 返回 Skill 库</Link>
      </header>

      <main className="max-w-content mx-auto px-6 space-y-10">
        {/* 1. Skill触发器 */}
        <section className="border border-vermilion/20 rounded-2xl p-6 bg-white/50">
          <p className="text-xs text-ink/40 mb-2">第 {skill.week_number} 周 · {skill.category}</p>
          <h1 className="text-2xl font-bold text-vermilion mb-4">{skill.skill_name}</h1>

          <div className="mb-4">
            <p className="text-xs text-ink/50 mb-1">触发条件</p>
            <p className="text-sm text-ink leading-relaxed">{skill.trigger_condition}</p>
          </div>

          <div className="space-y-2 mb-4">
            <p className="text-xs text-ink/50">三步动作</p>
            {[skill.step_one, skill.step_two, skill.step_three].map((step, i) => (
              <div key={i} className="flex gap-3 text-sm text-ink">
                <span className="text-vermilion font-semibold shrink-0">{i + 1}</span>
                <p className="leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-vermilion/15 pt-4">
            <p className="text-xs text-ink/50 mb-1">记忆锚点</p>
            <p className="text-xl font-bold text-vermilion leading-snug">{skill.memory_anchor}</p>
          </div>
        </section>

        {/* 2. 洞察 */}
        <section>
          <h2 className="text-sm font-semibold text-ink/70 mb-3">洞察</h2>
          <p className="text-sm text-ink leading-loose whitespace-pre-line">{skill.insight}</p>
        </section>

        {/* 3. 案例 */}
        <section>
          <h2 className="text-sm font-semibold text-ink/70 mb-3">案例</h2>
          <p className="text-sm text-ink leading-loose whitespace-pre-line">{skill.case_study}</p>
        </section>

        {/* 4. 认知重构 */}
        <section className="bg-vermilion/5 border border-vermilion/15 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-vermilion mb-3">认知重构</h2>
          <p className="text-sm text-ink leading-loose whitespace-pre-line">{skill.cognitive_reframe}</p>
        </section>

        {/* 这一关·成长摩擦 */}
        {skill.growth_friction && (
          <section>
            <h2 className="text-sm font-semibold text-ink/70 mb-3">这一关 · 成长摩擦</h2>
            <p className="text-sm text-ink/70 leading-loose mb-4">
              每一个真实的 Skill，安装时都会产生摩擦。这不是出错的信号，而是你的能力边界正在被推动的信号。
            </p>
            <p className="text-sm text-ink/50 mb-2">这个 Skill 的摩擦点通常在这里：</p>
            <blockquote className="border-l-2 border-vermilion/40 pl-4 text-sm text-ink leading-loose whitespace-pre-line italic">
              {skill.growth_friction}
            </blockquote>
            <p className="text-sm text-ink/70 leading-loose mt-4">
              这一关，没有办法绕过去，只能穿过去。穿过去的那一刻，Skill 才算真正装进来了。
            </p>
          </section>
        )}

        {/* 5. 策印提交区 */}
        <section className="border border-ink/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">策印提交</h2>

          {stamp || stampNumber ? (
            <div>
              <p className="text-vermilion font-semibold mb-4">
                第 {stampNumber ?? '—'} 枚策印{stampNumber ? '已生成' : ''}
              </p>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-ink/50 mb-1">我学了</p>
                  <p className="text-ink">{stamp?.learned ?? form.learned}</p>
                </div>
                <div>
                  <p className="text-xs text-ink/50 mb-1">我练了</p>
                  <p className="text-ink">{stamp?.practiced ?? form.practiced}</p>
                </div>
                <div>
                  <p className="text-xs text-ink/50 mb-1">我得到了</p>
                  <p className="text-ink">{stamp?.gained ?? form.gained}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-ink/50 mb-1 block">我学了</label>
                <textarea
                  value={form.learned}
                  onChange={(e) => setForm((f) => ({ ...f, learned: e.target.value }))}
                  className="w-full border border-ink/15 rounded-lg p-3 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink/50 mb-1 block">我练了</label>
                <textarea
                  value={form.practiced}
                  onChange={(e) => setForm((f) => ({ ...f, practiced: e.target.value }))}
                  className="w-full border border-ink/15 rounded-lg p-3 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink/50 mb-1 block">我得到了</label>
                <textarea
                  value={form.gained}
                  onChange={(e) => setForm((f) => ({ ...f, gained: e.target.value }))}
                  className="w-full border border-ink/15 rounded-lg p-3 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
                  rows={2}
                  required
                />
              </div>
              {error && <p className="text-vermilion text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? '提交中…' : '提交策印'}
              </button>
            </form>
          )}
        </section>

        {/* 6. 上一个/下一个导航 */}
        <nav className="flex justify-between text-sm pt-4 border-t border-ink/10">
          {skill.prev ? (
            <button onClick={() => navigate(`/skill/${skill.prev.id}`)} className="text-ink/60">
              ← 上一个：{skill.prev.title}
            </button>
          ) : (
            <span />
          )}
          {skill.next ? (
            <button onClick={() => navigate(`/skill/${skill.next.id}`)} className="text-ink/60 ml-auto">
              下一个：{skill.next.title} →
            </button>
          ) : (
            <span />
          )}
        </nav>
      </main>
    </div>
  );
}
