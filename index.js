const Canvas = require('canvas');
const fs = require('fs');
const webp = require('webp-converter');

(async () => {
  const texts = require('./texts.json');
  const textLongest = texts.texts.sort((a, b) => b.length - a.length)[0];
  const text = texts.texts[Math.floor(Math.random() * texts.texts.length)];

  const { wrapText } = require('./util.js');

  const fontSize = 20;
  const lineHeight = fontSize * 1.18;

  const canvas = Canvas.createCanvas(640, 500);
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px "noto sans"`;

  const lines = wrapText(ctx, textLongest, 560);

  canvas.height = Math.round((52 * 2) + (lines.length * lineHeight));

  const bg = await Canvas.loadImage('./bg.jpg');
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

  console.log(lines.join(' ') === textLongest);

  const PNGBuffer = canvas.toBuffer('image/png');
  fs.writeFileSync('./image.png', PNGBuffer);

  const WEBPBuffer = await webp.buffer2webpbuffer(PNGBuffer, 'png', '-q 80');
  fs.writeFileSync('./image.webp', WEBPBuffer);

  const JPGBuffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync('./image.jpg', JPGBuffer);
})();
