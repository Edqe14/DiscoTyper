const Canvas = require('canvas');
const fs = require('fs');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminJpegtran = require('imagemin-jpegtran');
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

  const bg = await Canvas.loadImage('./bg.jpg');
  ctx.drawImage(bg, 0, 0, canvas.width + 240, canvas.height);

  ctx.font = `bold ${fontSize}px "noto sans"`;
  ctx.fillStyle = '#fff';

  ctx.shadowColor = '#1e1e1e';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  let h = 55;

  const lines = wrapText(ctx, text, 560);
  lines.forEach(l => {
    ctx.fillText(l, 40, h);
    h += lineHeight;
  });

  console.log(lines.join(' ') === text);

  const PNGBuffer = canvas.toBuffer('image/png');
  fs.writeFileSync('./image.png', PNGBuffer);

  const WEBPBuffer = await webp.buffer2webpbuffer(PNGBuffer, 'png', '-q 80');
  fs.writeFileSync('./image.webp', WEBPBuffer);

  const JPGBuffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync('./image.jpg', JPGBuffer);

  const compressed = await imagemin(['./image.png', './image.jpg'], {
    plugins: [
      imageminJpegtran(),
      imageminPngquant({
        quality: [0.5, 0.6]
      })
    ]
  });
  compressed.forEach(c => {
    fs.writeFileSync(`./image-compressed.${c.sourcePath.split('.')[2]}`, c.data);
  });
})();
