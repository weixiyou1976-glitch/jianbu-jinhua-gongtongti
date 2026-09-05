import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateFn, setUpdateFn] = useState(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {},
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        const checkForUpdate = () => registration.update().catch(() => {});
        // iOS 上长期驻留主屏幕的PWA很少触发浏览器自带的SW更新检查，
        // 每次回到前台时主动查一次，避免用户停留在旧版本上看不到新内容。
        setInterval(checkForUpdate, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
      },
    });
    setUpdateFn(() => update);
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 text-sm">
      <span>发现新版本</span>
      <button
        onClick={() => updateFn && updateFn(true)}
        className="bg-vermilion px-3 py-1 rounded-full font-medium"
      >
        立即刷新
      </button>
    </div>
  );
}
