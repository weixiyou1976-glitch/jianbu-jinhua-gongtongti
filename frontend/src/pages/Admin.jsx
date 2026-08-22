import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../api';

const emptySkill = {
  week_number: '', title: '', skill_name: '', category: '认知类', trigger_condition: '',
  step_one: '', step_two: '', step_three: '', memory_anchor: '', insight: '',
  case_study: '', cognitive_reframe: '', growth_friction: '',
};

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

  useEffect(() => {
    api.adminListStudents().then(setStudents).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-2">
      {error && <p className="text-vermilion text-sm">{error}</p>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-ink/40 border-b border-ink/10">
            <th className="py-2 font-normal">邮箱</th>
            <th className="py-2 font-normal">入学日期</th>
            <th className="py-2 font-normal">策印数</th>
            <th className="py-2 font-normal">完成度</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-ink/5">
              <td className="py-2">{s.email}</td>
              <td className="py-2 text-ink/50">{s.enrolled_at?.slice(0, 10)}</td>
              <td className="py-2">{s.stamp_count}</td>
              <td className="py-2 text-vermilion">{s.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
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
        {Object.keys(emptySkill).map((field) => (
          <div key={field}>
            <label className="text-xs text-ink/50 block mb-1">{field}</label>
            {['insight', 'case_study', 'cognitive_reframe', 'growth_friction', 'step_one', 'step_two', 'step_three', 'trigger_condition'].includes(field) ? (
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
            ['skills', 'Skill内容'],
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
        {tab === 'skills' && <SkillsPanel />}
      </main>
    </div>
  );
}
