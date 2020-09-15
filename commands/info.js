const pad = require('../utils/pad.js');
const Game = require('../class/game.js');

module.exports = exports = {
  name: 'info',
  description: 'Show info about a game',
  cooldown: 10,
  permissions: null,
  aliases: ['i'],
  args: false,
  usage: '[code]',
  category: 'game',
  async run (bot, message, args, config) {
    const code = (args[0] || '').toUpperCase() || (bot.games.find(g => g.players.some(u => u.id === message.author.id && !g.isFinished)) || {}).code;
    if (!code) return message.reply('Please provide a valid game code!');
    if (!bot.games.has(code)) return message.reply(`Invalid game with code: **${code}**!`);

    const game = bot.games.get(code);
    if (!game) return message.reply('Invalid game');
    const prep = `Code: **${game.code}**
                  Author: **${bot.users.resolve(game.owner).toString()}**
                  Created at: **${game.createdDate.toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })}**\n
                  **Players** (${game.players.length} / ${game.limit}):
                  ${game.players.map((u, i) => `${pad(i + 1)}. ${bot.users.resolve(u.id).toString()}`).join('\n')}`;
    Game.log(game.code, message.channel, prep, true);
  }
};
