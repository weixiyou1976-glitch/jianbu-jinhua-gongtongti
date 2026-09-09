import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BottomNav from '../components/BottomNav';

export default function Modules() {
  const [modules, setModules] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getModules().then(setModules).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4">
        <Link to="/skills" className="text-xs text-ink/40">← 返回 Skill 库</Link>
        <h1 className="text-lg font-semibold text-ink mt-4">学习路径</h1>
        <p className="text-xs text-ink/40 mt-1">按主题组合的 Skill 组合，不受每周解锁进度限制</p>
      </header>

      <main className="max-w-content mx-auto px-6 space-y-3">
        {error && <p className="text-vermilion text-sm">{error}</p>}
        {modules && modules.length === 0 && <p className="text-sm text-ink/40">还没有学习路径</p>}
        {modules?.map((m) => (
          <Link
            key={m.id}
            to={`/modules/${m.slug}`}
            className="block border border-vermilion/20 rounded-2xl p-6 bg-white/50 hover:border-vermilion/40"
          >
            <h2 className="text-base font-semibold text-ink mb-1">{m.name}</h2>
            <p className="text-sm text-ink/60 mb-3">{m.subtitle}</p>
            <p className="text-xs text-ink/40">
              共 {m.item_count} 个 Skill
              {m.draft_count > 0 ? `，${m.draft_count} 个筹备中` : ''}
            </p>
          </Link>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
