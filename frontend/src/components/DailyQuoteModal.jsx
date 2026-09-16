import { useEffect, useState } from 'react';
import { api } from '../api';

const TYPEWRITER_START_DELAY = 200;
const TYPEWRITER_CHAR_INTERVAL = 30;

export default function DailyQuoteModal({ quote, onClose }) {
  const [visible, setVisible] = useState(false);
  const [typedLength, setTypedLength] = useState(0);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const chars = Array.from(quote.quote_content);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (typedLength >= chars.length) return;
    const delay = typedLength === 0 ? TYPEWRITER_START_DELAY : TYPEWRITER_CHAR_INTERVAL;
    const timer = setTimeout(() => setTypedLength((n) => n + 1), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedLength]);

  async function handleSave() {
    if (saveState !== 'idle') return;
    setSaveState('saving');
    try {
      await api.saveQuote(quote.skill_id, quote.quote_content);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 16,
          padding: 32,
          width: 'calc(100vw - 48px)',
          maxWidth: 360,
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 400ms ease-out, opacity 400ms ease-out',
        }}
      >
        <p style={{ fontSize: 11, color: '#C41E1E', letterSpacing: '0.12em', textAlign: 'center' }}>
          今日策语
        </p>
        <p
          style={{
            marginTop: 20,
            fontSize: 20,
            color: '#F2EDE4',
            lineHeight: 1.6,
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          {chars.slice(0, typedLength).join('')}
        </p>
        <p style={{ marginTop: 24, fontSize: 12, color: '#666666', textAlign: 'center' }}>
          —— 渐步·【{quote.skill_name}】
        </p>
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState !== 'idle'}
            style={{
              border: saveState === 'saved' ? '1px solid #666666' : '1px solid #FFFFFF',
              backgroundColor: 'transparent',
              color: saveState === 'saved' ? '#666666' : '#FFFFFF',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
            }}
          >
            {saveState === 'saved' ? '已收藏 ✓' : '收藏'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#C41E1E',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              border: 'none',
            }}
          >
            继续学习
          </button>
        </div>
      </div>
    </div>
  );
}
