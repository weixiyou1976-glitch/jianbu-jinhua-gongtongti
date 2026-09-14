import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../api';

const emptySkill = {
  week_number: '', title: '', skill_name: '', category: '认知类', trigger_condition: '',
  key_question: '', step_one: '', step_two: '', step_three: '', memory_anchor: '', insight: '',
  case_study: '', cognitive_reframe: '', growth_friction: '', tags: [],
};

function TagsEditor({ tags, onChange }) {
  const [draft, setDraft] = useState('');

  function addTag() {
    const value = draft.trim();
    if (!value || tags.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <label className="text-xs text-ink/50 block mb-1">tags</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-vermilion/10 text-vermilion rounded-full px-3 py-1 text-xs">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-vermilion/70 hover:text-vermilion">×</button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-ink/30">暂无标签</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="输入标签后按 Enter 或点击添加"
          className="flex-1 border border-ink/15 rounded-lg p-2 text-sm"
        />
        <button type="button" onClick={addTag} className="border border-vermilion/30 text-vermilion rounded-lg px-3 py-2 text-sm shrink-0">
          添加
        </button>
      </div>
    </div>
  );
}

function AdminGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    localStorage.setItem('adminPassword', password);
    try {
      await api.adminListStudents();
      onUnlock();
    } catch {
      localStorage.removeItem('adminPassword');
      setError('密码错误');
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <h1 className="text-lg font-semibold text-ink text-center mb-4">后台管理</h1>
        <input
          type="password"
          placeholder="管理员密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-vermilion/20 rounded-lg px-4 py-3 text-sm"
          required
        />
        {error && <p className="text-vermilion text-sm">{error}</p>}
        <button className="w-full bg-vermilion text-paper rounded-lg py-3 text-sm font-medium">进入</button>
      </form>
    </div>
  );
}

