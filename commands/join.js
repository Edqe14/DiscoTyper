module.exports = exports = {
  name: 'join',
  description: 'Join a game',
  cooldown: 5,
  permissions: null,
  aliases: [],
  args: true,
  usage: '<code>',
  category: 'game',
  async run (bot, message, args, config) {
    const code = args[0];
    if (!code) return message.reply('Please provide a valid game code!');
    if (!bot.games.has(code.toUpperCase())) return message.reply(`Invalid game with code: ${code}!`);

    const find = bot.games.find(g => g.players.some(p => p.id === message.author.id) && !g.isFinished && g.code !== code.toUpperCase());
    if (find) return message.reply(`You already joined another game! Please leave the game at ${find.channel.toString()} (**${find.code}**) to proceed.`);

    const game = bot.games.get(code.toUpperCase());
    if (!game) return message.reply('Invalid game');
    if (game.players.some(p => p.id === message.author.id)) return message.reply('You already joined this game!');
    game.addPlayer(message.author);
  }
};
