const Game = require('../class/game.js');
const Games = require('../models/games.js');

module.exports = exports = {
  name: 'newgame',
  description: 'Create a new game',
  cooldown: 15,
  permissions: null,
  aliases: ['new'],
  usage: '',
  category: 'game',
  async run (bot, message, args, config) {
    const own = await Games.findOne({ 'game.owner': message.author.id, 'game.isFinished': false });
    if (own) return message.reply(`There is already a game (**${own.code}**) running with your user ID!`);
    const game = new Game(null, message.author.id, message.channel, [{ id: message.author.id, user: message.author, timestamp: Date.now() }]);
    new Games({
      code: game.code,
      game
    }).save().catch((e) => {
      if (e) {
        console.log(e);
        game.log(game.channel, 'Something went wrong', true, 0);
      }
    }).then(() => game.announceCreated());
    game.on('end', () => {
      game.removeAllListeners();
      Games.deleteOne({ code: game.code, 'game.owner': message.author.id });
    });
  }
};
