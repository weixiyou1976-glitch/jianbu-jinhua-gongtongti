import QRCode from 'qrcode';

const CANVAS_W = 750;
const PAPER = '#F2EDE4';
const VERMILION = '#C41E1E';
const BLACK = '#1a1a1a';
const GRAY_999 = '#999999';
const GRAY_888 = '#888888';
const GRAY_444 = '#444444';
const QUOTE_BG = '#EDE8DF';
const DIVIDER_COLOR = '#DDD8CF';
const MARGIN_X = 28;
const CONTENT_W = CANVAS_W - MARGIN_X * 2;

const QR_OUTER = 90;
const QR_MARGIN = 8;
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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillTextSpaced(ctx, text, x, y, letterSpacing) {
  let cursorX = x;
  for (const ch of Array.from(text)) {
    ctx.fillText(ch, cursorX, y);
    cursorX += ctx.measureText(ch).width + letterSpacing;
  }
  return cursorX;
}

function getAnchorFontSize(text) {
  const len = Array.from(text).length;
  if (len <= 12) return 38;
  if (len <= 20) return 32;
  if (len <= 30) return 26;
  return 22;
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
  const trialUrl = `https://jianbu.ceyunju.com/trial?ref=${referralCode}`;

  let logo = null;
  try {
    logo = await loadImage('/icons/icon-192.png');
  } catch {
    logo = null;
  }
  let qrCanvas = null;
  try {
    qrCanvas = await generateQrCanvas(trialUrl, QR_INNER);
  } catch {
    qrCanvas = null;
  }

  // ---- 第一遍：仅用于测量文字排版，不依赖canvas高度 ----
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');

  const anchorFontSize = getAnchorFontSize(skill.memory_anchor);
  const anchorLineHeight = Math.round(anchorFontSize * 1.35);
  mctx.font = `bold ${anchorFontSize}px "Noto Serif SC", serif`;
  const anchorLines = wrapParagraph(mctx, skill.memory_anchor, CONTENT_W);

  mctx.font = '13px "Noto Serif SC", serif';
  const skillNameLines = wrapParagraph(mctx, skill.skill_name, CONTENT_W);
  const skillNameLineHeight = 18;

  let quoteLines = [];
  const quoteLineHeight = Math.round(13 * 1.6);
  const quotePadding = 16;
  if (gainedText) {
    mctx.font = '13px "Noto Serif SC", serif';
    quoteLines = truncateLines(wrapParagraph(mctx, gainedText, CONTENT_W - quotePadding * 2 - 8), 3);
  }

  // ---- 计算各区块高度，得到总高度 ----
  let h = 0;
  // 品牌栏
  const brandRowH = 18;
  h += 16 + brandRowH + 16;

  // 主内容区
  h += 32;
  h += anchorLines.length * anchorLineHeight;
  h += 20; // 间距
  h += 3; // 红色短横线
  h += 16; // 间距
  h += skillNameLines.length * skillNameLineHeight;
  h += 28;

  // 策印内容区
  let quoteBoxH = 0;
  const quoteLabelH = 14;
  const quoteLabelGap = 8;
  if (gainedText) {
    quoteBoxH = quotePadding * 2 + quoteLabelH + quoteLabelGap + quoteLines.length * quoteLineHeight;
    h += quoteBoxH + 24;
  }

  // 分隔线
  h += 4 + 1 + 4;

  // 二维码区
  const qrTextBlockH = 18 + 6 + 16 + 10 + 18;
  const qrRowH = Math.max(QR_OUTER, qrTextBlockH);
  h += 20 + qrRowH + 20;

  // 底部栏
  const bottomBarContentH = 16;
  const bottomBarH = 12 + bottomBarContentH + 12;
  h += bottomBarH;

  const totalHeight = Math.ceil(h);

  // ---- 第二遍：用计算好的总高度创建真正的canvas并绘制 ----
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CANVAS_W, totalHeight);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  let y = 0;

  // 品牌栏
  y += 16;
  const brandCenterY = y + brandRowH / 2;
  ctx.textBaseline = 'middle';
  if (logo) ctx.drawImage(logo, MARGIN_X, brandCenterY - 9, 18, 18);
  ctx.fillStyle = GRAY_999;
  ctx.font = '12px "Noto Serif SC", serif';
  ctx.fillText('渐步进化共同体', MARGIN_X + 18 + 8, brandCenterY);
  ctx.textBaseline = 'top';
  y += brandRowH + 16;

  // 主内容区
  y += 32;
  ctx.fillStyle = BLACK;
  ctx.font = `bold ${anchorFontSize}px "Noto Serif SC", serif`;
  anchorLines.forEach((line, i) => {
    ctx.fillText(line, MARGIN_X, y + i * anchorLineHeight);
  });
  y += anchorLines.length * anchorLineHeight;
  y += 20;

  ctx.fillStyle = VERMILION;
  ctx.fillRect(MARGIN_X, y, 32, 3);
  y += 3 + 16;

  ctx.fillStyle = GRAY_888;
  ctx.font = '13px "Noto Serif SC", serif';
  skillNameLines.forEach((line, i) => {
    ctx.fillText(line, MARGIN_X, y + i * skillNameLineHeight);
  });
  y += skillNameLines.length * skillNameLineHeight;
  y += 28;

  // 策印内容区
  if (gainedText) {
    const boxY = y;
    ctx.fillStyle = QUOTE_BG;
    roundRect(ctx, MARGIN_X, boxY, CONTENT_W, quoteBoxH, 8);
    ctx.fill();
    ctx.fillStyle = VERMILION;
    ctx.fillRect(MARGIN_X, boxY, 4, quoteBoxH);

    ctx.fillStyle = VERMILION;
    ctx.font = '10px "Noto Serif SC", serif';
    fillTextSpaced(ctx, '学员真实反馈', MARGIN_X + quotePadding, boxY + quotePadding, 0.08 * 10);

    ctx.fillStyle = GRAY_444;
    ctx.font = '13px "Noto Serif SC", serif';
    const quoteTextTop = boxY + quotePadding + quoteLabelH + quoteLabelGap;
    quoteLines.forEach((line, i) => {
      ctx.fillText(line, MARGIN_X + quotePadding, quoteTextTop + i * quoteLineHeight);
    });

    y = boxY + quoteBoxH + 24;
  }

  // 分隔线
  y += 4;
  ctx.strokeStyle = DIVIDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y);
  ctx.lineTo(CANVAS_W - MARGIN_X, y);
  ctx.stroke();
  y += 4;

  // 二维码区
  y += 20;
  const qrRowTop = y;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, MARGIN_X, qrRowTop, QR_OUTER, QR_OUTER, 4);
  ctx.fill();
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, MARGIN_X + QR_MARGIN, qrRowTop + QR_MARGIN, QR_INNER, QR_INNER);
  }

  const textBlockX = MARGIN_X + QR_OUTER + 14;
  const textBlockTop = qrRowTop + (qrRowH - qrTextBlockH) / 2;
  ctx.fillStyle = BLACK;
  ctx.font = 'bold 14px "Noto Serif SC", serif';
  ctx.fillText('扫码免费体验渐步', textBlockX, textBlockTop);

  ctx.fillStyle = GRAY_888;
  ctx.font = '12px "Noto Serif SC", serif';
  ctx.fillText('找到你早就会的那个方法', textBlockX, textBlockTop + 18 + 6);

  const badgeText = '免费 · 无需激活码';
  ctx.font = '10px "Noto Serif SC", serif';
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgePadX = 8;
  const badgeH = 18;
  const badgeY = textBlockTop + 18 + 6 + 16 + 10;
  ctx.fillStyle = 'rgba(196,30,30,0.08)';
  roundRect(ctx, textBlockX, badgeY, badgeTextW + badgePadX * 2, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = VERMILION;
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, textBlockX + badgePadX, badgeY + badgeH / 2 + 1);
  ctx.textBaseline = 'top';

  y = qrRowTop + qrRowH + 20;

  // 底部栏
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, y, CANVAS_W, bottomBarH);
  const barContentCenterY = y + bottomBarH / 2;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F2EDE4';
  ctx.font = '12px "Noto Serif SC", serif';
  fillTextSpaced(ctx, '渐小而坚，步步在前', MARGIN_X, barContentCenterY, 0.1 * 12);

  const dotSize = 4;
  const dotGap = 4;
  const dotsTotalW = dotSize * 3 + dotGap * 2;
  let dotX = CANVAS_W - MARGIN_X - dotsTotalW + dotSize / 2;
  ctx.fillStyle = VERMILION;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(dotX, barContentCenterY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();
    dotX += dotSize + dotGap;
  }
  ctx.textBaseline = 'top';

  return canvas.toDataURL('image/png');
}

