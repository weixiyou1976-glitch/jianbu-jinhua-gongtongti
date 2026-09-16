import { useEffect, useState } from 'react';

const OVERLAY_MS = 200;
const SEAL_DROP_MS = 400;
const HOLD_MS = 1500;
const FADE_OUT_MS = 300;

function playStampSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // 忽略不支持 Web Audio 的环境
  }
}

export default function StampCeremonyModal({ stampNumber, onDone }) {
  const [phase, setPhase] = useState('enter'); // enter | settled | leaving

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('settled');
      if (navigator.vibrate) {
        try {
          navigator.vibrate(200);
        } catch {
          // 忽略不支持震动的设备
        }
      }
      playStampSound();
    }, SEAL_DROP_MS);

    const t2 = setTimeout(() => setPhase('leaving'), SEAL_DROP_MS + HOLD_MS);
    const t3 = setTimeout(() => onDone?.(), SEAL_DROP_MS + HOLD_MS + FADE_OUT_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: '#000000',
        opacity: phase === 'leaving' ? 0 : 0.6,
        transition: `opacity ${phase === 'leaving' ? FADE_OUT_MS : OVERLAY_MS}ms ease`,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: phase === 'leaving' ? 0 : 1,
          transition: `opacity ${FADE_OUT_MS}ms ease`,
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            border: '4px solid #C41E1E',
            backgroundColor: 'rgba(196,30,30,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `stamp-drop ${SEAL_DROP_MS}ms cubic-bezier(0.3,0,0.5,1) both`,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#C41E1E',
              opacity: phase === 'enter' ? 0 : 1,
              transform: phase === 'enter' ? 'scale(0.5)' : 'scale(1)',
              transition: 'opacity 200ms ease, transform 200ms ease',
            }}
          >
            第{stampNumber}枚策印
          </span>
        </div>
        <p
          style={{
            marginTop: 20,
            fontSize: 14,
            color: '#FFFFFF',
            textAlign: 'center',
            opacity: phase === 'enter' ? 0 : 1,
            transition: 'opacity 300ms ease',
            transitionDelay: phase === 'enter' ? '0ms' : '100ms',
          }}
        >
          已刻入 · 渐步进化共同体
        </p>
      </div>

      <style>{`
        @keyframes stamp-drop {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
