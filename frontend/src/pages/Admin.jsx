import { Fragment, useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../api';

const emptySkill = {
  week_number: '', title: '', skill_name: '', category: '认知类', trigger_condition: '',
  key_question: '', step_one: '', step_two: '', step_three: '', memory_anchor: '', insight: '',
  case_study: '', cognitive_reframe: '', growth_friction: '', growth_friction_ending: '', tags: [],
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

function RecordPaymentForm({ studentId, onDone }) {
  const [paymentType, setPaymentType] = useState('first_year');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const orderAmount = Number(amount);
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) return;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const res = await api.adminRecordPayment(studentId, { payment_type: paymentType, order_amount: orderAmount });
      setResult(res.commission_record_id ? '已记录，分润已写入' : '已记录（该学员无推荐人，未产生分润）');
      setAmount('');
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <select
        value={paymentType}
        onChange={(e) => setPaymentType(e.target.value)}
        className="text-xs border border-ink/15 rounded px-1.5 py-1"
      >
        <option value="first_year">首年</option>
        <option value="renewal">续费</option>
      </select>
      <input
        type="number"
        min={0}
        step="0.01"
        placeholder="订单金额"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="text-xs border border-ink/15 rounded px-1.5 py-1 w-20"
      />
      <button
        type="submit"
        disabled={busy || !amount}
        className="text-[10px] text-vermilion border border-vermilion/30 rounded px-1.5 py-1 disabled:opacity-40 shrink-0"
      >
        {busy ? '记录中…' : '记录付费'}
      </button>
      {result && <span className="text-[10px] text-ink/50">{result}</span>}
      {error && <span className="text-[10px] text-vermilion">{error}</span>}
    </form>
  );
}

