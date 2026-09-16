import { useEffect, useState } from 'react';

function getBannerText(streak) {
  if (streak >= 7) return `🔥 连续${streak}天实战！你已经是少数人了——明天继续，别让它断`;
  if (streak >= 3) return `🔥 已连续${streak}天在真实场景里用出来——明天继续，别让它断`;
  return null;
}

export default function StreakBanner({ streak, onDone }) {
  const [visible, setVisible] = useState(false);
  const text = getBannerText(streak);

  useEffect(() => {
    if (!text) {
      onDone?.();
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    const t1 = setTimeout(() => setVisible(false), 3000);
    const t2 = setTimeout(() => onDone?.(), 3400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!text) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center text-center px-6"
      style={{
        height: 48,
        background: 'linear-gradient(90deg, #C41E1E, #FF4444)',
        color: '#FFFFFF',
        fontSize: 14,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 400ms ease',
      }}
    >
      {text}
    </div>
  );
}
