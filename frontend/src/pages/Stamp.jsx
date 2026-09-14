import { useEffect, useState } from 'react';
import { api } from '../api';
import BottomNav from '../components/BottomNav';

function StampItem({ s }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="border border-ink/10 rounded-2xl p-4 bg-white/40 break-inside-avoid">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-ink/40">{s.submitted_at?.slice(0, 10)}</span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-vermilion print:hidden"
        >
          {expanded ? '收起' : '展开'}
        </button>
      </div>
      {expanded ? (
        <div className="space-y-2 text-sm">
          <p><span className="text-ink/40">我学了：</span>{s.learned}</p>
          <p><span className="text-ink/40">我练了：</span>{s.practiced}</p>
          <p><span className="text-ink/40">我得到了：</span>{s.gained}</p>
        </div>
      ) : (
        <p className="text-sm text-ink/70 line-clamp-1">我得到了：{s.gained}</p>
      )}
    </article>
  );
}

export default function Stamp() {
  const [stamps, setStamps] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStamps().then(setStamps).catch((err) => setError(err.message));
  }, []);

  const groups = [];
  const groupIndex = new Map();
  for (const s of stamps) {
    if (!groupIndex.has(s.skill_id)) {
      groupIndex.set(s.skill_id, groups.length);
      groups.push({ skill_id: s.skill_id, skill_title: s.skill_title, items: [] });
    }
    groups[groupIndex.get(s.skill_id)].items.push(s);
  }

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4 flex items-center justify-between print:pt-0">
        <h1 className="text-lg font-semibold text-ink">我的策印</h1>
        <button
          onClick={() => window.print()}
          className="text-xs border border-vermilion/30 text-vermilion rounded-full px-3 py-1.5 print:hidden"
        >
          导出 PDF
        </button>
      </header>

      <main className="max-w-content mx-auto px-6 space-y-6">
        {error && <p className="text-vermilion text-sm">{error}</p>}
        {groups.length === 0 && <p className="text-sm text-ink/40">还没有策印。</p>}

        {groups.map((group) => (
          <section key={group.skill_id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">{group.skill_title}</h2>
              <span className="text-xs text-ink/40">{group.items.length} 枚</span>
            </div>
            <div className="space-y-3">
              {group.items.map((s) => (
                <StampItem key={s.id} s={s} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
