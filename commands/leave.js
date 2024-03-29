const verify = require('../utils/verify.js');

module.exports = exports = {
  name: 'leave',
  description: 'Leave a game',
  cooldown: 10,
  permissions: null,
  aliases: ['close'],
  args: false,
  usage: '[code]',
  category: 'game',
  async run (bot, message, args, config) {
    const code = args[0];
    if (!code) {
      const filter = bot.games.filter(g => g.channel.id === message.channel.id && g.players.some(u => u.id === message.author.id)).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      if (filter.size <= 0) return message.reply('You\'re not in any game room');

      const game = filter.first();
      if (game.owner === message.author.id) {
        const msg = await message.reply(`Do you want to close game **${game.code}**?`);
        const confirm = await verify(message.author, msg);
        if (confirm) {
          await msg.reactions.removeAll();
          await msg.edit(`Successfully removed game **${game.code}**`);
          return bot.games.delete(game.code);
        }
        await msg.reactions.removeAll();
        return await msg.edit('Cancelled');
      }
      if (!game.players.some(u => u.id === message.author.id)) return message.reply('Something went wrong. Please try again.');
      return game.removePlayer(message.author);
    }

    let game = bot.games.get(code.toUpperCase());
    if (!game) return message.reply('Invalid game');
    if (!game.players.some(u => u.id === message.author.id)) return message.reply('You\'re not in this game');
    if (game.owner === message.author.id) {
      const msg = await message.reply(`Do you want to close game **${game.code}**?`);
      const confirm = await verify(message.author, msg);
      if (confirm) {
        await msg.reactions.removeAll();
        await msg.edit(`Successfully removed game **${game.code}**`);
        game.emit('game:deleted', game.code);
        game.removeAllListeners();
        game = null;
        return bot.games.delete(game.code);
      }
      await msg.reactions.removeAll();
      return await msg.edit('Cancelled');
    }
    game.removePlayer(message.author);
  }
};
