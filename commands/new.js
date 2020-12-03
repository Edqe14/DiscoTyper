const Game = require('../class/game.js');
const chalk = require('chalk');
const Stats = require('../models/statsCollection.js');

module.exports = exports = {
  name: 'newgame',
  description: 'Create a new game',
  cooldown: 15,
  permissions: null,
  aliases: ['new', 'create'],
  args: false,
  usage: '',
  category: 'game',
  async run (bot, message, args, config, { statsCollection }) {
    if (bot.games.filter(g => g.guild === message.guild.id).length >= config.game.maxGame) return message.reply(`There is already ${config.game.maxGame} games running in this server. Please try again later`);
    const own = bot.games.find(g => g.owner === message.author.id && !g.isFinished);
    if (own) return message.reply(`There is already a game (**${own.code}**) running with your user ID!`);
    let game = new Game(null, message.author.id, message.channel, [{ id: message.author.id, timestamp: Date.now(), user: message.author }], {
      prefix: config.prefix
    });
    bot.games.set(game.code, game);
    console.log(`(${chalk.bold.dim.white(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', timeZoneName: 'short' }))}) ${chalk.dim.gray('CREATED GAME')} [${chalk.dim.yellow(game.code)}]`);

    game.on('game:start', (code) => {
      console.log(`(${chalk.bold.dim.white(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', timeZoneName: 'short' }))}) ${chalk.dim.gray('GAME STARTED')} [${chalk.dim.cyan(code)}]`);
    });
    game.on('game:end', async (code) => {
      bot.games.delete(code);
      game.removeAllListeners();
      game = null;
      console.log(`(${chalk.bold.dim.white(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', timeZoneName: 'short' }))}) ${chalk.dim.gray('GAME FINISHED')} [${chalk.dim.green(code)}]`);

      const s = await statsCollection.findOne({
        date: new Date().toISOString().split('T')[0]
      });
      if (!s) {
        await statsCollection.insert(new Stats(1, [code]));
      } else {
        await statsCollection.update({
          date: new Date().toISOString().split('T')[0]
        }, {
          $inc: {
            gameRuns: 1
          },
          $set: {
            gameCodes: [...s.gameCodes, code]
          }
        });
      }
    });
    game.on('game:timeout', (code) => {
      bot.games.delete(code);
      game.removeAllListeners();
      game = null;
      message.author.send('❌ Game timed out. Please create a new room!');
      console.log(`(${chalk.bold.dim.white(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', timeZoneName: 'short' }))}) ${chalk.dim.gray('GAME TIMEOUT')} [${chalk.dim.red(code)}]`);
    });
    game.on('game:deleted', (code) => {
      game = null;
      console.log(`(${chalk.bold.dim.white(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', timeZoneName: 'short' }))}) ${chalk.dim.gray('GAME DELETED')} [${chalk.dim.white(code)}]`);
    });
  }
};
