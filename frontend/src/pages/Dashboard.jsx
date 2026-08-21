import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ProgressRing from '../components/ProgressRing';
import BottomNav from '../components/BottomNav';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [current, setCurrent] = useState(null);
  const [progress, setProgress] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getCurrentSkill(), api.getProgress(), api.getStamps()])
      .then(([c, p, s]) => {
        setCurrent(c);
        setProgress(p);
        setStamps(s.slice(0, 3));
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div>
          <p className="text-ink/40 text-xs">欢迎回来</p>
          <p className="text-ink text-sm">{user?.email}</p>
        </div>
        <button onClick={logout} className="text-xs text-ink/40 border border-ink/15 rounded-full px-3 py-1.5">
          退出
        </button>
      </header>

      <main className="max-w-content mx-auto px-6">
        {error && <p className="text-vermilion text-sm mb-4">{error}</p>}

        {current?.skill ? (
          <Link
            to={`/skill/${current.skill.id}`}
            className="block border border-vermilion/20 rounded-2xl p-6 bg-white/50 mb-8"
          >
            <p className="text-xs text-vermilion font-semibold mb-2">第 {current.week} 周 · 本周推荐</p>
            <h2 className="text-lg font-semibold text-ink mb-2">{current.skill.skill_name}</h2>
            <p className="text-sm text-ink/60 line-clamp-2">{current.skill.trigger_condition}</p>
            {current.skill.stamped && (
              <span className="inline-block mt-3 text-xs text-vermilion">✓ 本周策印已提交</span>
            )}
          </Link>
        ) : (
          current && (
            <div className="border border-ink/10 rounded-2xl p-6 mb-8 text-sm text-ink/50">
              第 {current.week} 周暂无内容，敬请期待。
            </div>
          )
        )}

        {progress && (
          <div className="flex items-center justify-center gap-8 border border-ink/10 rounded-2xl p-6 mb-8 bg-white/40">
            <ProgressRing percent={progress.percent} label={`${progress.completed}`} sublabel={`/ ${progress.total} 枚策印`} />
            <div className="text-sm text-ink/60 space-y-1">
              <p>连续打卡 <span className="text-vermilion font-semibold">{progress.streak}</span> 天</p>
              <p>已完成 <span className="text-vermilion font-semibold">{progress.percent}%</span></p>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">最近的策印</h3>
            <Link to="/stamp" className="text-xs text-vermilion">查看全部 →</Link>
          </div>
          <div className="space-y-3">
            {stamps.length === 0 && <p className="text-sm text-ink/40">还没有策印，从本周推荐开始吧。</p>}
            {stamps.map((s) => (
              <div key={s.id} className="border border-ink/10 rounded-xl p-4 bg-white/40">
                <p className="text-xs text-vermilion mb-1">第 {s.stamp_number} 枚策印</p>
                <p className="text-sm text-ink font-medium">{s.skill_title}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