function CodesPanel() {
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState([]);
  const [generated, setGenerated] = useState([]);
  const [error, setError] = useState('');

  function refresh() {
    api.adminListCodes().then(setCodes).catch((err) => setError(err.message));
  }

  useEffect(refresh, []);

  async function handleGenerate() {
    try {
      const res = await api.adminGenerateCodes(count);
      setGenerated(res.codes);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleExport() {
    const adminPassword = localStorage.getItem('adminPassword');
    fetch(`${API_BASE_URL}/admin/activation-codes/export.csv`, {
      headers: { Authorization: `Bearer ${adminPassword}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'activation_codes.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  const unused = codes.filter((c) => !c.used).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={1000}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="border border-ink/15 rounded-lg px-3 py-2 text-sm w-24"
        />
        <button onClick={handleGenerate} className="bg-vermilion text-paper rounded-lg px-4 py-2 text-sm">
          批量生成
        </button>
        <button onClick={handleExport} className="border border-vermilion/30 text-vermilion rounded-lg px-4 py-2 text-sm">
          导出 CSV
        </button>
      </div>
      {error && <p className="text-vermilion text-sm">{error}</p>}
      {generated.length > 0 && (
        <div className="bg-white/50 border border-ink/10 rounded-xl p-4 text-sm">
          <p className="text-ink/50 mb-2">本次生成 {generated.length} 个：</p>
          <p className="font-mono text-xs leading-relaxed break-all">{generated.join(', ')}</p>
        </div>
      )}
      <p className="text-sm text-ink/60">共 {codes.length} 个激活码，未使用 {unused} 个</p>
    </div>
  );
}

function StudentsPanel() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [resetResults, setResetResults] = useState({});
  const [resettingId, setResettingId] = useState(null);

  useEffect(() => {
    api.adminListStudents().then(setStudents).catch((err) => setError(err.message));
  }, []);

  async function handleReset(id, email) {
    if (!confirm(`确认重置 ${email} 的登录密码？重置后原密码立即失效，需要你手动把新密码告诉学员。`)) return;
    setResettingId(id);
    setError('');
    try {
      const res = await api.adminResetPassword(id);
      setResetResults((m) => ({ ...m, [id]: res.password }));
    } catch (err) {
      setError(err.message);
    } finally {
      setResettingId(null);
    }
  }

  function copyPassword(password) {
    navigator.clipboard?.writeText(password).catch(() => {});
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-vermilion text-sm">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-ink/40 border-b border-ink/10">
              <th className="py-2 font-normal">邮箱</th>
              <th className="py-2 font-normal">入学日期</th>
              <th className="py-2 font-normal">策印数</th>
              <th className="py-2 font-normal">完成度</th>
              <th className="py-2 font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-ink/5 align-top">
                <td className="py-2">{s.email}</td>
                <td className="py-2 text-ink/50">{s.enrolled_at?.slice(0, 10)}</td>
                <td className="py-2">{s.stamp_count}</td>
                <td className="py-2 text-vermilion">{s.percent}%</td>
                <td className="py-2">
                  <button
                    onClick={() => handleReset(s.id, s.email)}
                    disabled={resettingId === s.id}
                    className="text-xs text-vermilion disabled:opacity-40"
                  >
                    {resettingId === s.id ? '重置中…' : '重置密码'}
                  </button>
                  {resetResults[s.id] && (
                    <div className="mt-1.5 flex items-center gap-2 bg-vermilion/5 border border-vermilion/20 rounded-lg px-2 py-1">
                      <span className="font-mono text-xs text-ink">{resetResults[s.id]}</span>
                      <button
                        onClick={() => copyPassword(resetResults[s.id])}
                        className="text-[10px] text-ink/40 border border-ink/15 rounded px-1.5 py-0.5 shrink-0"
                      >
                        复制
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkillsPanel() {
  const [skills, setSkills] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  function refresh() {
    api.adminListSkills().then(setSkills).catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editing.id) {
        await api.adminUpdateSkill(editing.id, editing);
      } else {
        await api.adminCreateSkill(editing);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('确认删除这条Skill？')) return;
    await api.adminDeleteSkill(id);
    refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-3 text-sm">
        <button type="button" onClick={() => setEditing(null)} className="text-ink/40 text-xs mb-2">← 返回列表</button>
        {Object.keys(emptySkill).filter((field) => field !== 'tags').map((field) => (
          <div key={field}>
            <label className="text-xs text-ink/50 block mb-1">{field}</label>
            {['insight', 'case_study', 'cognitive_reframe', 'growth_friction', 'step_one', 'step_two', 'step_three', 'trigger_condition', 'key_question'].includes(field) ? (
              <textarea
                value={editing[field] ?? ''}
                onChange={(e) => setEditing((s) => ({ ...s, [field]: e.target.value }))}
                className="w-full border border-ink/15 rounded-lg p-2 text-sm"
                rows={3}
              />
            ) : (
              <input
                value={editing[field] ?? ''}
                onChange={(e) => setEditing((s) => ({ ...s, [field]: e.target.value }))}
                className="w-full border border-ink/15 rounded-lg p-2 text-sm"
              />
            )}
          </div>
        ))}
        <TagsEditor tags={editing.tags ?? []} onChange={(tags) => setEditing((s) => ({ ...s, tags }))} />
        {error && <p className="text-vermilion text-sm">{error}</p>}
        <button className="bg-vermilion text-paper rounded-lg px-4 py-2 text-sm">保存</button>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={() => setEditing({ ...emptySkill })} className="bg-vermilion text-paper rounded-lg px-4 py-2 text-sm mb-3">
        + 新增 Skill
      </button>
      {error && <p className="text-vermilion text-sm">{error}</p>}
      {skills.map((s) => (
        <div key={s.id} className="flex items-center justify-between border border-ink/10 rounded-lg px-4 py-2 text-sm">
          <span>第{s.week_number}周 · {s.skill_name}</span>
          <div className="flex gap-2">
            <button onClick={() => setEditing(s)} className="text-vermilion text-xs">编辑</button>
            <button onClick={() => handleDelete(s.id)} className="text-ink/40 text-xs">删除</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModulesPanel() {
  const [modules, setModules] = useState([]);
  const [error, setError] = useState('');

  function refresh() {
    api.adminListModules().then(setModules).catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  async function handleDelete(id) {
    if (!confirm('确认删除这个模块？（不会删除其中的 Skill）')) return;
    await api.adminDeleteModule(id);
    refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-vermilion text-sm">{error}</p>}
      {modules.length === 0 && <p className="text-sm text-ink/40">还没有学习模块</p>}
      {modules.map((m) => (
        <div key={m.id} className="border border-ink/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-semibold text-ink">{m.name}</p>
              <p className="text-xs text-ink/40">{m.subtitle}</p>
              <p className="text-xs text-ink/30 mt-0.5">/modules/{m.slug}</p>
            </div>
            <button onClick={() => handleDelete(m.id)} className="text-xs text-ink/40 shrink-0">删除</button>
          </div>
          <div className="mt-3 space-y-2">
            {m.stages.map((stage, i) => (
              <div key={stage.stage_order} className="text-xs">
                <p className="text-ink/50 font-medium mb-1">环节{i + 1} · {stage.stage_name}</p>
                <ul className="pl-3 space-y-0.5">
                  {stage.items.map((it) => (
                    <li key={it.item_id} className="text-ink/70 flex items-center gap-2">
                      <span>第{it.week_number}周 · {it.skill_name}</span>
                      {it.status === 'draft' && <span className="text-ink/30">（待写）</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTrialTime(isoLike) {
  if (!isoLike) return '';
  const date = new Date(isoLike.replace(' ', 'T') + 'Z');
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TrialUsersPanel() {
  const [trialUsers, setTrialUsers] = useState([]);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  function refresh() {
    api.adminListTrialUsers().then(setTrialUsers).catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  async function toggleConverted(row) {
    setUpdatingId(row.id);
    try {
      await api.adminUpdateTrialUser(row.id, { converted: !row.converted });
      setTrialUsers((list) =>
        list.map((t) => (t.id === row.id ? { ...t, converted: !row.converted } : t))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-vermilion text-sm">{error}</p>}
      {trialUsers.length === 0 && <p className="text-sm text-ink/40">还没有体验用户</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-ink/40 border-b border-ink/10">
              <th className="py-2 font-normal">微信号</th>
              <th className="py-2 font-normal">困扰内容</th>
              <th className="py-2 font-normal">匹配Skill</th>
              <th className="py-2 font-normal">体验时间</th>
              <th className="py-2 font-normal">转化状态</th>
            </tr>
          </thead>
          <tbody>
            {trialUsers.map((t) => (
              <tr key={t.id} className="border-b border-ink/5 align-top">
                <td className="py-2 whitespace-nowrap">{t.wechat_id}</td>
                <td className="py-2 max-w-xs text-ink/70">{t.concern || '—'}</td>
                <td className="py-2 whitespace-nowrap text-ink/70">
                  {t.matched_skill_name ? `第${t.matched_week_number}周 · ${t.matched_skill_name}` : '—'}
                </td>
                <td className="py-2 text-ink/50 whitespace-nowrap">{formatTrialTime(t.created_at)}</td>
                <td className="py-2 whitespace-nowrap">
                  <button
                    onClick={() => toggleConverted(t)}
                    disabled={updatingId === t.id}
                    className={`text-xs rounded-full px-3 py-1 border disabled:opacity-40 ${
                      t.converted
                        ? 'text-vermilion border-vermilion/30 bg-vermilion/5'
                        : 'text-ink/40 border-ink/15'
                    }`}
                  >
                    {t.converted ? '✓ 已转化' : '未转化'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReferralsPanel() {
  const [data, setData] = useState({ commission_per_conversion: 0, rows: [] });
  const [rateDraft, setRateDraft] = useState('0');
  const [error, setError] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [settlingId, setSettlingId] = useState(null);

  function refresh() {
    api
      .adminListReferrals()
      .then((res) => {
        setData(res);
        setRateDraft(String(res.commission_per_conversion));
      })
      .catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  async function handleSaveRate(e) {
    e.preventDefault();
    const rate = Number(rateDraft);
    if (!Number.isFinite(rate) || rate < 0) return;
    setSavingRate(true);
    try {
      await api.adminUpdateReferralSettings(rate);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRate(false);
    }
  }

  async function handleSettle(userId) {
    if (!confirm('确认把这位学员当前待结算的分润都标记为已结算？')) return;
    setSettlingId(userId);
    try {
      await api.adminSettleReferrals(userId);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSettlingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-vermilion text-sm">{error}</p>}

      <form onSubmit={handleSaveRate} className="flex items-center gap-3 border border-ink/10 rounded-xl p-4">
        <label className="text-sm text-ink/60 shrink-0">每次转化分润金额（¥）</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={rateDraft}
          onChange={(e) => setRateDraft(e.target.value)}
          className="border border-ink/15 rounded-lg px-3 py-1.5 text-sm w-28"
        />
        <button
          type="submit"
          disabled={savingRate}
          className="bg-vermilion text-paper rounded-lg px-4 py-1.5 text-sm disabled:opacity-50 shrink-0"
        >
          保存
        </button>
      </form>

      {data.rows.length === 0 && <p className="text-sm text-ink/40">还没有分享数据</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-ink/40 border-b border-ink/10">
              <th className="py-2 font-normal">学员</th>
              <th className="py-2 font-normal">推荐码</th>
              <th className="py-2 font-normal">分享次数</th>
              <th className="py-2 font-normal">点击次数</th>
              <th className="py-2 font-normal">体验次数</th>
              <th className="py-2 font-normal">转化次数</th>
              <th className="py-2 font-normal">待结算分润</th>
              <th className="py-2 font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.user_id} className="border-b border-ink/5">
                <td className="py-2 whitespace-nowrap">{r.email}</td>
                <td className="py-2 font-mono text-xs whitespace-nowrap">{r.referral_code}</td>
                <td className="py-2">{r.share_count}</td>
                <td className="py-2">{r.click_count}</td>
                <td className="py-2">{r.trial_count}</td>
                <td className="py-2">{r.converted_count}</td>
                <td className="py-2 text-vermilion whitespace-nowrap">¥{r.pending_commission.toFixed(2)}</td>
                <td className="py-2 whitespace-nowrap">
                  <button
                    onClick={() => handleSettle(r.user_id)}
                    disabled={settlingId === r.user_id || r.pending_commission <= 0}
                    className="text-xs text-vermilion disabled:opacity-30"
                  >
                    {settlingId === r.user_id ? '处理中…' : '标记已结算'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Admin() {
  const [unlocked, setUnlocked] = useState(!!localStorage.getItem('adminPassword'));
  const [tab, setTab] = useState('codes');

  if (!unlocked) return <AdminGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-paper pb-16">
      <header className="max-w-3xl mx-auto px-6 pt-8 pb-4">
        <h1 className="text-lg font-semibold text-ink mb-4">后台管理</h1>
        <div className="flex gap-4 border-b border-vermilion/15">
          {[
            ['codes', '激活码'],
            ['students', '学员'],
            ['trial', '试用用户'],
            ['referrals', '分享数据'],
            ['skills', 'Skill内容'],
            ['modules', '学习模块'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 text-sm ${tab === key ? 'text-vermilion border-b-2 border-vermilion font-semibold' : 'text-ink/40'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6">
        {tab === 'codes' && <CodesPanel />}
        {tab === 'students' && <StudentsPanel />}
        {tab === 'trial' && <TrialUsersPanel />}
        {tab === 'referrals' && <ReferralsPanel />}
        {tab === 'skills' && <SkillsPanel />}
        {tab === 'modules' && <ModulesPanel />}
      </main>
    </div>
  );
}
