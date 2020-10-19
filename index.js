(async () => {
  require('dotenv').config();

  const { Client } = require('discord.js');
  const { readdir, existsSync, writeFileSync } = require('fs');
  const { join } = require('path');
  const Collection = require('@discordjs/collection');

  const bot = new Client({
    disableEveryone: true
  });
  const config = bot.config = require('./config.json');

  console.log('Connecting to database...');
  bot.db = require('monk')(process.env.MONGODB);
  bot.db.then(() => console.log('Database connected')).catch((e) => {
    console.error('Failed to connect to DB', e);
    process.exit(1);
  });

  bot.setMaxListeners(10000);
  bot.config = config;
  bot.games = new Collection();

  module.exports = bot;

  const typerace = require('./utils/typerace.js');
  console.log('Loading text...');
  if (existsSync(`${__dirname.replace(/\\/gi, '/')}/${config.paths.text}`)) {
    const texts = require(`${__dirname.replace(/\\/gi, '/')}/${config.paths.text}`);
    if (texts.last + 2592000000 > Date.now()) {
      bot.texts = texts;
    } else {
      const { length: lenB } = require(`${__dirname.replace(/\\/gi, '/')}/${config.paths.text}`);
      const { length, texts } = await typerace.extractText(config.uris.text);
      if (length < lenB) return;
      const prep = {
        length,
        last: Date.now(),
        texts
      };

      console.log('Text loaded');
      writeFileSync(`${__dirname.replace(/\\/gi, '/')}/${config.paths.text}`, JSON.stringify(prep));
      bot.texts = texts;
    }
  } else {
    const { length, texts } = await typerace.extractText(config.uris.text).catch(console.error);
    const prep = {
      length,
      last: Date.now(),
      texts
    };

    console.log('Text loaded');
    writeFileSync(`${__dirname.replace(/\\/gi, '/')}/${config.paths.text}`, JSON.stringify(prep));
    bot.texts = texts;
  }

  readdir(join(__dirname, 'handlers'), (e, files) => {
    if (e) throw e;

    const handlers = files.filter(f => f.split('.').pop() === 'js');
    if (handlers.length <= 0) return console.log('There are no handlers to load...');

    console.log(`Loading ${handlers.length} handlers...`);
    handlers.forEach((f, i) => {
      require(join(__dirname, 'handlers', f))(bot, config, cooldowns);
      console.log(`${i + 1}: ${f} loaded!`);
    });
  });

  const commands = bot.commands = new Collection();
  const cooldowns = bot.cooldowns = new Collection();
  readdir(join(__dirname, 'commands'), (e, f) => {
    if (e) throw e;
    const js = f.filter((f) => f.split('.').pop() === 'js');

    if (js.length <= 0) return console.log('No commands is available to load...');
    console.log(`Loading ${js.length} commands...`);
    js.forEach((fi, i) => {
      const c = require(join(__dirname, 'commands', fi));

      console.log(`${i + 1}: ${fi} loaded!`);
      commands.set(c.name, c);
    });
  });

  bot.login(process.env.NODE_ENV === 'development' ? process.env.DEV_TOKEN : process.env.TOKEN)
    .catch(console.error)
    .then(() => console.log(`Logged in as ${bot.user.username}#${bot.user.discriminator}`));
})().catch(console.error);
