import { useEffect, useState } from 'react';
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
            <div className="flex justify-around border border-ink/10 rounded-2xl p-6 mb-8 bg-white/40 text-center">
              <div>
                <p className="text-2xl font-bold text-vermilion">{progress.completed}/{progress.total}</p>
                <p className="text-xs text-ink/50 mt-1">已完成策印</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-vermilion">{progress.percent}%</p>
                <p className="text-xs text-ink/50 mt-1">完成百分比</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-vermilion">{progress.streak}</p>
                <p className="text-xs text-ink/50 mt-1">连续打卡天数</p>
              </div>
            </div>

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
      </main>

      <BottomNav />
    </div>
  );
}
