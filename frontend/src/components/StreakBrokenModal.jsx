export default function StreakBrokenModal({ newStreak, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#333333',
          borderRadius: 16,
          padding: 32,
          width: 'calc(100vw - 48px)',
          maxWidth: 360,
        }}
      >
        <p style={{ fontSize: 32, textAlign: 'center' }}>💔</p>
        <p style={{ marginTop: 12, fontSize: 16, color: '#FFFFFF', fontWeight: 700, textAlign: 'center' }}>
          昨天断签了
        </p>
        <p style={{ marginTop: 8, fontSize: 13, color: '#999999', textAlign: 'center' }}>
          连续打卡从第1天重新开始
        </p>
        <p style={{ marginTop: 16, fontSize: 28, color: '#C41E1E', fontWeight: 700, textAlign: 'center' }}>
          {newStreak}天
        </p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
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
            重新开始
          </button>
        </div>
      </div>
    </div>
  );
}
