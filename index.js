require('dotenv').config();

const { Client } = require('discord.js');
const { readdir } = require('fs');
const { join } = require('path');
const Collection = require('@discordjs/collection');
const mongoose = require('mongoose');

const bot = new Client({
  disableEveryone: true
});
const config = bot.config = require('./config.json');
const logger = bot.logger = require('pino')();
mongoose.connect(process.env.MONGODB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(e => logger.fatal('Failed to connect to database', e))
  .then(() => logger.info('Database connected'));
bot.setMaxListeners(10000);
// bot.games = new Collection();
bot.config = config;

const commands = bot.commands = new Collection();
const cooldowns = bot.cooldowns = new Collection();
readdir(join(__dirname, 'commands'), (e, f) => {
  if (e) throw e;
  const js = f.filter((f) => f.split('.').pop() === 'js');

  if (js.length <= 0) return logger.info('No commands is available to load...');
  logger.info(`Loading ${js.length} commands...`);
  js.forEach((fi, i) => {
    try {
      const c = require(join(__dirname, 'commands', fi));

      commands.set(c.name, c);
      logger.info(`${i + 1}: ${fi} loaded!`);
    } catch (e) {
      if (e) {
        console.log(e)
        logger.error(`Error on loading ${fi} command`, e, e.stack);
      }
    }
  });
});

readdir(join(__dirname, 'handlers'), (e, files) => {
  if (e) throw e;

  const handlers = files.filter(f => f.split('.').pop() === 'js');
  if (handlers.length <= 0) return logger.info('There are no handlers to load...');

  logger.info(`Loading ${handlers.length} handlers...`);
  handlers.forEach((f, i) => {
    try {
      require(join(__dirname, 'handlers', f))(bot, config, cooldowns);
      logger.info(`${i + 1}: ${f} loaded!`);
    } catch (e) {
      if (e) {
        logger.error(`Error on loading ${f} handler`, e, e.stack);
      }
    }
  });
});

bot.login(process.env.TOKEN)
  .catch((e) => logger.error('Bot failed to login', e))
  .then(() => logger.info(`Logged in as ${bot.user.username}#${bot.user.discriminator}`));
