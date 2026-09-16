import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ProgressRing from '../components/ProgressRing';
import BottomNav from '../components/BottomNav';
import AoLongAvatar from '../components/AoLongAvatar';
import DailyQuoteModal from '../components/DailyQuoteModal';
import RewardUnlockModal from '../components/RewardUnlockModal';
import StreakFlame from '../components/StreakFlame';
import StreakBanner from '../components/StreakBanner';
import StreakBrokenModal from '../components/StreakBrokenModal';

const HIDE_ADD_BANNER_KEY = 'hideAddToHomeBanner';

function todayKey() {
  return `daily_quote_${new Date().toISOString().slice(0, 10)}`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [current, setCurrent] = useState(null);
  const [progress, setProgress] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [modules, setModules] = useState([]);
  const [error, setError] = useState('');
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [checkinToast, setCheckinToast] = useState(false);
  const [dailyQuote, setDailyQuote] = useState(null);
  const [pendingRewards, setPendingRewards] = useState([]);
  const [streakBrokenInfo, setStreakBrokenInfo] = useState(null);
  const [bannerStreak, setBannerStreak] = useState(null);

  function maybeTriggerDailyQuote() {
    const key = todayKey();
    let alreadyShown = true;
    try {
      alreadyShown = localStorage.getItem(key) === 'true';
    } catch {
      // 忽略隐私模式下localStorage不可用的情况
    }
    if (!alreadyShown) {
      try {
        localStorage.setItem(key, 'true');
      } catch {
        // 忽略隐私模式下localStorage不可用的情况
      }
      api.getTodayQuote().then(setDailyQuote).catch(() => {});
    }
  }

  useEffect(() => {
    api.getPendingRewards().then(setPendingRewards).catch(() => {});
    Promise.all([api.getCurrentSkill(), api.getProgress(), api.getStamps()])
      .then(([c, p, s]) => {
        setCurrent(c);
        setProgress(p);
        setStamps(s.slice(0, 3));
      })
      .catch((err) => setError(err.message));
    api.getModules().then(setModules).catch(() => {});
    api
      .checkin()
      .then((res) => {
        if (res.is_new) {
          setCheckinToast(true);
          setTimeout(() => setCheckinToast(false), 2000);
          if (res.streak >= 3) setBannerStreak(res.streak);
        }
        if (res.streak_broken) {
          setStreakBrokenInfo(res.streak);
        } else if (res.is_new) {
          maybeTriggerDailyQuote();
        }
      })
      .catch(() => {});
    try {
      if (localStorage.getItem(HIDE_ADD_BANNER_KEY) !== 'true') setShowAddBanner(true);
    } catch {
      // 忽略隐私模式下localStorage不可用的情况
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCloseRewardModal() {
    const [first, ...rest] = pendingRewards;
    if (first) api.markRewardNotified(first.id).catch(() => {});
    setPendingRewards(rest);
  }

  function handleCloseStreakBroken() {
    setStreakBrokenInfo(null);
    maybeTriggerDailyQuote();
  }

  function dismissAddBanner() {
    setShowAddBanner(false);
    try {
      localStorage.setItem(HIDE_ADD_BANNER_KEY, 'true');
    } catch {
      // 忽略隐私模式下localStorage不可用的情况
    }
  }

  return (
    <div className="min-h-screen bg-paper pb-24">
      {checkinToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper text-xs px-4 py-2 rounded-full shadow-lg">
          今天还没打卡，你来了 ✓
        </div>
      )}
      <header className="max-w-content mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div>
          <p className="text-ink/40 text-xs">欢迎回来</p>
          <p className="text-ink text-sm">{user?.email}</p>
        </div>
        <button onClick={logout} className="text-xs text-ink/40 border border-ink/15 rounded-full px-3 py-1.5">
          退出
        </button>
      </header>

      <div className="max-w-content mx-auto px-6 pt-2 pb-6 flex flex-col items-center text-center">
        <AoLongAvatar size={48} />
        <p className="text-ink text-sm font-bold mt-2">傲龙</p>
        <p className="text-ink/40 text-xs mt-0.5">敕名策运师 · 渐步进化共同体创始人</p>
      </div>

      <main className="max-w-content mx-auto px-6">
        {error && <p className="text-vermilion text-sm mb-4">{error}</p>}

        {showAddBanner && (
          <div className="flex items-center gap-3 border border-vermilion/20 rounded-2xl px-4 py-3 mb-6 bg-vermilion/5">
            <span className="text-xl shrink-0">📲</span>
            <p className="flex-1 text-xs text-ink/70 leading-relaxed">
              把渐步添加到手机桌面，打开更快，学习进度更稳。
              <Link to="/add-to-home" className="text-vermilion font-semibold ml-1">
                查看教程 →
              </Link>
            </p>
            <button
              type="button"
              onClick={dismissAddBanner}
              aria-label="关闭"
              className="text-ink/30 text-lg leading-none shrink-0 px-1"
            >
              ×
            </button>
          </div>
        )}

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
            <div className="text-sm text-ink/60 space-y-2">
              <StreakFlame streak={progress.streak} />
              <p>已完成 <span className="text-vermilion font-semibold">{progress.percent}%</span></p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">按主题学</h3>
            <Link to="/modules" className="text-xs text-vermilion">全部 →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {modules.map((m) => (
              <Link
                key={m.id}
                to={`/modules/${m.slug}`}
                className="block border border-vermilion/20 rounded-2xl p-4 bg-white/50 hover:border-vermilion/40"
              >
                <p className="text-sm font-semibold text-ink mb-1">{m.name}</p>
                <p className="text-xs text-ink/60 line-clamp-2">{m.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>

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

      {streakBrokenInfo != null && (
        <StreakBrokenModal newStreak={streakBrokenInfo} onClose={handleCloseStreakBroken} />
      )}
      {dailyQuote && <DailyQuoteModal quote={dailyQuote} onClose={() => setDailyQuote(null)} />}
      {!dailyQuote && pendingRewards.length > 0 && (
        <RewardUnlockModal reward={pendingRewards[0]} onClose={handleCloseRewardModal} />
      )}
      {!dailyQuote && bannerStreak != null && (
        <StreakBanner streak={bannerStreak} onDone={() => setBannerStreak(null)} />
      )}
    </div>
  );
}
