import { useEffect, useState } from 'react';
import { api } from '../api';
import BottomNav from '../components/BottomNav';

export default function Stamp() {
  const [stamps, setStamps] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStamps().then(setStamps).catch((err) => setError(err.message));
  }, []);

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

      <main className="max-w-content mx-auto px-6 space-y-4">
        {error && <p className="text-vermilion text-sm">{error}</p>}
        {stamps.length === 0 && <p className="text-sm text-ink/40">还没有策印。</p>}

        {stamps.map((s) => (
          <article key={s.id} className="border border-ink/10 rounded-2xl p-5 bg-white/40 break-inside-avoid">
            <div className="flex items-center justify-between mb-3">
              <span className="text-vermilion font-semibold text-sm">第 {s.stamp_number} 枚策印</span>
              <span className="text-xs text-ink/40">{s.submitted_at?.slice(0, 10)}</span>
            </div>
            <p className="text-sm font-medium text-ink mb-3">{s.skill_title}</p>
            <div className="space-y-2 text-sm">
              <p><span className="text-ink/40">我学了：</span>{s.learned}</p>
              <p><span className="text-ink/40">我练了：</span>{s.practiced}</p>
              <p><span className="text-ink/40">我得到了：</span>{s.gained}</p>
            </div>
          </article>
        ))}
      </main>

      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
