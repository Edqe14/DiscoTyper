module.exports = exports = {
  name: 'forcestart',
  description: 'Force start a game',
  cooldown: 10,
  permissions: null,
  aliases: ['fs'],
  args: false,
  usage: '[code]',
  category: 'game',
  async run (bot, message, args, config) {
    const code = (args[0] || '').toUpperCase() || (bot.games.find(g => g.players.some(u => u.id === message.author.id && !g.isFinished)) || {}).code;
    if (!code) return message.reply('Please provide a valid game code!');
    if (!bot.games.has(code)) return message.reply(`Invalid game with code: ${code}!`);

    const game = bot.games.get(code);
    if (!game) return message.reply('Invalid game');
    if (game.owner !== message.author.id && !message.member.hasPermission(['MANAGE_GUILD', 'MANAGE_CHANNELS'])) return message.reply('This command only for the game author and server administrator!');
    game.start(true);
  }
};
