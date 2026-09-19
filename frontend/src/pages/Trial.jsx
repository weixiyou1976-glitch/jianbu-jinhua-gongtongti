import { useEffect, useState } from 'react';
import { api } from '../api';
import TrialCoachPanel from '../components/TrialCoachPanel';
import TrialJoinCard from '../components/TrialJoinCard';
import InsightAudioButton from '../components/InsightAudioButton';
import AoLongAvatar from '../components/AoLongAvatar';
import TrialShareModal from '../components/TrialShareModal';
import StampSealDrop from '../components/StampSealDrop';

const WECHAT_ID = '751759951';

const TRIAL_TOKEN_KEY = 'trialToken';
const REFERRAL_KEY = 'trialReferral';
const REFERRAL_CLICK_TRACKED_KEY = 'trialReferralClickTracked';
const PENDING_REFERRAL_CODE_KEY = 'pendingReferralCode';
const EXPIRED_MSG = '体验时间已结束，欢迎加入渐步';
const ACCOUNT_EXPIRED_MSG = '体验账号已过期，欢迎加入渐步';
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

function MarketingTags({ totalSkills }) {
  const tags = [
    '🧠 超过15个学科的研究成果',
    `📚 ${totalSkills ?? 332}个可以用出来的Skill`,
    '✅ 用出来才算学会',
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-xs text-ink/70 bg-vermilion/8 border border-vermilion/15 rounded-full px-3 py-1.5"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function AccountLoginScreen({ onStarted, onExpired, totalSkills }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedUsername || !trimmedPassword || loggingIn) return;
    setLoggingIn(true);
    setError('');
    try {
      const res = await api.trialLogin(trimmedUsername, trimmedPassword);
      localStorage.setItem(TRIAL_TOKEN_KEY, res.token);
      onStarted();
    } catch (err) {
      if (err.message === ACCOUNT_EXPIRED_MSG) {
        onExpired(ACCOUNT_EXPIRED_MSG);
      } else {
        setError(err.message);
      }
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h2 className="font-bold text-ink mb-2 leading-snug" style={{ fontSize: 24 }}>
          你知道怎么做，但关键时刻就是想不起来
        </h2>
        <p className="text-ink/50 mb-5 leading-relaxed" style={{ fontSize: 14 }}>
          这不是你的问题，这是所有人的问题。渐步解决的，就是这一件事。
        </p>
        <MarketingTags totalSkills={totalSkills} />

        <h1 className="text-xl font-semibold text-ink mb-2">先体验一次，再决定要不要加入</h1>
        <p className="text-sm text-ink/50 mb-8 leading-relaxed">输入你收到的体验账号和密码</p>
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            placeholder="jianbu + 数字"
            className="w-full border border-vermilion/20 bg-white/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-vermilion"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="体验密码"
            className="w-full border border-vermilion/20 bg-white/60 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-vermilion"
            required
          />
          {error && <p className="text-vermilion text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loggingIn || !username.trim() || !password.trim()}
            className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium disabled:opacity-50"
          >
            {loggingIn ? '处理中…' : '开始体验'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ExpiredScreen({ message = EXPIRED_MSG }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-lg font-semibold text-ink mb-8">{message}</p>
        <TrialJoinCard />
      </div>
    </div>
  );
}

function ConcernScreen({ onMatched, onExpired, totalSkills }) {
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
      onMatched(skill, trimmed);
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
          <p className="text-ink/50" style={{ fontSize: 12 }}>
            渐步会从{totalSkills ?? 332}个Skill里，为你找到最匹配这个处境的那一个
          </p>
          <textarea
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder="比如：我知道要早起，但每天还是拖到最后一刻；或者：和某人说话总是说不到点子上……"
            rows={5}
            maxLength={200}
            className="w-full border border-vermilion/20 bg-white/60 rounded-lg px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-vermilion"
            required
          />
          <p className="text-ink/40 italic" style={{ fontSize: 12 }}>
            示例："我知道应该拒绝，但每次到了那个时刻就说了好"
          </p>
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

function disciplineLabel(skill) {
  const category = (skill.category || '').replace('类', '');
  const tags = skill.tags || [];
  const theoryTag = tags[1] || tags[0] || '';
  return `心理学/${category}${theoryTag ? '/' + theoryTag : ''}`;
}

function SkillScreen({ skill, onDone, onExpired, concern, totalSkills, refCode }) {
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [form, setForm] = useState({ learned: '', practiced: '', gained: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showShare, setShowShare] = useState(false);

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
      setSubmitted(true);
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
          <span
            className="inline-block rounded-full mb-3"
            style={{ fontSize: 10, backgroundColor: '#C41E1E', color: '#FFFFFF', padding: '3px 10px' }}
          >
            来自行为科学·{disciplineLabel(skill)}
          </span>
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

        <p className="text-center text-ink/40" style={{ fontSize: 12 }}>
          渐步还有{totalSkills != null ? totalSkills - 1 : 331}个这样的Skill，等你用出来
        </p>

        <TrialCoachPanel skill={skill} onExpired={onExpired} />

        <section className="border border-ink/10 rounded-2xl p-6">
          {!submitted ? (
            <>
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
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-vermilion mb-1">✓ 策印提交成功</p>
              <p className="text-xs text-ink/50 mb-5">这一枚，是你亲手用出来的</p>
              <button
                type="button"
                onClick={() => setShowShare(true)}
                className="w-full border border-vermilion/30 text-vermilion rounded-lg py-3 text-sm font-medium mb-3"
              >
                把这次体验发给朋友
              </button>
              <button
                type="button"
                onClick={() => onDone(skill, form.gained)}
                className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium"
              >
                继续 →
              </button>
            </div>
          )}
        </section>
      </main>

      {showShare && (
        <TrialShareModal
          concern={concern}
          skillName={skill.skill_name}
          gainedText={form.gained}
          refCode={refCode}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

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
    navigator.clipboard?.writeText(WECHAT_ID).catch(() => {});
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
        {copied ? `✓ 微信号已复制：${WECHAT_ID}，打开微信添加傲龙老师` : '立即加入，解锁全部300+个Skill'}
      </button>
    </div>
  );
}

function truncateText(text, max) {
  const chars = Array.from(text || '');
  return chars.length > max ? chars.slice(0, max).join('') + '……' : chars.join('');
}

function SummaryScreen({ skill, concern, gainedText, seats, onContinue }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ backgroundColor: '#F2EDE4' }}>
      <div className="w-full max-w-sm">
        <StampSealDrop />
        <h1 className="text-center font-bold text-ink mt-4 mb-6" style={{ fontSize: 18 }}>
          🎉 你的第一枚策印，已经刻下了
        </h1>

        <div className="bg-white rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-ink/40 mb-1.5" style={{ fontSize: 14 }}>你描述的处境：</p>
            <p className="text-ink font-bold leading-relaxed" style={{ fontSize: 16 }}>
              「{truncateText(concern, 40)}」
            </p>
          </div>
          <div>
            <p className="text-ink/40 mb-1.5" style={{ fontSize: 14 }}>渐步为你找到的Skill：</p>
            <p className="text-vermilion font-semibold" style={{ fontSize: 14 }}>{skill.skill_name}</p>
          </div>
          <div>
            <p className="text-ink/40 mb-1.5" style={{ fontSize: 14 }}>你得到了：</p>
            <p className="text-ink font-bold leading-relaxed" style={{ fontSize: 16 }}>「{gainedText}」</p>
          </div>
          <div className="border-t border-ink/10 pt-4">
            <p className="text-ink/60 leading-relaxed" style={{ fontSize: 14 }}>
              这枚策印，会永久保存在你的渐步档案里。
              <br />
              如果你加入渐步，它会跟着你一起来。
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6 text-center">
          <div>
            <p className="text-vermilion font-bold" style={{ fontSize: 18 }}>{seats?.founding_members ?? '—'}</p>
            <p className="text-ink/40" style={{ fontSize: 11 }}>位创始成员</p>
          </div>
          <div className="w-px h-8 bg-ink/10" />
          <div>
            <p className="text-vermilion font-bold" style={{ fontSize: 18 }}>{seats?.total_skills ?? 332}</p>
            <p className="text-ink/40" style={{ fontSize: 11 }}>个Skill</p>
          </div>
          <div className="w-px h-8 bg-ink/10" />
          <div>
            <p className="text-vermilion font-bold" style={{ fontSize: 18 }}>{seats?.seats_left ?? '—'}</p>
            <p className="text-ink/40" style={{ fontSize: 11 }}>创始成员名额</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium mt-8"
        >
          查看加入方案 →
        </button>
      </div>
    </div>
  );
}

const FIXED_BENEFITS = ['AI陪练无限次', '傲龙洞察音频', '你的第一枚策印跟着来'];

function PurchaseScreen({ skill, concern, gainedText, refCode, seats }) {
  const [wechatRevealed, setWechatRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  function handleJoinClick() {
    navigator.clipboard?.writeText(WECHAT_ID).catch(() => {});
    setCopied(true);
    setWechatRevealed(true);
  }

  const soldOut = seats?.sold_out;
  const seatsLeft = seats?.seats_left;

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-bold text-ink mb-2" style={{ fontSize: 20 }}>
          你的第一枚策印已经刻下了
        </h1>
        <p className="text-center text-ink/50 leading-relaxed mb-6" style={{ fontSize: 14 }}>
          渐步还有{seats?.total_skills != null ? seats.total_skills - 1 : 331}个Skill没有打开。
          <br />
          你刚才解决的，只是你需要解决的一个处境。
        </p>

        <div className="bg-white rounded-2xl p-6 text-center" style={{ border: '1px solid #C41E1E' }}>
          <p className="text-vermilion font-semibold mb-2" style={{ fontSize: 13 }}>创始成员</p>
          <p className="text-ink font-bold mb-1" style={{ fontSize: 32 }}>¥499/年</p>
          <p className="text-ink/40 mb-5" style={{ fontSize: 12 }}>
            {soldOut ? '限额100席，已满员' : `限额100席，目前还剩${seatsLeft}席`}
          </p>
          <div className="text-left space-y-2 mb-2">
            <p className="text-ink/80" style={{ fontSize: 13 }}>
              ✅ 全部{seats?.total_skills ?? 332}个Skill，持续增加
            </p>
            {FIXED_BENEFITS.map((b) => (
              <p key={b} className="text-ink/80" style={{ fontSize: 13 }}>✅ {b}</p>
            ))}
          </div>
        </div>

        {!wechatRevealed ? (
          <button
            type="button"
            onClick={handleJoinClick}
            className="w-full bg-vermilion text-paper rounded-lg py-3.5 text-sm font-medium mt-5"
          >
            {soldOut ? '创始成员已满员，点击加入候补名单' : '立即加入渐步，解锁全部Skill'}
          </button>
        ) : (
          <div className="border border-vermilion/20 bg-vermilion/5 rounded-lg py-3.5 px-4 mt-5 text-center">
            <p className="text-ink text-sm font-medium mb-1">
              {copied ? `✓ 微信号已复制：${WECHAT_ID}` : `微信号：${WECHAT_ID}`}
            </p>
            <p className="text-xs text-ink/50">打开微信添加傲龙老师，说明你想加入渐步</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowShare(true)}
          className="w-full border border-vermilion/30 text-vermilion rounded-lg py-3.5 text-sm font-medium mt-3"
        >
          把这次体验分享给朋友
        </button>

        <p className="text-center text-ink/35 mt-6" style={{ fontSize: 12 }}>
          有疑问？加傲龙微信：{WECHAT_ID}
        </p>

        <p className="text-xs text-ink/35 leading-relaxed mt-6 text-center">
          你的AI陪练对话记录已保存，加入后可以继续接着聊
        </p>
        <CliffhangerHook />
      </div>

      {showShare && (
        <TrialShareModal
          concern={concern}
          skillName={skill.skill_name}
          gainedText={gainedText}
          refCode={refCode}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

function readPendingReferralCode() {
  try {
    return localStorage.getItem(PENDING_REFERRAL_CODE_KEY) || null;
  } catch {
    return null;
  }
}

export default function Trial() {
  const [phase, setPhase] = useState('loading');
  const [skill, setSkill] = useState(null);
  const [expiredMessage, setExpiredMessage] = useState(undefined);
  const [concern, setConcern] = useState('');
  const [gainedText, setGainedText] = useState('');
  const [seats, setSeats] = useState(null);

  useEffect(() => {
    api.getTrialSeats().then(setSeats).catch(() => {});
  }, []);

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
      setPhase('login');
      return;
    }
    api
      .getTrialSkill()
      .then((s) => {
        setSkill(s);
        if (s.trial_concern) setConcern(s.trial_concern);
        setPhase('skill');
      })
      .catch((err) => {
        if (err.message === NO_MATCH_MSG) {
          setPhase('concern');
        } else if (err.message === EXPIRED_MSG) {
          setPhase('expired');
        } else {
          localStorage.removeItem(TRIAL_TOKEN_KEY);
          setPhase('login');
        }
      });
  }, []);

  const refCode = readPendingReferralCode();

  if (phase === 'loading') return <div className="min-h-screen bg-paper" />;
  if (phase === 'login') {
    return (
      <AccountLoginScreen
        totalSkills={seats?.total_skills}
        onStarted={() => setPhase('concern')}
        onExpired={(message) => {
          setExpiredMessage(message);
          setPhase('expired');
        }}
      />
    );
  }
  if (phase === 'expired') return <ExpiredScreen message={expiredMessage} />;
  if (phase === 'concern') {
    return (
      <ConcernScreen
        totalSkills={seats?.total_skills}
        onMatched={(s, concernText) => {
          setSkill(s);
          setConcern(concernText);
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
        concern={concern}
        totalSkills={seats?.total_skills}
        refCode={refCode}
        onDone={(s, gained) => {
          setSkill(s);
          setGainedText(gained);
          setPhase('summary');
        }}
        onExpired={() => setPhase('expired')}
      />
    );
  }
  if (phase === 'summary' && skill) {
    return (
      <SummaryScreen
        skill={skill}
        concern={concern}
        gainedText={gainedText}
        seats={seats}
        onContinue={() => setPhase('purchase')}
      />
    );
  }
  if (phase === 'purchase' && skill) {
    return (
      <PurchaseScreen
        skill={skill}
        concern={concern}
        gainedText={gainedText}
        refCode={refCode}
        seats={seats}
      />
    );
  }

  return <div className="min-h-screen bg-paper" />;
}
