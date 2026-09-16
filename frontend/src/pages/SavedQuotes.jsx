import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BottomNav from '../components/BottomNav';

function formatSavedTime(isoLike) {
  if (!isoLike) return '';
  const date = new Date(isoLike.replace(' ', 'T') + 'Z');
  return date.toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SavedQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSavedQuotes().then(setQuotes).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4 flex items-center gap-3">
        <Link to="/progress" className="text-xs text-ink/40">← 返回</Link>
        <h1 className="text-lg font-semibold text-ink">我的策语收藏</h1>
      </header>

      <main className="max-w-content mx-auto px-6 space-y-3">
        {error && <p className="text-vermilion text-sm mb-4">{error}</p>}
        {quotes.length === 0 && <p className="text-sm text-ink/40">还没有收藏过策语，打开渐步试试今日策语吧。</p>}

        {quotes.map((q) => (
          <div key={q.id} className="border border-ink/10 rounded-2xl p-5 bg-white/40">
            <p className="text-sm text-ink leading-relaxed mb-3">{q.quote_content}</p>
            <div className="flex items-center justify-between text-xs text-ink/40">
              <span>—— 渐步·【{q.skill_name}】</span>
              <span>{formatSavedTime(q.saved_at)}</span>
            </div>
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
