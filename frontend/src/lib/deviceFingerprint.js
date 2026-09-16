function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#C41E1E';
    ctx.fillText('渐步进化共同体-fingerprint', 2, 2);
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

export function getDeviceFingerprint() {
  const parts = [
    navigator.userAgent || '',
    `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.language || '',
    getCanvasFingerprint(),
  ];
  return simpleHash(parts.join('|'));
}

export function getDeviceName() {
  const ua = navigator.userAgent || '';

  let os = '未知系统';
  if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = '未知浏览器';
  if (/MicroMessenger/.test(ua)) browser = '微信内置浏览器';
  else if (/EdgiOS|Edg\//.test(ua)) browser = 'Edge';
  else if (/CriOS|Chrome\//.test(ua)) browser = 'Chrome';
  else if (/FxiOS|Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  return `${browser} · ${os}`;
}
