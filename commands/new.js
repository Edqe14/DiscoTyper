const Game = require('../class/game.js');

module.exports = exports = {
  name: 'newgame',
  description: 'Create a new game',
  cooldown: 15,
  permissions: null,
  aliases: ['new'],
  usage: '',
  category: 'game',
  async run (bot, message, args, config) {
    const own = bot.games.find(g => g.owner === message.author.id && !g.isFinished);
    if (own) return message.reply(`There is already a game (**${own.code}**) running with your user ID!`);
    const game = new Game(null, message.author.id, message.channel, [{ id: message.author.id, timestamp: Date.now(), user: message.author }]);
    bot.games.set(game.code, game);
    game.on('game:end', (code) => {
      bot.games.delete(code);
    });
  }
};
