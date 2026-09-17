import { useEffect, useState } from 'react';
import { api } from '../api';
import TrialCoachPanel from '../components/TrialCoachPanel';
import TrialJoinCard from '../components/TrialJoinCard';
import InsightAudioButton from '../components/InsightAudioButton';
import AoLongAvatar from '../components/AoLongAvatar';

const TRIAL_TOKEN_KEY = 'trialToken';
const REFERRAL_KEY = 'trialReferral';
const REFERRAL_CLICK_TRACKED_KEY = 'trialReferralClickTracked';
const PENDING_REFERRAL_CODE_KEY = 'pendingReferralCode';
const ALREADY_USED_MSG = '你已经体验过了，欢迎加入渐步';
const EXPIRED_MSG = '体验时间已结束，欢迎加入渐步';
const NO_MATCH_MSG = '还没有匹配到Skill';

function readReferralFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  const skill = params.get('skill');
  const type = params.get('type');
  if (ref && skill && (type === 'stamped' || type === 'basic')) {
    return { ref, skill_id: Number(skill), share_type: type };
  }
  return null;
}

function getStoredReferral() {
  try {
    const raw = sessionStorage.getItem(REFERRAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function WechatScreen({ onStarted, onAlreadyUsed, referral }) {
  const [wechatId, setWechatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!wechatId.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.trialStart(wechatId.trim(), referral || undefined);
      localStorage.setItem(TRIAL_TOKEN_KEY, res.token);
      onStarted();
    } catch (err) {
      if (err.message === ALREADY_USED_MSG) {
        onAlreadyUsed();
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-ink mb-2">先体验一次，再决定要不要加入</h1>
        <p className="text-sm text-ink/50 mb-8 leading-relaxed">
          把本事练进骨子里——先免费体验一次
        </p>
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <input
            value={wechatId}
            onChange={(e) => setWechatId(e.target.value)}
            placeholder="请输入你的微信号"
            className="w-full border border-vermilion/20 bg-white/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-vermilion"
            required
          />
          {error && <p className="text-vermilion text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !wechatId.trim()}
            className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? '处理中…' : '开始体验'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UsedScreen() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-lg font-semibold text-ink mb-8">{ALREADY_USED_MSG}</p>
        <TrialJoinCard />
      </div>
    </div>
  );
}

function ExpiredScreen() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-lg font-semibold text-ink mb-8">{EXPIRED_MSG}</p>
        <TrialJoinCard />
      </div>
    </div>
  );
}

function ConcernScreen({ onMatched, onExpired }) {
  const [concern, setConcern] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = concern.trim();
    if (trimmed.length < 15 || trimmed.length > 200 || loading) return;
    setLoading(true);
    setError('');
    try {
      const skill = await api.trialMatch(trimmed);
      onMatched(skill);
    } catch (err) {
      if (err.message === EXPIRED_MSG) {
        onExpired();
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const count = concern.trim().length;

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-ink mb-2">说说你现在最困扰的一件事</h1>
        <p className="text-sm text-ink/50 mb-8 leading-relaxed">越具体越好，系统会为你找到最匹配的Skill</p>
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <textarea
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder="比如：我知道要早起，但每天还是拖到最后一刻；或者：和某人说话总是说不到点子上……"
            rows={5}
            maxLength={200}
            className="w-full border border-vermilion/20 bg-white/60 rounded-lg px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-vermilion"
            required
          />
          <p className="text-xs text-ink/35 text-right">{count}/200（至少15字）</p>
          {error && <p className="text-vermilion text-sm">{error}</p>}
          {loading ? (
            <p className="text-center text-sm text-vermilion py-3">正在为你匹配最合适的Skill……</p>
          ) : (
            <button
              type="submit"
              disabled={count < 15 || count > 200}
              className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium disabled:opacity-50"
            >
              为我找Skill
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function SkillScreen({ skill, onDone, onExpired }) {
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [form, setForm] = useState({ learned: '', practiced: '', gained: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [skill.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.learned.trim() || !form.practiced.trim() || !form.gained.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.trialSubmitStamp({
        skill_id: skill.id,
        learned: form.learned.trim(),
        practiced: form.practiced.trim(),
        gained: form.gained.trim(),
      });
      onDone(skill);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper pb-16">
      <div className="bg-vermilion text-paper text-center text-xs py-2 px-4">
        你正在体验渐步的第 {skill.week_number} 周Skill · 渐步有300＋个Skill，持续增加中
      </div>

      <main className="max-w-content mx-auto px-6 pt-8 space-y-10">
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
                <span key={tag} className="text-xs text-ink/50 bg-ink/5 rounded-full px-2.5 py-1">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </section>

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

        <section>
          <h2 className="text-sm font-semibold text-ink/70 mb-3">案例</h2>
          <p className="text-sm text-ink leading-loose whitespace-pre-line">{skill.case_study}</p>
        </section>

        <section className="bg-vermilion/5 border border-vermilion/15 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-vermilion mb-3">认知重构</h2>
          <p className="text-sm text-ink leading-loose whitespace-pre-line">{skill.cognitive_reframe}</p>
        </section>

        {skill.growth_friction && (
          <section>
            <h2 className="text-sm font-semibold text-ink/70 mb-3">这一关 · 成长摩擦</h2>
            <blockquote className="border-l-2 border-vermilion/40 pl-4 text-sm text-ink leading-loose whitespace-pre-line italic">
              {skill.growth_friction}
            </blockquote>
          </section>
        )}

        <TrialCoachPanel skill={skill} onExpired={onExpired} />

        <section className="border border-ink/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">策印提交</h2>
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
            {submitError && <p className="text-vermilion text-sm">{submitError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? '提交中…' : '提交策印'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

const HOOK_WECHAT_ID = '751759951';

function SkillLockPreview({ skill }) {
  return (
    <div className="flex items-start gap-3 bg-white rounded-lg p-3.5">
      <span className="text-ink/30 shrink-0" style={{ fontSize: 20 }}>🔒</span>
      <div className="text-left min-w-0">
        <p className="text-sm font-bold text-ink/70">{skill.skill_name}</p>
        <p className="text-xs text-ink/40 mt-0.5">{skill.trigger_condition_preview}</p>
      </div>
    </div>
  );
}

function CliffhangerHook() {
  const [otherSkills, setOtherSkills] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getTrialOtherSkills().then(setOtherSkills).catch(() => {});
  }, []);

  function handleJoin() {
    navigator.clipboard?.writeText(HOOK_WECHAT_ID).catch(() => {});
    setCopied(true);
  }

  if (otherSkills.length === 0) return null;

  return (
    <div className="mt-8 text-left">
      <p className="text-sm font-bold text-ink text-center mb-4">渐步里还有300+个Skill在等你</p>
      <div className="space-y-2 bg-ink/5 rounded-2xl p-3">
        {otherSkills.map((s, i) => (
          <SkillLockPreview key={i} skill={s} />
        ))}
      </div>
      <p className="text-xs text-ink/40 text-center mt-3 mb-4">这些Skill，都在等你用出来</p>
      <button
        onClick={handleJoin}
        className={`w-full rounded-lg py-3 text-sm font-medium transition-colors ${
          copied ? 'bg-ink/10 text-ink' : 'bg-vermilion text-paper'
        }`}
      >
        {copied ? `✓ 微信号已复制：${HOOK_WECHAT_ID}，打开微信添加傲龙老师` : '立即加入，解锁全部300+个Skill'}
      </button>
    </div>
  );
}

function DoneScreen({ skill }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-ink mb-2">你刚才完成了第一枚策印</h1>
        <p className="text-sm text-vermilion font-semibold mb-4">{skill.skill_name}</p>
        <p className="text-sm text-ink/50 text-center mb-2">把本事练进骨子里，不是把知识装进大脑里</p>
        <p className="text-sm text-ink/60 leading-relaxed mb-8">
          渐步里还有300+这样的Skill，持续增加，遇到什么处境就用什么Skill
        </p>
        <TrialJoinCard />
        <p className="text-xs text-ink/35 leading-relaxed mt-6">
          你的AI陪练对话记录已保存，加入后可以继续接着聊
        </p>
        <CliffhangerHook />
      </div>
    </div>
  );
}

export default function Trial() {
  const [phase, setPhase] = useState('loading');
  const [skill, setSkill] = useState(null);
  const [referral, setReferral] = useState(null);

  useEffect(() => {
    const rawRef = new URLSearchParams(window.location.search).get('ref');
    if (rawRef) {
      try {
        localStorage.setItem(PENDING_REFERRAL_CODE_KEY, rawRef);
      } catch {
        // 忽略隐私模式下localStorage不可用的情况
      }
      api.trackReferralClick(rawRef).catch(() => {});
    }

    const urlReferral = readReferralFromUrl();
    const activeReferral = urlReferral || getStoredReferral();
    setReferral(activeReferral);

    if (urlReferral) {
      try {
        sessionStorage.setItem(REFERRAL_KEY, JSON.stringify(urlReferral));
      } catch {
        // 忽略隐私模式下sessionStorage不可用的情况
      }
      const trackedKey = JSON.stringify(urlReferral);
      if (sessionStorage.getItem(REFERRAL_CLICK_TRACKED_KEY) !== trackedKey) {
        api.recordReferralClick(urlReferral.ref, urlReferral.skill_id, urlReferral.share_type).catch(() => {});
        try {
          sessionStorage.setItem(REFERRAL_CLICK_TRACKED_KEY, trackedKey);
        } catch {
          // 忽略隐私模式下sessionStorage不可用的情况
        }
      }
    }

    const token = localStorage.getItem(TRIAL_TOKEN_KEY);
    if (!token) {
      setPhase('wechat');
      return;
    }
    api
      .getTrialSkill()
      .then((s) => {
        setSkill(s);
        setPhase('skill');
      })
      .catch((err) => {
        if (err.message === NO_MATCH_MSG) {
          setPhase('concern');
        } else if (err.message === EXPIRED_MSG) {
          setPhase('expired');
        } else {
          localStorage.removeItem(TRIAL_TOKEN_KEY);
          setPhase('wechat');
        }
      });
  }, []);

  if (phase === 'loading') return <div className="min-h-screen bg-paper" />;
  if (phase === 'wechat') {
    return (
      <WechatScreen
        referral={referral}
        onStarted={() => setPhase('concern')}
        onAlreadyUsed={() => setPhase('used')}
      />
    );
  }
  if (phase === 'used') return <UsedScreen />;
  if (phase === 'expired') return <ExpiredScreen />;
  if (phase === 'concern') {
    return (
      <ConcernScreen
        onMatched={(s) => {
          setSkill(s);
          setPhase('skill');
        }}
        onExpired={() => setPhase('expired')}
      />
    );
  }
  if (phase === 'skill' && skill) {
    return (
      <SkillScreen
        skill={skill}
        onDone={(s) => {
          setSkill(s);
          setPhase('done');
        }}
        onExpired={() => setPhase('expired')}
      />
    );
  }
  if (phase === 'done' && skill) return <DoneScreen skill={skill} />;

  return <div className="min-h-screen bg-paper" />;
}