function StudentsPanel() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [resetResults, setResetResults] = useState({});
  const [resettingId, setResettingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

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
              <th className="py-2 font-normal text-vermilion">实战连续天数</th>
              <th className="py-2 font-normal">成长等级</th>
              <th className="py-2 font-normal">访问连续天数</th>
              <th className="py-2 font-normal">学习连续天数</th>
              <th className="py-2 font-normal">掌握Skill数</th>
              <th className="py-2 font-normal">累计策印数</th>
              <th className="py-2 font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const avgPerSkill = s.skills_mastered > 0 ? (s.stamp_count / s.skills_mastered).toFixed(1) : '0';
              return (
                <Fragment key={s.id}>
                  <tr className="border-b border-ink/5 align-top">
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId((id) => (id === s.id ? null : s.id))}
                        className="text-left hover:text-vermilion"
                      >
                        {s.email} <span className="text-ink/30 text-xs">{expandedId === s.id ? '▲' : '▼'}</span>
                      </button>
                    </td>
                    <td className="py-2 text-ink/50">{s.enrolled_at?.slice(0, 10)}</td>
                    <td className="py-2 text-vermilion font-semibold">{s.practice_streak}</td>
                    <td className="py-2">{s.growth_title || '—'}</td>
                    <td className="py-2">{s.visit_streak}</td>
                    <td className="py-2">{s.learning_streak}</td>
                    <td className="py-2">{s.skills_mastered}</td>
                    <td className="py-2">{s.stamp_count}</td>
                    <td className="py-2 min-w-[220px]">
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
                      <RecordPaymentForm studentId={s.id} />
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr className="border-b border-ink/5 bg-vermilion/5">
                      <td colSpan={9} className="py-3 px-2">
                        <div className="flex gap-8 text-xs text-ink/70">
                          <span>掌握Skill数（去重）：<span className="text-vermilion font-semibold">{s.skills_mastered}</span> 个</span>
                          <span>累计策印数（含重复）：<span className="text-vermilion font-semibold">{s.stamp_count}</span> 枚</span>
                          <span>平均每个Skill策印数：<span className="text-vermilion font-semibold">{avgPerSkill}</span> 枚</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
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
            {['insight', 'case_study', 'cognitive_reframe', 'growth_friction', 'growth_friction_ending', 'step_one', 'step_two', 'step_three', 'trigger_condition', 'key_question'].includes(field) ? (
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
  const [emailDrafts, setEmailDrafts] = useState({});
  const [migrationMsgs, setMigrationMsgs] = useState({});

  function refresh() {
    api.adminListTrialUsers().then(setTrialUsers).catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  async function markConverted(row) {
    const email = (emailDrafts[row.id] || '').trim();
    setUpdatingId(row.id);
    setMigrationMsgs((m) => ({ ...m, [row.id]: '' }));
    try {
      const res = await api.adminUpdateTrialUser(row.id, { converted: true, user_email: email || undefined });
      setTrialUsers((list) => list.map((t) => (t.id === row.id ? { ...t, converted: true } : t)));
      if (email) {
        setMigrationMsgs((m) => ({
          ...m,
          [row.id]: res.migration?.ok
            ? '已关联并迁移体验记录'
            : res.migration?.error || '标记成功，但数据迁移失败',
        }));
      }
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function unmarkConverted(row) {
    setUpdatingId(row.id);
    try {
      await api.adminUpdateTrialUser(row.id, { converted: false });
      setTrialUsers((list) => list.map((t) => (t.id === row.id ? { ...t, converted: false } : t)));
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
                <td className="py-2 min-w-[200px]">
                  {t.converted ? (
                    <div>
                      <button
                        onClick={() => unmarkConverted(t)}
                        disabled={updatingId === t.id}
                        className="text-xs rounded-full px-3 py-1 border text-vermilion border-vermilion/30 bg-vermilion/5 disabled:opacity-40"
                      >
                        ✓ 已转化
                      </button>
                      {t.linked_user_email && (
                        <p className="text-[10px] text-ink/40 mt-1">已关联：{t.linked_user_email}</p>
                      )}
                      {migrationMsgs[t.id] && <p className="text-[10px] text-ink/40 mt-1">{migrationMsgs[t.id]}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input
                        type="email"
                        placeholder="学员邮箱（可选，用于迁移体验记录）"
                        value={emailDrafts[t.id] || ''}
                        onChange={(e) => setEmailDrafts((m) => ({ ...m, [t.id]: e.target.value }))}
                        className="text-xs border border-ink/15 rounded px-1.5 py-1 w-40"
                      />
                      <button
                        onClick={() => markConverted(t)}
                        disabled={updatingId === t.id}
                        className="text-xs rounded-full px-3 py-1 border text-ink/40 border-ink/15 disabled:opacity-40"
                      >
                        标记为已转化
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

function ConversionAnalyticsPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminGetTrialAnalytics().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-vermilion text-sm">{error}</p>;
  if (!data) return <p className="text-sm text-ink/40">加载中…</p>;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-ink mb-1">困扰关键词分析</h2>
        <p className="text-xs text-ink/40 mb-3">按Skill库已有标签匹配体验用户的困扰描述，最常见的10个主题及其转化率</p>
        {data.keyword_themes.length === 0 ? (
          <p className="text-sm text-ink/30">暂无数据</p>
        ) : (
          <div className="space-y-1.5">
            {data.keyword_themes.map((k, i) => (
              <div key={k.keyword} className="flex items-center justify-between text-sm border-b border-ink/5 py-1.5">
                <span className="text-ink/70">{i + 1}. {k.keyword}</span>
                <span className="text-ink/40 text-xs">
                  {k.total} 人提及 · 转化 {k.converted} 人 · <span className="text-vermilion">{k.rate}%</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink mb-1">Skill转化率分析</h2>
        <p className="text-xs text-ink/40 mb-3">按匹配到的Skill分组，转化率最高的前10名</p>
        {data.skill_conversion.length === 0 ? (
          <p className="text-sm text-ink/30">暂无数据</p>
        ) : (
          <div className="space-y-1.5">
            {data.skill_conversion.map((s, i) => (
              <div key={s.skill_id} className="flex items-center justify-between text-sm border-b border-ink/5 py-1.5">
                <span className="text-ink/70">
                  {i + 1}. {s.week_number != null ? `第${s.week_number}周 · ` : ''}{s.skill_name}
                </span>
                <span className="text-ink/40 text-xs">
                  {s.total} 人体验 · 转化 {s.converted} 人 · <span className="text-vermilion">{s.rate}%</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink mb-1">来源分析</h2>
        <p className="text-xs text-ink/40 mb-3">按推荐人分组，带来体验用户转化率最高的前10名</p>
        {data.referrer_conversion.length === 0 ? (
          <p className="text-sm text-ink/30">暂无数据</p>
        ) : (
          <div className="space-y-1.5">
            {data.referrer_conversion.map((r, i) => (
              <div key={r.referral_code} className="flex items-center justify-between text-sm border-b border-ink/5 py-1.5">
                <span className="text-ink/70">{i + 1}. {r.email || r.referral_code}</span>
                <span className="text-ink/40 text-xs">
                  {r.total} 人体验 · 转化 {r.converted} 人 · <span className="text-vermilion">{r.rate}%</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
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

function formatDeviceTime(isoLike) {
  if (!isoLike) return '';
  const date = new Date(isoLike.replace(' ', 'T') + 'Z');
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SecurityPanel() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function refresh() {
    api.adminListSecurity().then(setRows).catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  async function handleUnlock(userId, resetDevices) {
    if (!confirm(resetDevices ? '确认解锁账号并清除设备记录？' : '确认只解锁账号（保留原有设备记录）？')) return;
    setBusyId(userId);
    setError('');
    try {
      await api.adminUnlockAccount(userId, resetDevices);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleClearDevices(userId) {
    if (!confirm('确认清除该学员的所有设备绑定记录？清除后学员需要用新设备重新登录激活。')) return;
    setBusyId(userId);
    setError('');
    try {
      await api.adminClearDevices(userId);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const lockedRows = rows.filter((r) => r.account_locked);

  return (
    <div className="space-y-8">
      {error && <p className="text-vermilion text-sm">{error}</p>}

      <div>
        <h2 className="text-sm font-semibold text-ink mb-3">已锁定账号（{lockedRows.length}）</h2>
        {lockedRows.length === 0 && <p className="text-sm text-ink/40">目前没有被锁定的账号</p>}
        <div className="space-y-2">
          {lockedRows.map((r) => (
            <div key={r.id} className="border border-vermilion/30 bg-vermilion/5 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm text-ink font-medium">{r.email}</p>
                  <p className="text-xs text-ink/40">锁定原因：{r.locked_reason || '未知'} · 已绑定设备 {r.devices.length} 个</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleUnlock(r.id, false)}
                    disabled={busyId === r.id}
                    className="text-xs border border-vermilion/30 text-vermilion rounded-full px-3 py-1.5 disabled:opacity-40"
                  >
                    只解锁
                  </button>
                  <button
                    onClick={() => handleUnlock(r.id, true)}
                    disabled={busyId === r.id}
                    className="text-xs bg-vermilion text-paper rounded-full px-3 py-1.5 disabled:opacity-40"
                  >
                    解锁并重置设备
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink mb-3">全部账号 · 登录设备</h2>
        {rows.length === 0 && <p className="text-sm text-ink/40">还没有学员账号</p>}
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="border border-ink/10 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink">{r.email}</span>
                  {r.account_locked && (
                    <span className="text-[10px] text-vermilion border border-vermilion/30 rounded-full px-2 py-0.5">
                      已锁定
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleClearDevices(r.id)}
                  disabled={busyId === r.id || r.devices.length === 0}
                  className="text-xs text-ink/40 disabled:opacity-30 shrink-0"
                >
                  清除设备记录
                </button>
              </div>
              {r.devices.length === 0 ? (
                <p className="text-xs text-ink/30">还没有登录设备</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-left text-ink/40">
                        <th className="py-1 font-normal">设备</th>
                        <th className="py-1 font-normal">首次登录</th>
                        <th className="py-1 font-normal">最近活跃</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.devices.map((d) => (
                        <tr key={d.id} className="border-t border-ink/5">
                          <td className="py-1 text-ink/70 whitespace-nowrap">{d.device_name || '未知设备'}</td>
                          <td className="py-1 text-ink/50 whitespace-nowrap">{formatDeviceTime(d.first_login_at)}</td>
                          <td className="py-1 text-ink/50 whitespace-nowrap">{formatDeviceTime(d.last_active_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FangsVoiceAdmin() {
  const emptyVoice = { title: '', audio_url: '', required_share_clicks: 0, required_conversions: 0 };
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  function refresh() {
    api.adminListFangsVoice().then(setList).catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editing.id) {
        await api.adminUpdateFangsVoice(editing.id, editing);
      } else {
        await api.adminCreateFangsVoice(editing);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('确认删除这条私房话？')) return;
    await api.adminDeleteFangsVoice(id);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">私房话内容管理</h3>
        {!editing && (
          <button
            onClick={() => setEditing({ ...emptyVoice })}
            className="text-xs bg-vermilion text-paper rounded-full px-3 py-1.5"
          >
            + 新增
          </button>
        )}
      </div>
      {error && <p className="text-vermilion text-sm mb-2">{error}</p>}

      {editing ? (
        <form onSubmit={handleSave} className="space-y-2 border border-ink/10 rounded-xl p-4 text-sm">
          <input
            placeholder="标题"
            value={editing.title}
            onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
            className="w-full border border-ink/15 rounded-lg p-2 text-sm"
            required
          />
          <input
            placeholder="音频URL"
            value={editing.audio_url}
            onChange={(e) => setEditing((s) => ({ ...s, audio_url: e.target.value }))}
            className="w-full border border-ink/15 rounded-lg p-2 text-sm"
            required
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-ink/50 block mb-1">分享点击门槛（0表示不通过此方式解锁）</label>
              <input
                type="number"
                min={0}
                value={editing.required_share_clicks}
                onChange={(e) => setEditing((s) => ({ ...s, required_share_clicks: e.target.value }))}
                className="w-full border border-ink/15 rounded-lg p-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink/50 block mb-1">转化人数门槛（0表示不通过此方式解锁）</label>
              <input
                type="number"
                min={0}
                value={editing.required_conversions}
                onChange={(e) => setEditing((s) => ({ ...s, required_conversions: e.target.value }))}
                className="w-full border border-ink/15 rounded-lg p-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="bg-vermilion text-paper rounded-lg px-4 py-2 text-sm">保存</button>
            <button type="button" onClick={() => setEditing(null)} className="text-ink/40 text-sm px-2">取消</button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {list.length === 0 && <p className="text-sm text-ink/40">还没有私房话内容</p>}
          {list.map((f) => (
            <div key={f.id} className="flex items-center justify-between border border-ink/10 rounded-lg px-3 py-2 text-sm">
              <div>
                <p className="text-ink">{f.title}</p>
                <p className="text-xs text-ink/40">
                  {f.required_share_clicks > 0 && `分享${f.required_share_clicks}次解锁`}
                  {f.required_share_clicks > 0 && f.required_conversions > 0 && ' / '}
                  {f.required_conversions > 0 && `转化${f.required_conversions}人解锁`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditing(f)} className="text-vermilion text-xs">编辑</button>
                <button onClick={() => handleDelete(f.id)} className="text-ink/40 text-xs">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReferralRewardsPanel() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  function refresh() {
    api.adminListReferralRewards().then(setRows).catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  function draftFor(row) {
    return drafts[row.id] || {
      share_click_count: String(row.share_click_count),
      conversion_count: String(row.conversion_count),
      referral_commission_rate: String(row.referral_commission_rate),
    };
  }

  function updateDraft(id, field, value) {
    setDrafts((d) => ({ ...d, [id]: { ...draftFor(rows.find((r) => r.id === id)), ...d[id], [field]: value } }));
  }

  async function handleSaveCounts(row) {
    const draft = draftFor(row);
    setBusyId(row.id);
    setError('');
    try {
      await api.adminAdjustReferralCounts(row.id, {
        share_click_count: Number(draft.share_click_count),
        conversion_count: Number(draft.conversion_count),
      });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveRate(row) {
    const draft = draftFor(row);
    setBusyId(row.id);
    setError('');
    try {
      await api.adminSetCommissionRate(row.id, Number(draft.referral_commission_rate));
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-vermilion text-sm">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-ink/40 border-b border-ink/10">
              <th className="py-2 font-normal">学员</th>
              <th className="py-2 font-normal">标签</th>
              <th className="py-2 font-normal">分享点击</th>
              <th className="py-2 font-normal">转化人数</th>
              <th className="py-2 font-normal">分润比例</th>
              <th className="py-2 font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const draft = draftFor(r);
              return (
                <tr key={r.id} className="border-b border-ink/5 align-top">
                  <td className="py-2 whitespace-nowrap">{r.email}</td>
                  <td className="py-2 whitespace-nowrap text-xs text-ink/60">
                    {[r.share_tag, r.conversion_tag].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      value={draft.share_click_count}
                      onChange={(e) => updateDraft(r.id, 'share_click_count', e.target.value)}
                      className="w-20 border border-ink/15 rounded px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      value={draft.conversion_count}
                      onChange={(e) => updateDraft(r.id, 'conversion_count', e.target.value)}
                      className="w-16 border border-ink/15 rounded px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step="0.01"
                      value={draft.referral_commission_rate}
                      onChange={(e) => updateDraft(r.id, 'referral_commission_rate', e.target.value)}
                      className="w-16 border border-ink/15 rounded px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => handleSaveCounts(r)}
                      disabled={busyId === r.id}
                      className="text-xs text-vermilion disabled:opacity-40 mr-2"
                    >
                      保存计数
                    </button>
                    <button
                      onClick={() => handleSaveRate(r)}
                      disabled={busyId === r.id}
                      className="text-xs text-vermilion disabled:opacity-40"
                    >
                      保存比例
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <FangsVoiceAdmin />
    </div>
  );
}

function CommissionsPanel() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [settlingId, setSettlingId] = useState(null);

  function refresh() {
    api.adminListCommissions().then(setRows).catch((err) => setError(err.message));
  }
  useEffect(refresh, []);

  async function handleSettle(beneficiaryId) {
    if (!confirm('确认把该学员所有待结算分润标记为已结算？')) return;
    setSettlingId(beneficiaryId);
    try {
      await api.adminSettleCommissions(beneficiaryId);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSettlingId(null);
    }
  }

  const groups = new Map();
  for (const r of rows) {
    const key = r.beneficiary_user_id;
    if (!groups.has(key)) groups.set(key, { beneficiary_email: r.beneficiary_email, records: [] });
    groups.get(key).records.push(r);
  }

  const typeLabel = { first_year: '首年推荐', renewal: '续费二级' };

  return (
    <div className="space-y-6">
      {error && <p className="text-vermilion text-sm">{error}</p>}
      {rows.length === 0 && <p className="text-sm text-ink/40">还没有分润记录</p>}

      {[...groups.entries()].map(([beneficiaryId, group]) => {
        const pending = group.records.filter((r) => r.status === 'pending');
        const pendingTotal = pending.reduce((sum, r) => sum + r.commission_amount, 0);
        return (
          <div key={beneficiaryId} className="border border-ink/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {group.beneficiary_email}
                  {Number(beneficiaryId) === 0 && <span className="text-xs text-ink/40 ml-1">（归傲龙）</span>}
                </p>
                <p className="text-xs text-ink/40">待结算合计 ¥{pendingTotal.toFixed(2)}</p>
              </div>
              <button
                onClick={() => handleSettle(beneficiaryId)}
                disabled={settlingId === beneficiaryId || pending.length === 0}
                className="text-xs bg-vermilion text-paper rounded-full px-3 py-1.5 disabled:opacity-30 shrink-0"
              >
                {settlingId === beneficiaryId ? '处理中…' : '标记为已结算'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-ink/40">
                    <th className="py-1 font-normal">付费学员</th>
                    <th className="py-1 font-normal">类型</th>
                    <th className="py-1 font-normal">订单金额</th>
                    <th className="py-1 font-normal">应得分润</th>
                    <th className="py-1 font-normal">状态</th>
                    <th className="py-1 font-normal">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {group.records.map((r) => (
                    <tr key={r.id} className="border-t border-ink/5">
                      <td className="py-1 text-ink/70 whitespace-nowrap">{r.payer_email}</td>
                      <td className="py-1 text-ink/70 whitespace-nowrap">{typeLabel[r.commission_type] || r.commission_type}</td>
                      <td className="py-1 text-ink/70 whitespace-nowrap">¥{r.order_amount.toFixed(2)}</td>
                      <td className="py-1 text-vermilion whitespace-nowrap">¥{r.commission_amount.toFixed(2)}</td>
                      <td className="py-1 whitespace-nowrap">{r.status === 'paid' ? '已结算' : '待结算'}</td>
                      <td className="py-1 text-ink/50 whitespace-nowrap">{r.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
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
            ['conversion', '转化分析'],
            ['referrals', '分享数据'],
            ['referral-rewards', '推荐奖励'],
            ['commissions', '分润管理'],
            ['security', '账号安全'],
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
        {tab === 'conversion' && <ConversionAnalyticsPanel />}
        {tab === 'referrals' && <ReferralsPanel />}
        {tab === 'referral-rewards' && <ReferralRewardsPanel />}
        {tab === 'commissions' && <CommissionsPanel />}
        {tab === 'security' && <SecurityPanel />}
        {tab === 'skills' && <SkillsPanel />}
        {tab === 'modules' && <ModulesPanel />}
      </main>
    </div>
  );
}
