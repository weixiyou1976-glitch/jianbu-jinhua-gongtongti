import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BottomNav from '../components/BottomNav';

export default function Progress() {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProgress().then(setProgress).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4">
        <h1 className="text-lg font-semibold text-ink">我的进度</h1>
      </header>

      <main className="max-w-content mx-auto px-6">
        {error && <p className="text-vermilion text-sm mb-4">{error}</p>}

        {progress && (
          <>
            <section className="border border-ink/10 rounded-2xl p-6 mb-4 bg-white/40">
              <h2 className="text-sm font-semibold text-ink mb-1">连续打卡</h2>
              <p className="text-xs text-ink/40 mb-4">每天打开渐步自动记录，保持学习节奏</p>
              <p className="text-3xl font-bold text-vermilion text-center">
                {progress.streak} <span className="text-sm font-normal text-ink/50">天</span>
              </p>
            </section>

            <section className="border border-ink/10 rounded-2xl p-6 mb-8 bg-white/40">
              <h2 className="text-sm font-semibold text-ink mb-1">策印记录</h2>
              <p className="text-xs text-ink/40 mb-4">每次在真实场景里用了Skill，就提交一枚策印</p>
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-vermilion">{progress.completed}/{progress.total}</p>
                  <p className="text-xs text-ink/50 mt-1">已完成周数</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-vermilion">{progress.percent}%</p>
                  <p className="text-xs text-ink/50 mt-1">完成百分比</p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
              {progress.grid.map((cell) => (
                <div
                  key={cell.week}
                  title={`第 ${cell.week} 周`}
                  className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${
                    cell.completed ? 'bg-vermilion text-paper' : 'bg-ink/5 text-ink/30'
                  }`}
                >
                  {cell.week}
                </div>
              ))}
            </div>
          </>
        )}

        <Link
          to="/rewards"
          className="flex items-center justify-between border border-ink/10 rounded-2xl p-4 mt-8 bg-white/40"
        >
          <span className="flex items-center gap-2 text-sm text-ink">
            <span className="text-lg">🎁</span>
            推荐奖励
          </span>
          <span className="text-xs text-ink/40">→</span>
        </Link>

        <Link
          to="/quotes"
          className="flex items-center justify-between border border-ink/10 rounded-2xl p-4 mt-3 bg-white/40"
        >
          <span className="flex items-center gap-2 text-sm text-ink">
            <span className="text-lg">📝</span>
            我的策语收藏
          </span>
          <span className="text-xs text-ink/40">→</span>
        </Link>

        <Link
          to="/add-to-home"
          className="flex items-center justify-between border border-ink/10 rounded-2xl p-4 mt-3 bg-white/40"
        >
          <span className="flex items-center gap-2 text-sm text-ink">
            <span className="text-lg">📲</span>
            添加到桌面教程
          </span>
          <span className="text-xs text-ink/40">→</span>
        </Link>
      </main>

      <BottomNav />
    </div>
  );
}
