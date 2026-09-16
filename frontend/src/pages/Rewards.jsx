import { useEffect, useState } from 'react';
import { api } from '../api';
import BottomNav from '../components/BottomNav';
import InsightAudioButton from '../components/InsightAudioButton';

function formatTime(isoLike) {
  if (!isoLike) return '';
  const date = new Date(isoLike.replace(' ', 'T') + 'Z');
  return date.toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function MilestoneCard({ milestone, reward_content, unlocked, remaining }) {
  const progress = Math.min(100, Math.round(((milestone - remaining) / milestone) * 100));
  return (
    <div
      className={`border rounded-2xl p-4 ${unlocked ? 'border-vermilion/30 bg-vermilion/5' : 'border-ink/10 bg-white/30'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${unlocked ? 'text-vermilion' : 'text-ink/40'}`}>
          {milestone} 次{unlocked ? ' · 已解锁 ✓' : ''}
        </span>
        {!unlocked && <span className="text-xs text-ink/40 shrink-0">还差 {remaining} 次</span>}
      </div>
      <p className={`text-xs leading-relaxed ${unlocked ? 'text-ink/70' : 'text-ink/30'}`}>{reward_content}</p>
      {!unlocked && (
        <div className="mt-3 h-1.5 bg-ink/10 rounded-full overflow-hidden">
          <div className="h-full bg-vermilion/40" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function FangsVoiceList({ items }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-ink mb-3">傲龙私房话</h3>
      <div className="space-y-2">
        {items.map((f) => (
          <div
            key={f.id}
            className={`flex items-center justify-between border rounded-xl p-3 ${
              f.unlocked ? 'border-vermilion/20 bg-white/40' : 'border-ink/10 bg-ink/5'
            }`}
          >
            <span className={`text-sm ${f.unlocked ? 'text-ink' : 'text-ink/30'}`}>{f.title}</span>
            {f.unlocked ? <InsightAudioButton src={f.audio_url} /> : <span className="text-ink/30 text-lg shrink-0">🔒</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CommissionsTab({ data }) {
  const typeLabel = { first_year: '首年推荐', renewal: '续费二级' };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="border border-ink/10 rounded-xl p-3 text-center bg-white/40">
          <p className="text-lg font-bold text-vermilion">¥{data.commission_summary.total.toFixed(2)}</p>
          <p className="text-[11px] text-ink/40 mt-1">累计应得</p>
        </div>
        <div className="border border-ink/10 rounded-xl p-3 text-center bg-white/40">
          <p className="text-lg font-bold text-ink">¥{data.commission_summary.paid.toFixed(2)}</p>
          <p className="text-[11px] text-ink/40 mt-1">已结算</p>
        </div>
        <div className="border border-ink/10 rounded-xl p-3 text-center bg-white/40">
          <p className="text-lg font-bold text-ink">¥{data.commission_summary.pending.toFixed(2)}</p>
          <p className="text-[11px] text-ink/40 mt-1">待结算</p>
        </div>
      </div>

      {data.commissions.length === 0 && <p className="text-sm text-ink/40">还没有分润记录</p>}
      <div className="space-y-2">
        {data.commissions.map((c) => (
          <div key={c.id} className="border border-ink/10 rounded-xl p-3 bg-white/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-ink">{c.payer_label}</span>
              <span
                className={`text-xs rounded-full px-2 py-0.5 border ${
                  c.status === 'paid' ? 'text-ink/40 border-ink/15' : 'text-vermilion border-vermilion/30'
                }`}
              >
                {c.status === 'paid' ? '已结算' : '待结算'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-ink/50">
              <span>{typeLabel[c.commission_type] || c.commission_type} · 订单 ¥{c.order_amount.toFixed(2)}</span>
              <span className="text-vermilion font-medium">¥{c.commission_amount.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-ink/30 mt-1">{formatTime(c.created_at)}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink/35 leading-relaxed mt-6 text-center">
        分润由傲龙每月月底统一核算，通过微信转账结算。
        <br />
        如有疑问请联系傲龙（微信：751759951）
      </p>
    </div>
  );
}

export default function Rewards() {
  const [tab, setTab] = useState('share');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMyRewards().then(setData).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4">
        <h1 className="text-lg font-semibold text-ink">推荐奖励</h1>
      </header>

      <main className="max-w-content mx-auto px-6">
        {error && <p className="text-vermilion text-sm mb-4">{error}</p>}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="border border-ink/10 rounded-xl p-3 text-center bg-white/40">
                <p className="text-lg font-bold text-vermilion">{data.share_click_count}</p>
                <p className="text-[11px] text-ink/40 mt-1">累计分享点击</p>
              </div>
              <div className="border border-ink/10 rounded-xl p-3 text-center bg-white/40">
                <p className="text-lg font-bold text-vermilion">{data.conversion_count}</p>
                <p className="text-[11px] text-ink/40 mt-1">累计转化人数</p>
              </div>
              <div className="border border-ink/10 rounded-xl p-3 text-center bg-white/40">
                <p className="text-sm font-bold text-ink leading-tight">
                  {[data.share_tag, data.conversion_tag].filter(Boolean).join(' · ') || '暂无标签'}
                </p>
                <p className="text-[11px] text-ink/40 mt-1">当前标签</p>
              </div>
            </div>

            <div className="flex mb-6 border-b border-vermilion/15">
              {[
                ['share', '分享奖励'],
                ['conversion', '转化奖励'],
                ['commission', '分润记录'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 pb-3 text-sm ${tab === key ? 'text-vermilion border-b-2 border-vermilion font-semibold' : 'text-ink/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'share' && (
              <div>
                <div className="space-y-3">
                  {data.share_milestones.map((m) => (
                    <MilestoneCard key={m.milestone} {...m} />
                  ))}
                </div>
                <FangsVoiceList items={data.fangs_voice.filter((f) => f.required_share_clicks > 0)} />
              </div>
            )}

            {tab === 'conversion' && (
              <div>
                <div className="space-y-3">
                  {data.conversion_milestones.map((m) => (
                    <MilestoneCard key={m.milestone} {...m} />
                  ))}
                </div>
                <FangsVoiceList items={data.fangs_voice.filter((f) => f.required_conversions > 0)} />
              </div>
            )}

            {tab === 'commission' && <CommissionsTab data={data} />}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
