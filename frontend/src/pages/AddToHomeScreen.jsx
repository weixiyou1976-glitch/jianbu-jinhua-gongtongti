import { useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const SITE_URL = 'jianbu.ceyunju.com';

const iosSteps = [
  {
    icon: '🧭',
    title: (
      <>
        用 <span className="text-vermilion font-semibold">Safari 浏览器</span> 打开{' '}
        <span className="font-mono text-ink">{SITE_URL}</span>
      </>
    ),
    detail: (
      <>
        注意：必须用 <span className="text-vermilion font-semibold">Safari</span>，其他浏览器（微信内置浏览器、Chrome等）不支持添加到主屏幕
      </>
    ),
  },
  {
    icon: '📤',
    title: (
      <>
        点击底部中间的 <span className="text-vermilion font-semibold">"分享"按钮</span>
      </>
    ),
    detail: '方块加向上箭头的图标',
  },
  {
    icon: '📲',
    title: (
      <>
        在弹出的菜单里向下滑动，找到 <span className="text-vermilion font-semibold">"添加到主屏幕"</span>
      </>
    ),
    detail: '在分享菜单的功能列表中，可能需要滑动几下才能看到',
  },
  {
    icon: '✅',
    title: (
      <>
        点击右上角 <span className="text-vermilion font-semibold">"添加"</span>
      </>
    ),
    detail: '确认后就完成了',
  },
  {
    icon: '🏠',
    title: '回到桌面，找到渐步图标',
    detail: '以后直接点它打开，不用再找网址',
  },
];

const androidStepsChrome = [
  {
    icon: '🌐',
    title: (
      <>
        用 <span className="text-vermilion font-semibold">Chrome 浏览器</span> 打开{' '}
        <span className="font-mono text-ink">{SITE_URL}</span>
      </>
    ),
    detail: '建议用 Chrome，其他浏览器操作路径可能略有不同',
  },
  {
    icon: '⋮',
    title: (
      <>
        点击右上角 <span className="text-vermilion font-semibold">三个点的菜单</span>
      </>
    ),
    detail: '在地址栏的右侧',
  },
  {
    icon: '➕',
    title: (
      <>
        找到 <span className="text-vermilion font-semibold">"添加到主屏幕"</span> 或{' '}
        <span className="text-vermilion font-semibold">"安装应用"</span>
      </>
    ),
    detail: '不同手机品牌的菜单文字可能略有差异，意思相同',
  },
  {
    icon: '✅',
    title: '点击确认',
    detail: '确认后就完成了',
  },
  {
    icon: '🏠',
    title: '回到桌面，找到渐步图标',
    detail: '以后直接点它打开，不用再找网址',
  },
];

const androidStepsBookmark = [
  {
    icon: '🌐',
    title: (
      <>
        用 <span className="text-vermilion font-semibold">任意浏览器</span> 打开{' '}
        <span className="font-mono text-ink">{SITE_URL}</span> 并登录
      </>
    ),
    detail: '不限定 Chrome，手机自带的浏览器也可以',
  },
  {
    icon: '⭐',
    title: (
      <>
        把这个网址 <span className="text-vermilion font-semibold">收藏/添加书签</span>
      </>
    ),
    detail: '通常点击地址栏旁的星标图标，或浏览器菜单里的"收藏"',
  },
  {
    icon: '📑',
    title: (
      <>
        找到浏览器的 <span className="text-vermilion font-semibold">书签管理页面</span>
      </>
    ),
    detail: '一般在浏览器菜单的"书签"或"收藏夹"里',
  },
  {
    icon: '👆',
    title: (
      <>
        长按渐步的书签，选择 <span className="text-vermilion font-semibold">"添加到桌面"</span> 或{' '}
        <span className="text-vermilion font-semibold">"发送到桌面"</span>
      </>
    ),
    detail: '不同浏览器叫法略有不同，意思相同',
  },
  {
    icon: '🏠',
    title: '桌面会出现渐步的快捷方式',
    detail: '点击直接打开，不用再找网址',
  },
];

function StepList({ steps }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4 border border-ink/10 rounded-2xl p-4 bg-white/40">
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-vermilion/10 text-vermilion text-xs font-bold flex items-center justify-center">
              {i + 1}
            </div>
            <div className="text-2xl leading-none">{step.icon}</div>
          </div>
          <div className="pt-1">
            <p className="text-sm text-ink font-medium leading-relaxed">{step.title}</p>
            {step.detail && <p className="text-xs text-ink/50 mt-1 leading-relaxed">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AddToHomeScreen() {
  const [platform, setPlatform] = useState('ios');

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-8 pb-4">
        <Link to="/dashboard" className="text-xs text-ink/40">← 返回主页</Link>
        <h1 className="text-lg font-semibold text-ink mt-2">添加到手机桌面</h1>
      </header>

      <main className="max-w-content mx-auto px-6">
        <div className="border border-vermilion/20 rounded-2xl p-5 bg-white/50 mb-6">
          <p className="text-sm text-ink/70 leading-relaxed">
            把渐步添加到桌面之后，<span className="text-vermilion font-semibold">像App一样使用</span>：
            打开更快，还能<span className="text-vermilion font-semibold">保存你的学习进度</span>，不用每次重新登录、重新找网址。
          </p>
          <p className="text-sm text-ink/70 leading-relaxed mt-2">
            安卓手机有<span className="text-vermilion font-semibold">两种方法</span>可选：Chrome浏览器效果最好，
            不想下载Chrome的话，用任意浏览器的书签功能也能添加成功。
          </p>
        </div>

        <div className="flex border border-ink/15 rounded-full p-1 mb-6 bg-white/40">
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`flex-1 text-sm py-2 rounded-full transition-colors ${
              platform === 'ios' ? 'bg-vermilion text-paper font-semibold' : 'text-ink/50'
            }`}
          >
            iPhone
          </button>
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`flex-1 text-sm py-2 rounded-full transition-colors ${
              platform === 'android' ? 'bg-vermilion text-paper font-semibold' : 'text-ink/50'
            }`}
          >
            安卓
          </button>
        </div>

        {platform === 'ios' && <StepList steps={iosSteps} />}

        {platform === 'android' && (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-semibold text-ink">方案一：Chrome浏览器</h2>
                <span className="text-[10px] text-vermilion bg-vermilion/10 rounded-full px-2 py-0.5 font-semibold">
                  推荐
                </span>
              </div>
              <p className="text-xs text-ink/50 mb-3">效果最好，图标最漂亮，体验和App一样。</p>
              <StepList steps={androidStepsChrome} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ink mb-1">方案二：任意浏览器都可以用的方法</h2>
              <p className="text-xs text-ink/50 mb-3">如果不想下载Chrome，可以用这个方法：</p>
              <StepList steps={androidStepsBookmark} />
              <p className="text-xs text-ink/40 leading-relaxed mt-3">
                不同浏览器的操作略有不同，但大多数安卓浏览器都支持把书签发送到桌面。
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 border border-vermilion/20 rounded-2xl p-5 bg-vermilion/5">
          <p className="text-sm text-ink/70 leading-relaxed">
            添加完成后，你的手机桌面会出现<span className="text-vermilion font-semibold">渐步图标</span>，
            点它就能直接打开，不需要每次找网址。
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