function getConcernFontSize(text) {
  const len = Array.from(text).length;
  if (len <= 16) return 26;
  if (len <= 24) return 22;
  return 19;
}

export async function generateTrialShareImage({ concern, skillName, gainedText, refCode }) {
  const trialUrl = refCode
    ? `https://jianbu.ceyunju.com/trial?ref=${refCode}`
    : 'https://jianbu.ceyunju.com/trial';

  const concernText =
    Array.from(concern || '').length > 30 ? Array.from(concern).slice(0, 30).join('') + '……' : concern || '';

  let logo = null;
  try {
    logo = await loadImage('/icons/icon-192.png');
  } catch {
    logo = null;
  }
  let qrCanvas = null;
  try {
    qrCanvas = await generateQrCanvas(trialUrl, QR_INNER);
  } catch {
    qrCanvas = null;
  }

  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');

  const concernFontSize = getConcernFontSize(concernText);
  const concernLineHeight = Math.round(concernFontSize * 1.45);
  mctx.font = `bold ${concernFontSize}px "Noto Serif SC", serif`;
  const concernLines = truncateLines(wrapParagraph(mctx, `「${concernText}」`, CONTENT_W), 3);

  mctx.font = '13px "Noto Serif SC", serif';
  const skillNameLines = wrapParagraph(mctx, `渐步为你找到的Skill：${skillName}`, CONTENT_W);
  const skillNameLineHeight = 18;

  let quoteLines = [];
  const quoteLineHeight = Math.round(13 * 1.6);
  const quotePadding = 16;
  if (gainedText) {
    mctx.font = '13px "Noto Serif SC", serif';
    quoteLines = truncateLines(wrapParagraph(mctx, gainedText, CONTENT_W - quotePadding * 2 - 8), 3);
  }

  let h = 0;
  const brandRowH = 18;
  h += 16 + brandRowH + 16;

  h += 28;
  h += 12; // "你描述的处境" 标签
  h += concernLines.length * concernLineHeight;
  h += 20;
  h += 3;
  h += 16;
  h += skillNameLines.length * skillNameLineHeight;
  h += 28;

  let quoteBoxH = 0;
  const quoteLabelH = 14;
  const quoteLabelGap = 8;
  if (gainedText) {
    quoteBoxH = quotePadding * 2 + quoteLabelH + quoteLabelGap + quoteLines.length * quoteLineHeight;
    h += quoteBoxH + 24;
  }

  h += 4 + 1 + 4;

  const qrTextBlockH = 18 + 6 + 16 + 10 + 18;
  const qrRowH = Math.max(QR_OUTER, qrTextBlockH);
  h += 20 + qrRowH + 20;

  const bottomBarContentH = 16;
  const bottomBarH = 12 + bottomBarContentH + 12;
  h += bottomBarH;

  const totalHeight = Math.ceil(h);

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CANVAS_W, totalHeight);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  let y = 0;

  y += 16;
  const brandCenterY = y + brandRowH / 2;
  ctx.textBaseline = 'middle';
  if (logo) ctx.drawImage(logo, MARGIN_X, brandCenterY - 9, 18, 18);
  ctx.fillStyle = GRAY_999;
  ctx.font = '12px "Noto Serif SC", serif';
  ctx.fillText('渐步进化共同体', MARGIN_X + 18 + 8, brandCenterY);
  ctx.textBaseline = 'top';
  y += brandRowH + 16;

  y += 28;
  ctx.fillStyle = VERMILION;
  ctx.font = '10px "Noto Serif SC", serif';
  fillTextSpaced(ctx, '我遇到的处境', MARGIN_X, y, 0.08 * 10);
  y += 12;

  ctx.fillStyle = BLACK;
  ctx.font = `bold ${concernFontSize}px "Noto Serif SC", serif`;
  concernLines.forEach((line, i) => {
    ctx.fillText(line, MARGIN_X, y + i * concernLineHeight);
  });
  y += concernLines.length * concernLineHeight;
  y += 20;

  ctx.fillStyle = VERMILION;
  ctx.fillRect(MARGIN_X, y, 32, 3);
  y += 3 + 16;

  ctx.fillStyle = GRAY_888;
  ctx.font = '13px "Noto Serif SC", serif';
  skillNameLines.forEach((line, i) => {
    ctx.fillText(line, MARGIN_X, y + i * skillNameLineHeight);
  });
  y += skillNameLines.length * skillNameLineHeight;
  y += 28;

  if (gainedText) {
    const boxY = y;
    ctx.fillStyle = QUOTE_BG;
    roundRect(ctx, MARGIN_X, boxY, CONTENT_W, quoteBoxH, 8);
    ctx.fill();
    ctx.fillStyle = VERMILION;
    ctx.fillRect(MARGIN_X, boxY, 4, quoteBoxH);

    ctx.fillStyle = VERMILION;
    ctx.font = '10px "Noto Serif SC", serif';
    fillTextSpaced(ctx, '我得到了', MARGIN_X + quotePadding, boxY + quotePadding, 0.08 * 10);

    ctx.fillStyle = GRAY_444;
    ctx.font = '13px "Noto Serif SC", serif';
    const quoteTextTop = boxY + quotePadding + quoteLabelH + quoteLabelGap;
    quoteLines.forEach((line, i) => {
      ctx.fillText(line, MARGIN_X + quotePadding, quoteTextTop + i * quoteLineHeight);
    });

    y = boxY + quoteBoxH + 24;
  }

  y += 4;
  ctx.strokeStyle = DIVIDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y);
  ctx.lineTo(CANVAS_W - MARGIN_X, y);
  ctx.stroke();
  y += 4;

  y += 20;
  const qrRowTop = y;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, MARGIN_X, qrRowTop, QR_OUTER, QR_OUTER, 4);
  ctx.fill();
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, MARGIN_X + QR_MARGIN, qrRowTop + QR_MARGIN, QR_INNER, QR_INNER);
  }

  const textBlockX = MARGIN_X + QR_OUTER + 14;
  const textBlockTop = qrRowTop + (qrRowH - qrTextBlockH) / 2;
  ctx.fillStyle = BLACK;
  ctx.font = 'bold 14px "Noto Serif SC", serif';
  ctx.fillText('扫码免费体验渐步', textBlockX, textBlockTop);

  ctx.fillStyle = GRAY_888;
  ctx.font = '12px "Noto Serif SC", serif';
  ctx.fillText('找到你早就会的那个方法', textBlockX, textBlockTop + 18 + 6);

  const badgeText = '免费 · 无需激活码';
  ctx.font = '10px "Noto Serif SC", serif';
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgePadX = 8;
  const badgeH = 18;
  const badgeY = textBlockTop + 18 + 6 + 16 + 10;
  ctx.fillStyle = 'rgba(196,30,30,0.08)';
  roundRect(ctx, textBlockX, badgeY, badgeTextW + badgePadX * 2, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = VERMILION;
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, textBlockX + badgePadX, badgeY + badgeH / 2 + 1);
  ctx.textBaseline = 'top';

  y = qrRowTop + qrRowH + 20;

  ctx.fillStyle = BLACK;
  ctx.fillRect(0, y, CANVAS_W, bottomBarH);
  const barContentCenterY = y + bottomBarH / 2;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F2EDE4';
  ctx.font = '12px "Noto Serif SC", serif';
  fillTextSpaced(ctx, '渐小而坚，步步在前', MARGIN_X, barContentCenterY, 0.1 * 12);

  const dotSize = 4;
  const dotGap = 4;
  const dotsTotalW = dotSize * 3 + dotGap * 2;
  let dotX = CANVAS_W - MARGIN_X - dotsTotalW + dotSize / 2;
  ctx.fillStyle = VERMILION;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(dotX, barContentCenterY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();
    dotX += dotSize + dotGap;
  }
  ctx.textBaseline = 'top';

  return canvas.toDataURL('image/png');
}
