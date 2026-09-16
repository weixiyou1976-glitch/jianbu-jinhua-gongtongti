import { useNavigate } from 'react-router-dom';

export default function RewardUnlockModal({ reward, onClose }) {
  const navigate = useNavigate();

  function handleViewRewards() {
    onClose();
    navigate('/rewards');
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
        }}
      >
        <p style={{ fontSize: 32, textAlign: 'center' }}>🎁</p>
        <p
          style={{
            marginTop: 12,
            fontSize: 16,
            color: '#FFFFFF',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          你解锁了新奖励
        </p>
        <p style={{ marginTop: 12, fontSize: 14, color: '#F2EDE4', textAlign: 'center', lineHeight: 1.6 }}>
          {reward.reward_content}
        </p>
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleViewRewards}
            style={{
              backgroundColor: '#C41E1E',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              border: 'none',
            }}
          >
            查看奖励
          </button>
        </div>
      </div>
    </div>
  );
}
