const Canvas = require('canvas');
const webp = require('webp-converter');
const { join } = require('path');

webp.grant_permission();

const wrapText = require('./wrapText.js');

module.exports = exports.default = async (text) => {
  const fontSize = 20;
  const lineHeight = fontSize * 1.18;

  const canvas = Canvas.createCanvas(640, 500);
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px "noto sans"`;

  const lines = wrapText(ctx, text, 560);

  canvas.height = Math.round((52 * 2) + (lines.length * lineHeight));

  const bg = await Canvas.loadImage(join(__dirname, 'assets', 'bg.jpg'));
  ctx.drawImage(bg, 0, 0, canvas.width + 240, canvas.height);

  ctx.fillStyle = '#20202025';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.shadowColor = '#111111';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  let h = 55;
  ctx.font = `bold ${fontSize}px "noto sans"`;
  ctx.fillStyle = '#fff';
  lines.forEach(l => {
    ctx.fillText(l, 40, h);
    h += lineHeight;
  });

  return (await webp.buffer2webpbuffer(canvas.toBuffer('image/png'), 'png', '-q 80 -quiet'));
  // return canvas.toBuffer('image/jpeg');
};
