import { useNavigate } from 'react-router-dom';

export default function GrowthLevelUpModal({ achievement, onClose }) {
  const navigate = useNavigate();

  function handleViewProgress() {
    onClose();
    navigate('/progress');
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
        <p style={{ fontSize: 32, textAlign: 'center' }}>🌟</p>
        <p style={{ marginTop: 12, fontSize: 16, color: '#FFFFFF', fontWeight: 700, textAlign: 'center' }}>
          你升级了
        </p>
        <p style={{ marginTop: 12, fontSize: 22, color: '#C41E1E', fontWeight: 700, textAlign: 'center' }}>
          {achievement.title}
        </p>
        <p style={{ marginTop: 8, fontSize: 14, color: '#999999', textAlign: 'center' }}>{achievement.meaning}</p>
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleViewProgress}
            style={{
              backgroundColor: '#C41E1E',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              border: 'none',
            }}
          >
            查看我的成长档案
          </button>
        </div>
      </div>
    </div>
  );
}
