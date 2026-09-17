export default function WelcomeModal({ trialConcern, trialSkillName, remainingSkillCount, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div style={{ backgroundColor: '#1a1a1a', borderRadius: 16, padding: 28, width: 'calc(100vw - 48px)', maxWidth: 360 }}>
        <img
          src="/icons/icon-192.png"
          alt="渐步"
          style={{ width: 24, height: 24, display: 'block', margin: '0 auto', borderRadius: 6 }}
        />
        <div style={{ height: 16 }} />
        <p style={{ fontSize: 18, color: '#FFFFFF', fontWeight: 700, textAlign: 'center' }}>欢迎正式加入渐步</p>
        <div style={{ height: 20 }} />
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: 8, padding: 16 }}>
          <p style={{ fontSize: 11, color: '#999999', textAlign: 'center' }}>你第一次来到渐步，是因为</p>
          <p style={{ fontSize: 14, color: '#F2EDE4', textAlign: 'center', lineHeight: 1.6, marginTop: 8 }}>
            {trialConcern}
          </p>
        </div>
        <div style={{ height: 16 }} />
        {trialSkillName && (
          <p style={{ fontSize: 13, color: '#999999', textAlign: 'center' }}>
            那一次，渐步为你找到了【{trialSkillName}】
          </p>
        )}
        <div style={{ height: 24 }} />
        <p style={{ fontSize: 14, color: '#C41E1E', textAlign: 'center', fontWeight: 700 }}>
          现在，{remainingSkillCount}个Skill在等你
        </p>
        <div style={{ height: 20 }} />
        <button
          type="button"
          onClick={onClose}
          style={{
            backgroundColor: '#C41E1E',
            color: '#FFFFFF',
            borderRadius: 8,
            width: '100%',
            padding: '12px 0',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
          }}
        >
          开始我的渐步之旅
        </button>
      </div>
    </div>
  );
}
