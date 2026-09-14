import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import CoachPanel from '../components/CoachPanel';
import InsightAudioButton from '../components/InsightAudioButton';
import ShareModal from '../components/ShareModal';
import AoLongAvatar from '../components/AoLongAvatar';

const STAMP_EXPLAIN_TEXT =
  '每次在真实场景里用了这个Skill，就提交一枚策印。同一个Skill可以多次提交，每次记录不同的经历。';

const EMPTY_FORM = { learned: '', practiced: '', gained: '' };

function readDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (draft && (draft.learned || draft.practiced || draft.gained)) return draft;
    return null;
  } catch {
    return null;
  }
}

function writeDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // 忽略隐私模式下localStorage不可用的情况
  }
}

function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 忽略隐私模式下localStorage不可用的情况
  }
}

export default function SkillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [stampHistory, setStampHistory] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showStampForm, setShowStampForm] = useState(false);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  const draftKey = stampHistory.length === 0 ? `stamp_draft_${id}` : `stamp_draft_${id}_new`;

  function load() {
    api
      .getSkill(id)
      .then(setSkill)
      .catch((err) => setError(err.message));
  }

  function loadHistory() {
    api
      .getSkillStamps(id)
      .then((rows) => {
        setStampHistory(rows);
        if (rows.length === 0) {
          const draft = readDraft(`stamp_draft_${id}`);
          if (draft) {
            setForm(draft);
            setShowRestoreBanner(true);
          }
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    setSkill(null);
    setStampHistory([]);
    setShowAllHistory(false);
    setShowStampForm(false);
    setForm(EMPTY_FORM);
    setShowRestoreBanner(false);
    setInsightExpanded(false);
    load();
    loadHistory();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateForm(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      writeDraft(draftKey, next);
      return next;
    });
  }

  function handleStartNewStamp() {
    setShowStampForm(true);
    setShowRestoreBanner(false);
    const draft = readDraft(`stamp_draft_${id}_new`);
    if (draft) {
      setForm(draft);
      setShowRestoreBanner(true);
    }
  }

  function handleClearDraft() {
    clearDraft(draftKey);
    setForm(EMPTY_FORM);
    setShowRestoreBanner(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api.submitStamp(id, form);
      clearDraft(draftKey);
      setStampHistory((h) => [res.stamp, ...h]);
      setForm(EMPTY_FORM);
      setShowStampForm(false);
      setShowRestoreBanner(false);
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

  if (skill.locked) {
    const currentSkill = skill.current_skill;
    return (
      <div className="min-h-screen bg-paper pb-16">
        <header className="max-w-content mx-auto px-6 pt-6 pb-2">
          <Link to="/skills" className="text-xs text-ink/40">← 返回 Skill 库</Link>
        </header>
        <main className="max-w-content mx-auto px-6">
          <section className="border border-ink/10 rounded-2xl p-8 bg-white/40 text-center mt-6">
            <p className="text-2xl mb-3">🔒</p>
            <p className="text-base font-semibold text-ink mb-4">第 {skill.week_number} 周 · 尚未解锁</p>
            <p className="text-sm text-ink/60 leading-relaxed mb-2">
              这个 Skill 会在你进度到第 {skill.week_number} 周时解锁。
            </p>
            {currentSkill && (
              <p className="text-sm text-ink/60 leading-relaxed mb-6">
                不如先把当前这周的「{currentSkill.skill_name}」练扎实——
                <br />
                真正的进化，不是看得多，是装得稳。
              </p>
            )}
            {currentSkill ? (
              <button
                onClick={() => navigate(`/skill/${currentSkill.id}`)}
                className="bg-vermilion text-paper rounded-lg px-5 py-2.5 text-sm font-medium"
              >
                返回本周Skill
              </button>
            ) : (
              <button
                onClick={() => navigate('/skills')}
                className="bg-vermilion text-paper rounded-lg px-5 py-2.5 text-sm font-medium"
              >
                返回 Skill 库
              </button>
            )}
          </section>
        </main>
      </div>
    );
  }

  const visibleHistory = showAllHistory ? stampHistory : stampHistory.slice(0, 3);

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

          {skill.key_question && (
            <div className="mb-4">
              <p className="text-xs text-ink/50 mb-1">关键问题</p>
              <p className="text-sm text-ink leading-relaxed font-semibold">{skill.key_question}</p>
            </div>
          )}

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

          {skill.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-vermilion/10">
              {skill.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/tag/${encodeURIComponent(tag)}`}
                  className="text-xs text-ink/50 bg-ink/5 rounded-full px-2.5 py-1 hover:bg-vermilion/10 hover:text-vermilion"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 2. 洞察 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-base font-bold pl-2.5"
              style={{ color: '#C41E1E', borderLeft: '3px solid #C41E1E' }}
            >
              洞察
            </h2>
            {skill.insight_audio_url && (
              <button
                type="button"
                onClick={() => setInsightExpanded((v) => !v)}
                className="text-xs text-vermilion border border-vermilion/30 rounded-full px-2.5 py-1 hover:bg-vermilion/5"
              >
                {insightExpanded ? '收起' : '展开'}
              </button>
            )}
          </div>
          {skill.insight_audio_url && (
            <div
              className="flex items-center justify-between rounded-lg p-3 mb-3"
              style={{ backgroundColor: '#FFF5F5' }}
            >
              <div className="flex items-center gap-2">
                <AoLongAvatar size={32} />
                <span className="text-xs text-ink/50">傲龙 · 语音洞察</span>
              </div>
              <InsightAudioButton src={skill.insight_audio_url} />
            </div>
          )}
          {skill.insight_audio_url ? (
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                insightExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-sm text-ink leading-loose whitespace-pre-line">{skill.insight}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink leading-loose whitespace-pre-line">{skill.insight}</p>
          )}
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
            <blockquote className="border-l-2 border-vermilion/40 pl-4 text-sm text-ink leading-loose whitespace-pre-line italic">
              {skill.growth_friction}
            </blockquote>
          </section>
        )}

        {/* AI陪练 */}
        <CoachPanel skill={skill} />

        {/* 5. 策印提交区 */}
        <section className="border border-ink/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ink mb-2">策印提交</h2>
          <p className="text-xs text-ink/40 leading-relaxed mb-4">{STAMP_EXPLAIN_TEXT}</p>

          {stampHistory.length > 0 && (
            <div className="space-y-3 mb-4">
              {visibleHistory.map((s) => (
                <div key={s.id} className="border border-ink/10 rounded-xl p-3 bg-white/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-ink/40">{s.submitted_at?.slice(0, 10)}</span>
                  </div>
                  <p className="text-sm text-ink/70 line-clamp-1">我得到了：{s.gained}</p>
                </div>
              ))}
              {stampHistory.length > 3 && !showAllHistory && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory(true)}
                  className="text-xs text-vermilion"
                >
                  查看全部 {stampHistory.length} 条 →
                </button>
              )}
            </div>
          )}

          {stampHistory.length > 0 && !showStampForm && (
            <button
              type="button"
              onClick={handleStartNewStamp}
              className="w-full border border-vermilion/30 text-vermilion rounded-lg py-3 text-sm font-medium"
            >
              再练一次，再提一枚
            </button>
          )}

          {(stampHistory.length === 0 || showStampForm) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {showRestoreBanner && (
                <div
                  className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                  style={{ backgroundColor: '#E8F5E9', color: '#666666' }}
                >
                  <span>✓ 已为你恢复上次未提交的内容</span>
                  <button
                    type="button"
                    onClick={() => setShowRestoreBanner(false)}
                    className="text-ink/30 px-1 shrink-0"
                  >
                    ×
                  </button>
                </div>
              )}
              <div>
                <label className="text-xs text-ink/50 mb-1 block">我学了</label>
                <textarea
                  value={form.learned}
                  onChange={(e) => updateForm('learned', e.target.value)}
                  className="w-full border border-ink/15 rounded-lg p-3 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink/50 mb-1 block">我练了</label>
                <textarea
                  value={form.practiced}
                  onChange={(e) => updateForm('practiced', e.target.value)}
                  className="w-full border border-ink/15 rounded-lg p-3 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink/50 mb-1 block">我得到了</label>
                <textarea
                  value={form.gained}
                  onChange={(e) => updateForm('gained', e.target.value)}
                  className="w-full border border-ink/15 rounded-lg p-3 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
                  rows={2}
                  required
                />
              </div>
              {error && <p className="text-vermilion text-sm">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-vermilion text-paper rounded-lg py-3 text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? '提交中…' : '提交策印'}
                </button>
                {stampHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowStampForm(false)}
                    className="text-xs text-ink/40 px-3 shrink-0"
                  >
                    取消
                  </button>
                )}
              </div>
              <div className="text-center">
                <button type="button" onClick={handleClearDraft} className="text-xs text-ink/30 underline">
                  清空重写
                </button>
              </div>
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

        {/* 7. 分享 */}
        <div className="pt-2">
          <button
            onClick={() => setShowShare(true)}
            className="w-full border border-vermilion/30 text-vermilion rounded-lg py-3 text-sm font-medium"
          >
            分享给你关心的人
          </button>
        </div>
      </main>

      {showShare && (
        <ShareModal
          skill={skill}
          shareType={stampHistory.length > 0 ? 'stamped' : 'basic'}
          gainedText={stampHistory[0]?.gained ?? form.gained}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
