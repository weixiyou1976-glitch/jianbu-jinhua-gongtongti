const CANVAS_W = 750;
const CANVAS_H = 1000;
const PAPER = '#F2EDE4';
const VERMILION = '#C0392B';
const INK = '#2B2B2B';
const INK_MUTED = '#8A8478';
const QUOTE_BG = '#E8E2D6';
const MARGIN_X = 70;
const CONTENT_W = CANVAS_W - MARGIN_X * 2;

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

  let y = 64;
  const logoSize = 48;
  if (logo) ctx.drawImage(logo, MARGIN_X, y, logoSize, logoSize);
  ctx.fillStyle = INK;
  ctx.font = '600 26px "Noto Serif SC", serif';
  ctx.textAlign = 'left';
  ctx.fillText('渐步进化共同体', MARGIN_X + logoSize + 16, y + 11);
  y += logoSize + 36;

  ctx.strokeStyle = 'rgba(192,57,43,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y);
  ctx.lineTo(CANVAS_W - MARGIN_X, y);
  ctx.stroke();
  y += 46;

  ctx.textAlign = 'center';
  ctx.fillStyle = INK_MUTED;
  ctx.font = '18px "Noto Serif SC", serif';
  ctx.fillText(`第${skill.week_number}周 · ${skill.category}`, CANVAS_W / 2, y);
  y += 46;

  ctx.fillStyle = VERMILION;
  ctx.font = 'bold 48px "Noto Serif SC", serif';
  const anchorLines = wrapParagraph(ctx, skill.memory_anchor, CONTENT_W);
  y = drawCenteredLines(ctx, anchorLines, CANVAS_W / 2, y, 60) + 30;

  ctx.fillStyle = INK;
  ctx.font = '600 28px "Noto Serif SC", serif';
  const nameLines = wrapParagraph(ctx, skill.skill_name, CONTENT_W);
  y = drawCenteredLines(ctx, nameLines, CANVAS_W / 2, y, 38) + 40;

  if (gainedText) {
    ctx.font = '17px "Noto Serif SC", serif';
    let quoteLines = wrapParagraph(ctx, gainedText, CONTENT_W - 80);
    const maxLines = 5;
    if (quoteLines.length > maxLines) {
      quoteLines = quoteLines.slice(0, maxLines);
      quoteLines[maxLines - 1] = quoteLines[maxLines - 1].slice(0, -1) + '…';
    }
    const labelH = 30;
    const lineH = 28;
    const boxPadding = 28;
    const boxH = labelH + quoteLines.length * lineH + boxPadding * 2;
    const boxY = y;
    ctx.fillStyle = QUOTE_BG;
    roundRect(ctx, MARGIN_X, boxY, CONTENT_W, boxH, 16);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = VERMILION;
    ctx.font = '600 16px "Noto Serif SC", serif';
    ctx.fillText('我得到了', MARGIN_X + 40, boxY + boxPadding);

    ctx.fillStyle = '#5A5548';
    ctx.font = '17px "Noto Serif SC", serif';
    quoteLines.forEach((line, i) => {
      ctx.fillText(line, MARGIN_X + 40, boxY + boxPadding + labelH + i * lineH);
    });
    y = boxY + boxH;
  }

  const footerDividerY = 850;
  ctx.strokeStyle = 'rgba(43,43,43,0.12)';
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, footerDividerY);
  ctx.lineTo(CANVAS_W - MARGIN_X, footerDividerY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = VERMILION;
  ctx.font = '600 24px "Noto Serif SC", serif';
  ctx.fillText('免费体验一次渐步', CANVAS_W / 2, footerDividerY + 34);

  ctx.fillStyle = INK;
  ctx.font = '18px monospace';
  ctx.fillText(`jianbu.ceyunju.com/trial?ref=${referralCode}`, CANVAS_W / 2, footerDividerY + 74);

  ctx.fillStyle = INK_MUTED;
  ctx.font = '16px "Noto Serif SC", serif';
  ctx.fillText('渐小而坚，步步在前', CANVAS_W / 2, footerDividerY + 112);

  return canvas.toDataURL('image/png');
}
