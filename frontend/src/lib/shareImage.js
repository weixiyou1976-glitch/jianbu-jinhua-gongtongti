import QRCode from 'qrcode';

const CANVAS_W = 750;
const CANVAS_H = 1100;
const PAPER = '#F2EDE4';
const VERMILION = '#C41E1E';
const INK = '#2B2B2B';
const GRAY_888 = '#888888';
const GRAY_555 = '#555555';
const QUOTE_BG = '#EFEBE3';
const DIVIDER_COLOR = '#E0D8CC';
const MARGIN_X = 40;
const CONTENT_W = CANVAS_W - MARGIN_X * 2;
const LINE_H = 6;

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

function truncateLines(lines, maxLines) {
  if (lines.length <= maxLines) return lines;
  const cut = lines.slice(0, maxLines);
  cut[maxLines - 1] = cut[maxLines - 1].slice(0, -1) + '…';
  return cut;
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

  // 顶部红线
  ctx.fillStyle = VERMILION;
  ctx.fillRect(0, 0, CANVAS_W, LINE_H);

  // 区块一：顶部品牌区（高度80px）
  const region1Top = LINE_H;
  const region1H = 80;
  const region1CenterY = region1Top + region1H / 2;

  ctx.textBaseline = 'middle';
  const brandIconSize = 24;
  if (logo) ctx.drawImage(logo, MARGIN_X, region1CenterY - brandIconSize / 2, brandIconSize, brandIconSize);
  ctx.textAlign = 'left';
  ctx.fillStyle = GRAY_888;
  ctx.font = '14px "Noto Serif SC", serif';
  ctx.fillText('渐步进化共同体', MARGIN_X + brandIconSize + 8, region1CenterY);

  const avatarSize = 24;
  const rightLabel = '傲龙推荐';
  ctx.font = '12px "Noto Serif SC", serif';
  const rightLabelW = ctx.measureText(rightLabel).width;
  const rightBlockW = avatarSize + 8 + rightLabelW;
  const rightBlockX = CANVAS_W - MARGIN_X - rightBlockW;
  if (avatar) {
    drawCircularImage(ctx, avatar, rightBlockX, region1CenterY - avatarSize / 2, avatarSize);
  } else {
    drawAvatarPlaceholder(ctx, rightBlockX, region1CenterY - avatarSize / 2, avatarSize);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = GRAY_888;
  ctx.fillText(rightLabel, rightBlockX + avatarSize + 8, region1CenterY);

  ctx.textBaseline = 'top';
  let y = region1Top + region1H;

  // 区块二：核心内容区
  y += 60;

  ctx.textAlign = 'center';
  ctx.fillStyle = VERMILION;
  ctx.font = 'bold 36px "Noto Serif SC", serif';
  const anchorLineHeight = Math.round(36 * 1.3);
  const anchorLines = truncateLines(wrapParagraph(ctx, skill.memory_anchor, CONTENT_W), 2);
  y = drawCenteredLines(ctx, anchorLines, CANVAS_W / 2, y, anchorLineHeight) + 24;

  ctx.fillStyle = INK;
  ctx.font = '18px "Noto Serif SC", serif';
  const nameLineHeight = 24;
  const nameLines = truncateLines(wrapParagraph(ctx, skill.skill_name, CONTENT_W), 2);
  y = drawCenteredLines(ctx, nameLines, CANVAS_W / 2, y, nameLineHeight) + 24;

  if (gainedText) {
    ctx.font = '14px "Noto Serif SC", serif';
    const quoteLineHeight = Math.round(14 * 1.6);
    const quotePadding = 16;
    const quoteLines = truncateLines(wrapParagraph(ctx, gainedText, CONTENT_W - quotePadding * 2 - 6), 3);
    const boxH = quotePadding * 2 + quoteLines.length * quoteLineHeight;
    const boxY = y;

    ctx.fillStyle = QUOTE_BG;
    roundRect(ctx, MARGIN_X, boxY, CONTENT_W, boxH, 6);
    ctx.fill();
    ctx.fillStyle = VERMILION;
    ctx.fillRect(MARGIN_X, boxY, 3, boxH);

    ctx.textAlign = 'left';
    ctx.fillStyle = GRAY_555;
    ctx.font = '14px "Noto Serif SC", serif';
    quoteLines.forEach((line, i) => {
      ctx.fillText(line, MARGIN_X + quotePadding, boxY + quotePadding + i * quoteLineHeight);
    });
    y = boxY + boxH;
  }

  // 区块三：分隔区（高度60px：上下各留30px）+ 区块四：二维码区
  // 剩余空间在"内容区之后"与"二维码卡片之后"之间平均分配，
  // 避免内容较短时所有留白都堆在图片底部，形成一大片空白。
  const dividerBlockH = 61; // 30 + 1px线 + 30
  const cardPadding = 20;
  const cardTopTextH = 18;
  const gapAfterTopText = 10;
  const gapAfterQr = 10;
  const cardBottomTextH = 16;
  const cardH = cardPadding * 2 + cardTopTextH + gapAfterTopText + QR_OUTER + gapAfterQr + cardBottomTextH;
  const gap2 = 60; // 分隔线到二维码卡片

  const remaining = CANVAS_H - LINE_H - y - dividerBlockH - gap2 - cardH;
  const gap1 = Math.max(40, Math.min(remaining - 40, Math.round(remaining * 0.45)));

  y += gap1;
  const dividerY = y + 30;
  ctx.strokeStyle = DIVIDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, dividerY);
  ctx.lineTo(CANVAS_W - MARGIN_X, dividerY);
  ctx.stroke();
  y = dividerY + 30;

  y += gap2;
  const cardX = MARGIN_X;
  const cardW = CONTENT_W;
  const cardY = y;

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, 12);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = GRAY_888;
  ctx.font = '13px "Noto Serif SC", serif';
  ctx.fillText('扫码免费体验渐步', CANVAS_W / 2, cardY + cardPadding);

  const qrX = CANVAS_W / 2 - QR_OUTER / 2;
  const qrY = cardY + cardPadding + cardTopTextH + gapAfterTopText;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX, qrY, QR_OUTER, QR_OUTER);
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, qrX + QR_MARGIN, qrY + QR_MARGIN, QR_INNER, QR_INNER);
  }

  ctx.fillStyle = VERMILION;
  ctx.font = '12px "Noto Serif SC", serif';
  ctx.fillText('渐小而坚，步步在前', CANVAS_W / 2, qrY + QR_OUTER + gapAfterQr);

  // 底部红线（贴底部）
  ctx.fillStyle = VERMILION;
  ctx.fillRect(0, CANVAS_H - LINE_H, CANVAS_W, LINE_H);

  return canvas.toDataURL('image/png');
}
