const fs = require('fs');
const typerace = require('../utils/typerace.js');

module.exports = async (bot, { uris: { text }, paths: { text: path } }) => {
  if (fs.existsSync(`${__dirname.replace(/\\/gi, '/')}/../${path}`)) {
    const texts = require(`${__dirname.replace(/\\/gi, '/')}/../${path}`);
    if (texts.last + 2592000000 > Date.now()) {
      bot.texts = texts;
      return;
    }
  }

  const { length: lenB } = require(`${__dirname.replace(/\\/gi, '/')}/../${path}`);
  const { length, texts } = await typerace.extractText(text);
  const prep = {
    length,
    last: Date.now(),
    texts
  };

  if (length < lenB) return;
  fs.writeFileSync(`${__dirname.replace(/\\/gi, '/')}/../${path}`, JSON.stringify(prep));
  bot.texts = texts;
};
