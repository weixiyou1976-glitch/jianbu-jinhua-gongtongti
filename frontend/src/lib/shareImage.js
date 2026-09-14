import QRCode from 'qrcode';

const CANVAS_W = 750;
const CANVAS_H = 1000;
const PAPER = '#F2EDE4';
const VERMILION = '#C0392B';
const INK = '#2B2B2B';
const INK_MUTED = '#8A8478';
const QUOTE_BG = '#E8E2D6';
const MARGIN_X = 70;
const CONTENT_W = CANVAS_W - MARGIN_X * 2;

const QR_OUTER = 200;
const QR_MARGIN = 16;
const QR_INNER = QR_OUTER - QR_MARGIN * 2;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapParagraph(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }
    let current = '';
    for (const ch of Array.from(paragraph)) {
      const test = current + ch;
      if (current && ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawCenteredLines(ctx, lines, centerX, startY, lineHeight) {
  lines.forEach((line, i) => {
    ctx.fillText(line, centerX, startY + i * lineHeight);
  });
  return startY + lines.length * lineHeight;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCircularImage(ctx, img, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

function drawAvatarPlaceholder(ctx, x, y, size) {
  ctx.fillStyle = VERMILION;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(size * 0.5)}px "Noto Serif SC", serif`;
  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('龙', x + size / 2, y + size / 2 + 1);
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
}

async function generateQrCanvas(url, size) {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, url, {
    errorCorrectionLevel: 'H',
    width: size,
    margin: 0,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  return canvas;
}

export async function generateShareImage({ skill, gainedText, referralCode }) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textBaseline = 'top';

  let logo = null;
  try {
    logo = await loadImage('/icons/icon-192.png');
  } catch {
    logo = null;
  }
  let avatar = null;
  try {
    avatar = await loadImage('/avatar/aolong.jpg');
  } catch {
    avatar = null;
  }

  const trialUrl = `https://jianbu.ceyunju.com/trial?ref=${referralCode}`;
  let qrCanvas = null;
  try {
    qrCanvas = await generateQrCanvas(trialUrl, QR_INNER);
  } catch {
    qrCanvas = null;
  }

  let y = 60;
  const logoSize = 44;
  if (logo) ctx.drawImage(logo, MARGIN_X, y, logoSize, logoSize);
  ctx.fillStyle = INK;
  ctx.font = '600 26px "Noto Serif SC", serif';
  ctx.textAlign = 'left';
  ctx.fillText('渐步进化共同体', MARGIN_X + logoSize + 16, y + 9);
  y += logoSize + 28;

  const avatarSize = 32;
  if (avatar) {
    drawCircularImage(ctx, avatar, MARGIN_X, y, avatarSize);
  } else {
    drawAvatarPlaceholder(ctx, MARGIN_X, y, avatarSize);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = '600 18px "Noto Serif SC", serif';
  ctx.fillText('傲龙推荐', MARGIN_X + avatarSize + 12, y + 6);
  y += avatarSize + 30;

  ctx.textAlign = 'center';
  ctx.fillStyle = VERMILION;
  ctx.font = 'bold 46px "Noto Serif SC", serif';
  const anchorLines = wrapParagraph(ctx, skill.memory_anchor, CONTENT_W);
  y = drawCenteredLines(ctx, anchorLines, CANVAS_W / 2, y, 58) + 26;

  ctx.fillStyle = INK;
  ctx.font = '600 27px "Noto Serif SC", serif';
  const nameLines = wrapParagraph(ctx, skill.skill_name, CONTENT_W);
  y = drawCenteredLines(ctx, nameLines, CANVAS_W / 2, y, 36) + 32;

  if (gainedText) {
    ctx.font = '16px "Noto Serif SC", serif';
    let quoteLines = wrapParagraph(ctx, gainedText, CONTENT_W - 80);
    const maxLines = 4;
    if (quoteLines.length > maxLines) {
      quoteLines = quoteLines.slice(0, maxLines);
      quoteLines[maxLines - 1] = quoteLines[maxLines - 1].slice(0, -1) + '…';
    }
    const labelH = 28;
    const lineH = 26;
    const boxPadding = 22;
    const boxH = labelH + quoteLines.length * lineH + boxPadding * 2;
    const boxY = y;
    ctx.fillStyle = QUOTE_BG;
    roundRect(ctx, MARGIN_X, boxY, CONTENT_W, boxH, 16);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = VERMILION;
    ctx.font = '600 15px "Noto Serif SC", serif';
    ctx.fillText('我得到了', MARGIN_X + 36, boxY + boxPadding);

    ctx.fillStyle = '#5A5548';
    ctx.font = '16px "Noto Serif SC", serif';
    quoteLines.forEach((line, i) => {
      ctx.fillText(line, MARGIN_X + 36, boxY + boxPadding + labelH + i * lineH);
    });
    y = boxY + boxH;
  }

  const dividerY = Math.min(y + 24, 654);
  ctx.strokeStyle = 'rgba(43,43,43,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, dividerY);
  ctx.lineTo(CANVAS_W - MARGIN_X, dividerY);
  ctx.stroke();

  const cardY = dividerY + 26;
  const cardPadding = 16;
  const topTextH = 20;
  const gapAfterTopText = 10;
  const gapAfterQr = 10;
  const bottomTextH = 16;
  const cardH = cardPadding * 2 + topTextH + gapAfterTopText + QR_OUTER + gapAfterQr + bottomTextH;

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, MARGIN_X, cardY, CONTENT_W, cardH, 8);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = INK_MUTED;
  ctx.font = '14px "Noto Serif SC", serif';
  ctx.fillText('扫码免费体验渐步', CANVAS_W / 2, cardY + cardPadding);

  const qrX = CANVAS_W / 2 - QR_OUTER / 2;
  const qrY = cardY + cardPadding + topTextH + gapAfterTopText;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX, qrY, QR_OUTER, QR_OUTER);
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, qrX + QR_MARGIN, qrY + QR_MARGIN, QR_INNER, QR_INNER);
  }

  ctx.fillStyle = VERMILION;
  ctx.font = '12px "Noto Serif SC", serif';
  ctx.fillText('渐小而坚，步步在前', CANVAS_W / 2, qrY + QR_OUTER + gapAfterQr);

  return canvas.toDataURL('image/png');
}
